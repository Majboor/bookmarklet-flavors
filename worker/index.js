/**
 * Flavors generator API (Cloudflare Worker)
 *
 * Holds the OpenRouter key server-side. flavors.js is world-readable at a public
 * URL, so the key can never live in the client - a leaked key there is a
 * stranger's bill.
 *
 * Routes:
 *   POST /api/generate  {domain, prompt, elements[], recording, page, currentCode, history[]}
 *   POST /api/request   {domain, page}
 *
 * Secret: OPENROUTER_API_KEY   (npx wrangler secret put OPENROUTER_API_KEY)
 */

const MODEL = 'z-ai/glm-5.3';
const MEMORY_BASE =
  'https://raw.githubusercontent.com/Majboor/bookmarklet-flavors/main/memory/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

const SYSTEM = `You write "flavors": self-contained JavaScript that restyles or re-shapes a website, injected into the live page by a bookmarklet.

## Output contract
Reply with ONE JSON object and nothing else. No prose, no markdown fence.
{"name":"<3-4 word flavor name>","code":"<javascript>","notes":"<one sentence on what you changed>"}

## The code you write MUST
1. BE SELF-TOGGLING. It runs on every toggle click. On first run it applies; on the
   next run it must fully remove itself and restore the page. Use a sentinel:
     var ID='__flavor_<slug>__';
     var prev=document.getElementById(ID);
     if(prev){ prev.remove(); /* undo any JS-side changes too */ return; }
     var st=document.createElement('style'); st.id=ID; st.textContent="..."; document.head.appendChild(st);
2. Use ONLY selectors listed as verified in the memory below. Never invent one.
   Never use anything in the DEAD list. If you cannot do it with verified selectors,
   say so in "notes" and return the smallest thing you CAN do.
3. NEVER use innerHTML, outerHTML, insertAdjacentHTML, document.write, eval, or set
   script.src to a string. Sites with Trusted Types throw on these. Build nodes with
   createElement/textContent/append, and clear with replaceChildren().
4. Never hide a container that also holds wanted content. Hide specific siblings.
5. Survive SPA navigation if the site is an SPA: re-apply on the site's navigation
   event, and clean the listener up on toggle-off.
6. Be defensive: every querySelector result may be null. Guard everything. Never throw.
7. No network requests. No cookies, storage, credentials, or data exfiltration.
   Visual and layout changes only.

## Style
Match the request's spirit. Prefer CSS custom properties where the memory lists them -
they survive the site's component churn far better than element selectors.`;

async function loadMemory(domain) {
  const safe = String(domain || '').replace(/[^a-z0-9.\-]/gi, '');
  if (!safe) return null;
  const r = await fetch(MEMORY_BASE + safe + '.md', {
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!r.ok) return null;
  return await r.text();
}

function buildUserMessage(body, memory) {
  const parts = [];
  parts.push('# Verified flavor memory for ' + body.domain + '\n\n' + memory);
  if (body.page) {
    parts.push(
      '# Current page\nURL: ' + body.page.url +
      '\nTitle: ' + body.page.title +
      '\nComponents present: ' + (body.page.components || []).join(', ')
    );
  }
  if (body.elements && body.elements.length) {
    parts.push(
      '# Elements the user pointed at (treat these as the target)\n' +
        body.elements
          .map((e) => `- \`${e.selector}\` (${e.matches} matches, <${e.tag}>) ${e.text ? '— "' + e.text + '"' : ''}`)
          .join('\n')
    );
  }
  if (body.recording && body.recording.steps && body.recording.steps.length) {
    parts.push(
      '# What the user did while recording (in order)\n' +
        body.recording.steps
          .slice(0, 40)
          .map((s, i) => `${i + 1}. clicked \`${s.selector}\`${s.text ? ' — "' + s.text + '"' : ''}`)
          .join('\n')
    );
  }
  if (body.currentCode) {
    parts.push(
      '# The flavor as it stands now - MODIFY this, do not start over\n```javascript\n' +
        body.currentCode +
        '\n```'
    );
  }
  parts.push('# What the user wants\n' + body.prompt);
  return parts.join('\n\n');
}

function extractJSON(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch (e) {}
  const start = t.indexOf('{');
  if (start === -1) return null;
  for (let end = t.length; end > start; end--) {
    if (t[end - 1] !== '}') continue;
    try { return JSON.parse(t.slice(start, end)); } catch (e) {}
  }
  return null;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);

    if (url.pathname === '/api/request' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      // Requests land in KV if bound, otherwise they're just logged.
      if (env.FLAVOR_REQUESTS) {
        await env.FLAVOR_REQUESTS.put(
          'req:' + Date.now() + ':' + (body.domain || 'unknown'),
          JSON.stringify({ ...body, at: new Date().toISOString() })
        );
      }
      console.log('flavor request', body.domain);
      return json({ ok: true });
    }

    if (url.pathname !== '/api/generate' || request.method !== 'POST') {
      return json({ error: 'Not found' }, 404);
    }
    if (!env.OPENROUTER_API_KEY) return json({ error: 'Server missing OPENROUTER_API_KEY' }, 500);

    const body = await request.json().catch(() => null);
    if (!body || !body.prompt || !body.domain) return json({ error: 'domain and prompt required' }, 400);

    // Gate on memory: without verified selectors the model is guessing, and a
    // guessed selector is the single biggest source of broken flavors.
    const memory = await loadMemory(body.domain);
    if (!memory) return json({ error: 'No flavor memory for ' + body.domain, needsRequest: true }, 404);

    const history = (body.history || []).slice(-8).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || '').slice(0, 2000),
    }));

    const or = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.OPENROUTER_API_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://flavors.waleeds.world',
        'X-OpenRouter-Title': 'Bookmarklet Flavors',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        // GLM 5.3 is a reasoning model: with a tight budget it spends the whole
        // allowance thinking and returns content:null. Cap the reasoning and leave
        // generous room for the actual code.
        reasoning: { effort: 'low' },
        max_tokens: 12000,
        messages: [
          { role: 'system', content: SYSTEM },
          ...history,
          { role: 'user', content: buildUserMessage(body, memory) },
        ],
      }),
    });

    if (!or.ok) {
      const t = await or.text();
      return json({ error: 'Model error ' + or.status + ': ' + t.slice(0, 300) }, 502);
    }

    const data = await or.json();
    const msg = data?.choices?.[0]?.message || {};
    const content = msg.content || '';
    if (!content) {
      const rt = data?.usage?.completion_tokens_details?.reasoning_tokens;
      return json({ error: 'Model returned no content' + (rt ? ' (spent ' + rt + ' tokens reasoning)' : '') }, 502);
    }
    const parsed = extractJSON(content);
    if (!parsed || !parsed.code) {
      return json({ error: 'Model did not return usable code', raw: content.slice(0, 500) }, 502);
    }

    // Defence in depth: the client runs this via new Function(), so refuse the
    // sinks the system prompt already forbids rather than trusting compliance.
    const banned = /\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\s*\()/;
    if (banned.test(parsed.code)) {
      return json({ error: 'Generated code used a forbidden HTML sink; try rephrasing.' }, 422);
    }

    return json({
      name: String(parsed.name || 'AI flavor').slice(0, 40),
      code: parsed.code,
      notes: String(parsed.notes || '').slice(0, 400),
      usage: data.usage || null,
    });
  },
};
