# Flavors API

Runs on the **T430 (192.168.18.201:9800)** as systemd `flavors-api`, exposed at
`flavors.waleeds.world/api/*` through the **RPI-Home** cloudflared tunnel using a
**path-based ingress rule** — so the API shares an origin with `flavors.js`.
That matters: same origin means no CORS complications and no extra CSP allowance
on top of the one the bookmarklet already relies on.

```
flavors.waleeds.world  path ^/api/.*  ->  http://192.168.18.201:9800   (T430, this service)
flavors.waleeds.world  (no path)      ->  http://192.168.18.200:8899   (T3500, static repo)
```

The rule for `^/api/.*` **must precede** the catch-all host rule, and the tunnel's
`http_status:404` rule must stay last. See [[cloudflare-tunnel-setup]].

## Endpoints

| route | what |
|---|---|
| `GET  /api/health` | `{ok, key, memory:[domains]}` |
| `POST /api/generate` | `{domain, prompt, elements[], recording, page, currentCode, history[]}` → `{name, code, notes}` via **GLM 5.3** |
| `POST /api/suggest` | `{url, title, regions[], headings[]}` → `{suggest, message, prompt, targets[]}` via **jev** |
| `POST /api/request` | logs a request for an unmapped domain |

## Why the key lives here

`flavors.js` is served publicly and is world-readable. An OpenRouter key in it is a
stranger's bill. It is set only in the unit file (`chmod 600`).

## Deploy

```bash
scp api/flavors_api.py root@t430-ssh.waleeds.world:/opt/flavors/flavors_api.py
scp memory/*.md        root@t430-ssh.waleeds.world:/opt/flavors/memory/
ssh root@t430-ssh.waleeds.world 'systemctl restart flavors-api'
curl https://flavors.waleeds.world/api/health
```

## Two bugs worth remembering

- **GLM 5.3 reasons by default.** At `max_tokens: 4000` it spends the entire budget
  reasoning and returns `content: null` — a paid call that returns nothing. We set
  `reasoning: {effort: 'low'}` (`enabled: false` is rejected with a 400) and
  `max_tokens: 12000`.
- **A `204` must not carry a body.** Returning `Content-Length: 2` with `{}` on the
  CORS preflight made Cloudflare answer **520**, which failed the preflight and
  surfaced in the page as a bare "Failed to fetch".
