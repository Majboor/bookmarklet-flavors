#!/usr/bin/env node
/**
 * Build the hybrid bookmarklet.
 *
 * The old loader only fetch()ed flavors.js, and fetch is governed by CSP
 * connect-src -- strict sites (github, twitter, banks) refuse it outright:
 *   "Refused to connect to ... because it does not appear in the connect-src
 *    directive of the Content Security Policy"
 * Switching to <script src> is no escape; that's script-src, equally locked.
 *
 * So: embed a full copy of flavorHub in the bookmarklet and CALL IT DIRECTLY on
 * failure. A javascript: URL runs in the page's own context, so the embedded
 * path makes no network request and creates no script node -- there is nothing
 * for CSP to refuse. The fetch is still tried first, so permissive sites keep
 * getting updates without a reinstall.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'flavors.js');
const HTML = path.join(__dirname, 'bookmarklet-flavors.html');
const REMOTE = 'https://flavors.waleeds.world/flavors.js';

const src = fs.readFileSync(SRC, 'utf8');
eval(src);
if (typeof flavorHub !== 'function') throw new Error('flavorHub did not evaluate to a function');

const embedded = flavorHub.toString();

const loader = `(function(){
var U='${REMOTE}';
function boot(code){
  try{
    var ts=code;
    if(window.trustedTypes&&trustedTypes.createPolicy){
      var p=trustedTypes.createPolicy('flavor_hub_'+Date.now(),{createScript:function(s){return s}});
      ts=p.createScript(code);
    }
    var s=document.createElement('script');s.textContent=ts;document.head.appendChild(s);
    if(window.flavorHub){window.flavorHub();return true}
  }catch(e){}
  return false;
}
function fallback(){
  try{ (${embedded})(); }
  catch(e){ alert('Flavors could not start: '+e.message); }
}
try{
  fetch(U+'?_='+Date.now()).then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.text();
  }).then(function(code){
    if(!boot(code))fallback();
  }).catch(function(){ fallback(); });
}catch(e){ fallback(); }
})();`;

const bookmarklet = 'javascript:' + loader;

fs.writeFileSync('/tmp/_bm.txt', bookmarklet);
console.log('bookmarklet bytes:', bookmarklet.length);

// splice into the install page
let html = fs.readFileSync(HTML, 'utf8');
const re = /var bookmarkletCode = "(?:[^"\\]|\\.)*";/;
if (!re.test(html)) throw new Error('bookmarkletCode assignment not found in install page');
html = html.replace(re, 'var bookmarkletCode = ' + JSON.stringify(bookmarklet) + ';');
fs.writeFileSync(HTML, html);
console.log('install page updated:', HTML);
