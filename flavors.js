function flavorHub(){
  if (window.__flavorHub__) {
    window.__flavorHub__.togglePanel();
    return;
  }

  var FONT_LINK_ID = '__flavor_font__';
  function ensureFont(){
    if (document.getElementById(FONT_LINK_ID)) return;
    var l = document.createElement('link');
    l.id = FONT_LINK_ID;
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Quicksand:wght@500;600;700&display=swap';
    document.head.appendChild(l);
  }

  var STORE_KEY = '__flavor_prefs_v1__';
  function loadPrefs(){ try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch(e){ return {}; } }
  function savePrefs(p){ try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch(e){} }
  var prefs = loadPrefs();

  /* =========================================================
     YouTube flavor — combines the purple/anime theme and the
     TikTok-style immersive scroll into ONE flavor for the site,
     each independently toggleable from the panel.
     Selectors verified against real youtube.com DOM (both the
     legacy ytd-* components and the newer yt-lockup-view-model
     component system YouTube has migrated much of its UI to).
     ========================================================= */
  var YouTubeFlavor = {
    id: 'fancy_yt',
    label: 'fancy_yt',
    match: function(){ return /(^|\.)youtube\.com$/.test(location.hostname); },

    themeId: '__yt_theme_style__',
    isThemeOn: function(){ return !!document.getElementById(this.themeId); },
    applyTheme: function(){
      if (this.isThemeOn()) return;
      ensureFont();
      var css =
        "html,ytd-app{--yt-spec-base-background:#1c1230!important;--yt-spec-raised-background:#2a1b45!important;--yt-spec-general-background-a:#1c1230!important;--yt-spec-general-background-b:#241638!important;--yt-spec-text-primary:#f5e9ff!important;--yt-spec-text-secondary:#caa6f5!important;--yt-spec-brand-background-solid:#7b2ff7!important;--yt-spec-call-to-action:#c86dfc!important;--yt-spec-icon-active-other:#e6b8ff!important;}" +
        "body,ytd-app,#page-manager{background:linear-gradient(160deg,#241638,#1c1230 60%) fixed!important;font-family:'Quicksand','Comic Sans MS',sans-serif!important;}" +
        "ytd-masthead,#masthead-container{background:linear-gradient(100deg,#3a1c66,#7b2ff7)!important;box-shadow:0 2px 18px rgba(123,47,247,.45)!important;}" +
        "#logo-icon,ytd-topbar-logo-renderer{filter:hue-rotate(200deg) saturate(1.6) drop-shadow(0 0 6px #d9a6ff)!important;}" +
        "ytd-searchbox,#search-form,#container.ytd-searchbox{border-radius:999px!important;border:2px solid #c86dfc!important;background:#2a1b45!important;}" +
        "a#video-title,#video-title,ytd-video-renderer #video-title,ytd-rich-grid-media #video-title," +
        "h3.ytLockupMetadataViewModelHeadingReset,.ytLockupMetadataViewModelTitle{font-family:'Baloo 2','Comic Sans MS',cursive!important;color:#f5e9ff!important;font-weight:700!important;}" +
        "ytd-thumbnail,yt-thumbnail-view-model{position:relative!important;border-radius:28px!important;overflow:hidden!important;border:3px solid #c86dfc!important;box-shadow:0 0 0 2px #1c1230,0 6px 20px rgba(123,47,247,.55)!important;transition:transform .18s ease!important;display:block!important;}" +
        "ytd-thumbnail::after,yt-thumbnail-view-model::after{content:'\\1F338';position:absolute!important;top:6px!important;left:6px!important;font-size:18px!important;z-index:5!important;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))!important;pointer-events:none!important;}" +
        "ytd-thumbnail:hover,yt-thumbnail-view-model:hover{transform:scale(1.035) rotate(-.4deg)!important;box-shadow:0 0 0 2px #1c1230,0 10px 28px rgba(200,109,252,.75)!important;}" +
        "yt-lockup-metadata-view-model a[href^='/@']{color:#e6b8ff!important;}" +
        "yt-chip-cloud-chip-renderer,tp-yt-paper-chip{background:#2a1b45!important;border:1px solid rgba(200,109,252,.35)!important;border-radius:999px!important;color:#f5e9ff!important;}" +
        "ytd-guide-renderer,tp-yt-app-drawer,#guide-content{background:#1c1230!important;}" +
        "ytd-guide-entry-renderer:hover,ytd-mini-guide-entry-renderer:hover{background:#2a1b45!important;border-radius:12px!important;}" +
        ".ytp-progress-bar,.ytp-play-progress{background:linear-gradient(90deg,#c86dfc,#ff8fe0)!important;}" +
        ".ytp-chrome-bottom{background:linear-gradient(0deg,rgba(28,18,48,.85),transparent)!important;}" +
        "ytd-comments,#comments{background:#1c1230!important;color:#f5e9ff!important;}" +
        "::-webkit-scrollbar{width:12px;}::-webkit-scrollbar-track{background:#1c1230;}::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#7b2ff7,#ff8fe0);border-radius:8px;border:2px solid #1c1230;}";
      var style = document.createElement('style');
      style.id = this.themeId;
      style.textContent = css;
      document.head.appendChild(style);
    },
    removeTheme: function(){
      var s = document.getElementById(this.themeId);
      if (s) s.remove();
    },
    toggleTheme: function(){
      if (this.isThemeOn()) this.removeTheme(); else this.applyTheme();
      prefs.ytTheme = this.isThemeOn();
      savePrefs(prefs);
    },

    scrollMarkerId: '__yt_immersive__',
    isScrollOn: function(){ return !!document.getElementById(this.scrollMarkerId); },
    canScroll: function(){
      return /\/watch/.test(location.pathname) && /[?&]v=/.test(location.search) && !!document.getElementById('movie_player');
    },
    exitScroll: function(){
      var marker = document.getElementById(this.scrollMarkerId);
      if (marker) marker.remove();
      document.documentElement.classList.remove('__yt_immersive_active__');
      var st = document.getElementById(this.scrollMarkerId + '_style');
      if (st) st.remove();
      if (document.fullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document);
      }
      if (window.__ytImmersiveCleanup__) window.__ytImmersiveCleanup__();
    },
    enterScroll: function(){
      var self = this;
      if (self.isScrollOn()) { self.exitScroll(); return; }
      if (!self.canScroll()) {
        alert('Open a video first — click into any video so you\'re on its watch page — then try again.');
        return;
      }
      var player = document.getElementById('movie_player');
      ensureFont();

      var style = document.createElement('style');
      style.id = self.scrollMarkerId + '_style';
      style.textContent =
        'html.__yt_immersive_active__ ytd-masthead,' +
        'html.__yt_immersive_active__ #secondary,' +
        'html.__yt_immersive_active__ #comments,' +
        'html.__yt_immersive_active__ #below,' +
        'html.__yt_immersive_active__ ytd-watch-metadata,' +
        'html.__yt_immersive_active__ #guide-content,' +
        'html.__yt_immersive_active__ tp-yt-app-drawer,' +
        'html.__yt_immersive_active__ ytd-mini-guide-renderer,' +
        'html.__yt_immersive_active__ #chips-wrapper{display:none!important;}' +
        'html.__yt_immersive_active__ body{overflow:hidden!important;background:#000!important;}';
      document.head.appendChild(style);
      document.documentElement.classList.add('__yt_immersive_active__');

      var req = player.requestFullscreen || player.webkitRequestFullscreen;
      if (req) req.call(player);

      var marker = document.createElement('div');
      marker.id = self.scrollMarkerId;
      marker.dir = 'ltr';
      player.appendChild(marker);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;z-index:2147483647;width:34px;height:34px;border-radius:50%;border:none;background:linear-gradient(100deg,#7b2ff7,#ff8fe0);color:#fff;font-size:16px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);';
      closeBtn.onclick = function(){ self.exitScroll(); };
      marker.appendChild(closeBtn);

      var infoBox = document.createElement('div');
      infoBox.style.cssText = 'position:absolute;left:14px;bottom:26px;right:60px;z-index:2147483647;color:#fff;font-family:Quicksand,sans-serif;text-shadow:0 1px 4px rgba(0,0,0,.7);pointer-events:none;text-align:left;';
      marker.appendChild(infoBox);

      var hint = document.createElement('div');
      hint.textContent = 'scroll or swipe up for the next video';
      hint.style.cssText = 'position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483647;color:#fff;opacity:.75;font-family:Quicksand,sans-serif;font-size:11px;background:rgba(255,255,255,.15);padding:5px 12px;border-radius:999px;pointer-events:none;transition:opacity .5s;white-space:nowrap;';
      marker.appendChild(hint);
      setTimeout(function(){ hint.style.opacity = '0'; }, 3200);

      function updateInfo(){
        var t = document.querySelector('ytd-watch-metadata #title, h1.ytd-watch-metadata, #title h1');
        var c = document.querySelector('ytd-watch-metadata #channel-name a, #channel-name a');
        infoBox.replaceChildren();
        if (c && c.textContent.trim()) {
          var chanPill = document.createElement('div');
          chanPill.textContent = c.textContent.trim();
          chanPill.style.cssText = 'display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;background:linear-gradient(100deg,#7b2ff7,#ff8fe0);margin-bottom:6px;';
          infoBox.appendChild(chanPill);
        }
        var titleDiv = document.createElement('div');
        titleDiv.textContent = t ? t.textContent.trim() : document.title.replace(' - YouTube', '');
        titleDiv.style.cssText = 'font-family:"Baloo 2",cursive;font-weight:700;font-size:15px;line-height:1.3;';
        infoBox.appendChild(titleDiv);
      }
      updateInfo();

      var navigating = false;
      function next(){
        if (navigating) return;
        var link = document.querySelector(
          '#secondary a.ytLockupViewModelContentImage[href*="watch?v="], ' +
          '#related a.ytLockupViewModelContentImage[href*="watch?v="], ' +
          '#secondary yt-lockup-view-model a[href*="watch?v="], ' +
          'a.ytLockupViewModelContentImage[href*="watch?v="], ' +
          '#secondary a[href*="watch?v="], ' +
          '#secondary a#thumbnail[href*="watch?v="], #related a#thumbnail');
        if (!link) { hint.textContent = 'no next video found in the sidebar yet'; hint.style.opacity = '.75'; setTimeout(function(){ hint.style.opacity = '0'; }, 2000); return; }
        navigating = true;
        link.click();
        setTimeout(function(){ navigating = false; }, 900);
      }
      function prev(){
        if (navigating) return;
        navigating = true;
        history.back();
        setTimeout(function(){ navigating = false; }, 900);
      }

      var wheelLock = false;
      function onWheel(e){
        if (wheelLock || Math.abs(e.deltaY) < 24) return;
        wheelLock = true;
        if (e.deltaY > 0) next(); else prev();
        setTimeout(function(){ wheelLock = false; }, 700);
      }
      var touchStartY = null;
      function onTouchStart(e){ touchStartY = e.touches[0].clientY; }
      function onTouchEnd(e){
        if (touchStartY == null) return;
        var endY = e.changedTouches[0] ? e.changedTouches[0].clientY : touchStartY;
        var dy = touchStartY - endY;
        touchStartY = null;
        if (Math.abs(dy) < 60) return;
        if (dy > 0) next(); else prev();
      }
      function onKey(e){
        if (e.key === 'Escape') self.exitScroll();
        if (e.key === 'ArrowDown') next();
        if (e.key === 'ArrowUp') prev();
      }
      function onNavFinish(){
        setTimeout(function(){
          updateInfo();
          var p = document.getElementById('movie_player');
          if (p && marker.parentElement !== p) p.appendChild(marker);
          if (p && !document.fullscreenElement) {
            var r = p.requestFullscreen || p.webkitRequestFullscreen;
            if (r) r.call(p);
          }
        }, 300);
      }

      window.addEventListener('wheel', onWheel, { passive: true });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      document.addEventListener('keydown', onKey);
      document.addEventListener('yt-navigate-finish', onNavFinish);

      window.__ytImmersiveCleanup__ = function(){
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('yt-navigate-finish', onNavFinish);
        window.__ytImmersiveCleanup__ = null;
      };
    },

    canDoomScroll: function(){ return this.match(); },
    doomScroll: function(){
      var self = this;
      if (self.isScrollOn()) { self.exitScroll(); return; }
      if (self.canScroll()) { self.enterScroll(); return; }
      var link = document.querySelector(
        'a.ytLockupViewModelContentImage[href*="watch?v="], ' +
        'yt-lockup-view-model a[href*="watch?v="], ' +
        'a#thumbnail[href*="watch?v="], a#video-title[href*="watch?v="], a[href*="/watch?v="]'
      );
      if (!link) {
        alert('No videos found on this page yet — scroll the feed a bit first, then try again.');
        return;
      }
      var tries = 0;
      function waitForPlayer(){
        tries++;
        if (self.canScroll()) { self.enterScroll(); return; }
        if (tries < 40) setTimeout(waitForPlayer, 150);
        else alert('Took too long to load a video — try again.');
      }
      link.click();
      setTimeout(waitForPlayer, 300);
    }
  };

  /* Future flavors: push another { id, label, match(), ... } object here.
     See ~/.rpidrive/notes/bookmarklet-flavor-hub-howto.md for the workflow
     and the two failure modes to check for before shipping a new one. */
  var FLAVORS = [YouTubeFlavor];

  function activeFlavor(){
    for (var i = 0; i < FLAVORS.length; i++) if (FLAVORS[i].match()) return FLAVORS[i];
    return null;
  }

  /* ================= mascot + panel ================= */
  var mascotEl, panelEl, panelOpen = false, mascotHovering = false;
  var PANEL_W = 288;
  var searchQuery = '';
  var panelView = 'main';
  var MASCOT_REST = '-40px', MASCOT_OUT = '-4px', MASCOT_FULL = '8px';
  var MASCOT_OPEN_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAeCAYAAABNChwpAAAB30lEQVR4nGNgGAUDDBhhDCkBjf/0tPjZhxtgu1mQBQ3UfOhi+YVbW+BsFmSJD19eYCh+8OwMnK0gZYIiToiPTR86YMHnUpAhT++dh/OllQzBhoHF63eAxWoWiDO0JLyEyDd6IOSx6CPogAdIrgYBZENgfJBhyGD+Q0OGFoYdOB2NSx9WB5ACQL7FxqYakBLQ+P//3ff/2GgYGx0jy2GjyXbEfyQL/v/6C8FYHICiDo1PsBzABtA1Pn11FVXBl18MuAB6nMPyPVlp4Cm6xcTogSZEXIkPBpiIMgibT/H4HptDcAEWXBIY8fblF4pvsBmMTx5kHq5owAqQExI8dSMB9BSPTx5fQmRhIBI8fX8dTEcbTwfTDkp5DAfuTSJanuw0IK1kCDccBJaezYSzQZYQI48PsDCQAGC+I1eerBCgNWDEJ/l/wdkFcE68UTy6L0FxDKto0NMACCzNM18ItyjBOIGiKJAW1ARbAotjEJ+w/FKC5jLikwRlHfR6HQZA4ienbIbzzXN8UeSv7d0DZ2s5u+AsihkJuRDdEfjAx/tvsYoLGMswkp0In324wUgoK8EAv6IwSZaDANFFIykhAQIgRxNT9DISbSJa/UCoLiC23GckxQHYHIIOSKpwGEYBAwMAXz55unC/YsAAAAAASUVORK5CYII=';
  var MASCOT_BLINK_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAeCAYAAABNChwpAAABn0lEQVR4nGNgGAUDDBhhDCkBjf/0tPjZhxtgu1mQBQ3UfOhi+YVbW+BsFmSJD19eYCh+8OwMnK0gZYIiToiPTR86YMHnUpAhT++dh/OllQzBhoHF63eAxWoWiDO0JLyEyDd6IOSx6CPogAdIrgYBZENgfJBhyGD+Q0OGFoYdOB2NSx9WB5ACQL7FxqYakBLQ+P//3ff/2GgYGx0jy2GjyXbEfyQL/v/6C8FYHICiDo1PsBzABtA1Pn11FVXBl18MuAB6nMPyPVlp4Cm6xcTogSZEXIkPBpiIMgibT/H4HptDSHaAFHq8gSxExiQCXOmAiRLXEwvwmcPEMMCAaaAdwEKMInwpGV8xC5OnOASe4jAEJk5IHh9gxCf5f8HZBXCOn1Y8QdMYGBg+3n8LZ/NffrkQblGCcQLN08BHJMuJBYyE8i6+YDw5ZTOcbZ7ji9MBWs4uOItiRkIuJOQIZIDLAQLGMjjtYSJkKMjlhMpzGOBXFCbJchAgGALkhAQIgByNK9jJcgB6eY7NMcghRYzlIECSA2AAXwODWItHAQMUAACx9iWUYkuI3wAAAABJRU5ErkJggg==';

  function bounceMascot(){
    if (!mascotEl) return;
    mascotEl.classList.add('__flavor_bounce__');
    setTimeout(function(){ mascotEl.classList.remove('__flavor_bounce__'); }, 500);
  }

  function buildToggleRow(labelText, on, onClick){
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid #3a2a5c;';
    var label = document.createElement('span');
    label.textContent = labelText;
    label.style.cssText = 'font-size:13px;font-weight:600;';
    var sw = document.createElement('button');
    sw.style.cssText = 'width:40px;height:22px;border-radius:999px;border:none;cursor:pointer;position:relative;flex-shrink:0;background:' + (on ? 'linear-gradient(100deg,#7b2ff7,#ff8fe0)' : '#3a2a5c') + ';transition:background .2s;';
    var knob = document.createElement('span');
    knob.style.cssText = 'position:absolute;top:2px;left:' + (on ? '20px' : '2px') + ';width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s;';
    sw.appendChild(knob);
    sw.onclick = onClick;
    row.appendChild(label);
    row.appendChild(sw);
    return row;
  }

  function matchesSearch(label){
    if (!searchQuery) return true;
    return label.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
  }

  function buildSearchInput(){
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:10px;';
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search flavors...';
    input.value = searchQuery;
    input.id = '__flavor_search_input__';
    input.style.cssText = 'width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid #3a2a5c;background:#2a1b45;color:#f5e9ff;font-family:Quicksand,sans-serif;font-size:12px;outline:none;';
    input.oninput = function(){
      searchQuery = input.value;
      var caret = input.selectionStart;
      renderPanel();
      var el = document.getElementById('__flavor_search_input__');
      if (el) {
        el.focus();
        try { el.setSelectionRange(caret, caret); } catch(e){}
      }
    };
    wrap.appendChild(input);
    return wrap;
  }

  function smallBtn(text, onClick){
    var b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = 'flex:1;padding:7px 4px;border-radius:8px;border:1px solid #3a2a5c;background:#2a1b45;color:#f5e9ff;font-family:Quicksand,sans-serif;font-size:11px;font-weight:700;cursor:pointer;';
    b.onclick = onClick;
    return b;
  }

  function labeledInput(labelText, placeholder){
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:8px;';
    var label = document.createElement('div');
    label.textContent = labelText;
    label.style.cssText = 'font-size:11px;color:#caa6f5;margin-bottom:4px;';
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.style.cssText = 'width:100%;box-sizing:border-box;padding:7px 9px;border-radius:8px;border:1px solid #3a2a5c;background:#2a1b45;color:#f5e9ff;font-family:Quicksand,sans-serif;font-size:12px;outline:none;';
    wrap.appendChild(label);
    wrap.appendChild(input);
    return { wrap: wrap, input: input };
  }

  function allCustomFlavors(){ return prefs.customFlavors || []; }
  function customFlavorsForSite(){
    return allCustomFlavors().filter(function(f){ return !f.site || location.hostname.indexOf(f.site) !== -1; });
  }
  function saveCustomFlavors(list){ prefs.customFlavors = list; savePrefs(prefs); }

  // Trusted Types (YouTube sends require-trusted-types-for 'script') blocks
  // new Function() outright: "Refused to evaluate a string as JavaScript".
  // Fall back to injecting a <script> element, which is NOT gated the same way
  // when you set .textContent rather than .src.
  function runFlavorCode(code){
    try {
      (new Function(code))();
      return;
    } catch(e) {
      var msg = String((e && e.message) || e);
      if (!/Trusted Type|unsafe-eval|Content Security Policy|call to eval|EvalError/i.test(msg)) throw e;
    }
    // Flavor code uses top-level `return` to undo itself. That is legal inside
    // new Function but ILLEGAL at the top level of a script, so wrap it.
    var wrapped = '(function(){\n' + code + '\n})();';
    var payload = wrapped;
    try {
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        var pol = window.trustedTypes.createPolicy(
          'flavor_run_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          { createScript: function(x){ return x; } });
        payload = pol.createScript(wrapped);
      }
    } catch(e) { /* policy refused: try the raw string, some sites still allow it */ }
    var el = document.createElement('script');
    el.textContent = payload;
    (document.head || document.documentElement).appendChild(el);
    el.parentNode && el.parentNode.removeChild(el);
  }

  function runCustomFlavor(cf){
    try {
      runFlavorCode(cf.code);
    } catch(e) {
      alert('Error running "' + cf.name + '": ' + e.message);
      return;
    }
    cf.on = !cf.on;
    saveCustomFlavors(allCustomFlavors());
    renderPanel();
  }

  function deleteCustomFlavor(id){
    saveCustomFlavors(allCustomFlavors().filter(function(f){ return f.id !== id; }));
    renderPanel();
  }

  function buildCustomToggleRow(cf){
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid #3a2a5c;gap:8px;';
    var label = document.createElement('span');
    label.textContent = cf.generated ? ('✨ ' + cf.name) : cf.name;
    label.style.cssText = 'font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;'
      + (cf.generated ? 'cursor:pointer;text-decoration:underline dotted rgba(200,109,252,.6);text-underline-offset:3px;' : '');
    if (cf.generated) {
      label.title = 'Chat to change this flavor';
      label.onclick = function(){ aiState.chatFor = cf.id; panelView = 'chat'; renderPanel(); };
    }
    var controls = document.createElement('div');
    controls.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';
    var sw = document.createElement('button');
    sw.style.cssText = 'width:40px;height:22px;border-radius:999px;border:none;cursor:pointer;position:relative;flex-shrink:0;background:' + (cf.on ? 'linear-gradient(100deg,#7b2ff7,#ff8fe0)' : '#3a2a5c') + ';transition:background .2s;';
    var knob = document.createElement('span');
    knob.style.cssText = 'position:absolute;top:2px;left:' + (cf.on ? '20px' : '2px') + ';width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s;';
    sw.appendChild(knob);
    sw.onclick = function(){ runCustomFlavor(cf); };
    var del = document.createElement('button');
    del.textContent = '✕';
    del.title = 'Delete';
    del.style.cssText = 'width:20px;height:20px;border-radius:50%;border:none;background:#2a1b45;color:#caa6f5;font-size:10px;cursor:pointer;line-height:1;flex-shrink:0;';
    del.onclick = function(){ deleteCustomFlavor(cf.id); };
    controls.appendChild(sw);
    controls.appendChild(del);
    row.appendChild(label);
    row.appendChild(controls);
    return row;
  }

  function fallbackCopy(text, done){
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      done(ok);
    } catch(e) { done(false); }
  }

  function doExport(btn){
    var json = JSON.stringify(allCustomFlavors(), null, 2);
    var orig = btn.textContent;
    function done(ok){
      btn.textContent = ok ? 'Copied!' : 'Copy failed';
      setTimeout(function(){ btn.textContent = orig; }, 1400);
    }
    try {
      navigator.clipboard.writeText(json).then(function(){ done(true); }, function(){ fallbackCopy(json, done); });
    } catch(e) {
      fallbackCopy(json, done);
    }
  }

  function buildToolbarRow(){
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid #3a2a5c;';
    var aiBtn = smallBtn('✨ AI', function(){ panelView = 'ai'; renderPanel(); });
    var addBtn = smallBtn('+ Add', function(){ panelView = 'add'; renderPanel(); });
    var exportBtn = smallBtn('Export', function(){ doExport(exportBtn); });
    var importBtn = smallBtn('Import', function(){ panelView = 'import'; renderPanel(); });
    row.appendChild(aiBtn);
    row.appendChild(addBtn);
    row.appendChild(exportBtn);
    row.appendChild(importBtn);
    return row;
  }

  function renderAddView(){
    panelEl.replaceChildren();
    var title = document.createElement('div');
    title.textContent = '+ Add flavor';
    title.style.cssText = 'font-family:"Baloo 2",cursive;font-weight:700;font-size:16px;margin-bottom:10px;color:#f5e9ff;';
    panelEl.appendChild(title);

    var nameField = labeledInput('Name', 'e.g. Dark mode toggle');
    var siteField = labeledInput('Site (optional)', 'leave blank for any site');
    var codeLabel = document.createElement('div');
    codeLabel.textContent = 'Code (self-toggling JS)';
    codeLabel.style.cssText = 'font-size:11px;color:#caa6f5;margin:0 0 4px;';
    var codeArea = document.createElement('textarea');
    codeArea.placeholder = 'paste a self-toggling script...';
    codeArea.style.cssText = 'width:100%;box-sizing:border-box;min-height:90px;padding:8px;border-radius:8px;border:1px solid #3a2a5c;background:#2a1b45;color:#f5e9ff;font-family:ui-monospace,Menlo,monospace;font-size:11px;resize:vertical;';

    panelEl.appendChild(nameField.wrap);
    panelEl.appendChild(siteField.wrap);
    panelEl.appendChild(codeLabel);
    panelEl.appendChild(codeArea);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;margin-top:10px;';
    var saveBtn = smallBtn('Save', function(){
      var name = nameField.input.value.trim();
      var code = codeArea.value.trim();
      if (!name || !code) { alert('Name and code are both required.'); return; }
      var list = allCustomFlavors();
      list.push({
        id: 'cf_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        name: name,
        site: siteField.input.value.trim(),
        code: code,
        on: false
      });
      saveCustomFlavors(list);
      panelView = 'main';
      renderPanel();
    });
    saveBtn.style.background = 'linear-gradient(100deg,#7b2ff7,#ff8fe0)';
    saveBtn.style.border = 'none';
    saveBtn.style.color = '#fff';
    var cancelBtn = smallBtn('Cancel', function(){ panelView = 'main'; renderPanel(); });
    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    panelEl.appendChild(btnRow);
  }

  function renderImportView(){
    panelEl.replaceChildren();
    var title = document.createElement('div');
    title.textContent = '⬇ Import flavors';
    title.style.cssText = 'font-family:"Baloo 2",cursive;font-weight:700;font-size:16px;margin-bottom:10px;color:#f5e9ff;';
    panelEl.appendChild(title);

    var hint = document.createElement('div');
    hint.textContent = 'Paste exported JSON below:';
    hint.style.cssText = 'font-size:11px;color:#caa6f5;margin-bottom:6px;';
    panelEl.appendChild(hint);

    var area = document.createElement('textarea');
    area.style.cssText = 'width:100%;box-sizing:border-box;min-height:90px;padding:8px;border-radius:8px;border:1px solid #3a2a5c;background:#2a1b45;color:#f5e9ff;font-family:ui-monospace,Menlo,monospace;font-size:11px;resize:vertical;';
    panelEl.appendChild(area);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;margin-top:10px;';
    var loadBtn = smallBtn('Load', function(){
      var parsed;
      try { parsed = JSON.parse(area.value); }
      catch(e) { alert('That is not valid JSON.'); return; }
      if (!Array.isArray(parsed)) { alert('Expected a JSON array of flavors.'); return; }
      var list = allCustomFlavors();
      parsed.forEach(function(item){
        if (!item || !item.name || !item.code) return;
        list.push({
          id: 'cf_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          name: item.name,
          site: item.site || '',
          code: item.code,
          on: false
        });
      });
      saveCustomFlavors(list);
      panelView = 'main';
      renderPanel();
    });
    loadBtn.style.background = 'linear-gradient(100deg,#7b2ff7,#ff8fe0)';
    loadBtn.style.border = 'none';
    loadBtn.style.color = '#fff';
    var cancelBtn = smallBtn('Cancel', function(){ panelView = 'main'; renderPanel(); });
    btnRow.appendChild(loadBtn);
    btnRow.appendChild(cancelBtn);
    panelEl.appendChild(btnRow);
  }

  // ===================================================================
  //  AI flavor generation
  //  Domain must exist in the flavor memory before we let the model near
  //  it - a generated flavor is only as good as the verified selectors
  //  we can hand the model. No memory => request flow, not generation.
  // ===================================================================

  var API_BASE = 'https://flavors.waleeds.world';
  var MEMORY_INDEX_URL = API_BASE + '/memory/index.json';
  var GENERATE_URL = API_BASE + '/api/generate';
  var REQUEST_URL = API_BASE + '/api/request';

  var aiState = {
    memoryIndex: null,      // null = not fetched, [] = fetched empty
    memoryError: null,
    picked: [],             // selectors the user pointed at
    recording: null,        // {steps:[...], startedAt}
    recorder: null,         // teardown fn while recording
    picker: null,           // teardown fn while picking
    busy: false,
    lastError: null,
    chatFor: null,          // custom-flavor id being refined
    pendingPrompt: null     // prefilled from an accepted suggestion
  };

  function siteKey(){ return location.hostname.replace(/^www\./, '').toLowerCase(); }

  function fetchMemoryIndex(cb){
    if (aiState.memoryIndex) { cb(aiState.memoryIndex); return; }
    fetch(MEMORY_INDEX_URL + '?_=' + Date.now())
      .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(j){
        aiState.memoryIndex = (j && j.domains) || [];
        aiState.memoryError = null;
        cb(aiState.memoryIndex);
      })
      .catch(function(e){
        // CSP connect-src can block this outright on strict sites.
        aiState.memoryError = e.message;
        aiState.memoryIndex = [];
        cb([]);
      });
  }

  function memoryEntry(){
    var key = siteKey();
    return (aiState.memoryIndex || []).filter(function(d){
      return d.domain === key || (d.aliases || []).indexOf(key) !== -1;
    })[0] || null;
  }

  // ---- robust-ish selector for an element the user clicked -----------
  function cssPathFor(el){
    if (!el || el === document.body) return 'body';
    if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) return '#' + el.id;
    var parts = [], node = el, depth = 0;
    while (node && node.nodeType === 1 && depth < 5 && node !== document.body) {
      var seg = node.tagName.toLowerCase();
      var cls = (typeof node.className === 'string' ? node.className : '').trim();
      if (cls) {
        var good = cls.split(/\s+/).filter(function(c){
          return /^[A-Za-z][\w-]*$/.test(c) && !/^(ng|is|has)-/.test(c) && c.length < 40;
        }).slice(0, 2);
        if (good.length) seg += '.' + good.join('.');
      }
      if (node.id && /^[A-Za-z][\w-]*$/.test(node.id)) { parts.unshift('#' + node.id); break; }
      var par = node.parentElement;
      if (par) {
        var same = [].slice.call(par.children).filter(function(c){ return c.tagName === node.tagName; });
        if (same.length > 1) seg += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
      }
      parts.unshift(seg);
      node = node.parentElement; depth++;
    }
    return parts.join(' > ');
  }

  function describeEl(el){
    var txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    return {
      selector: cssPathFor(el),
      tag: el.tagName.toLowerCase(),
      text: txt,
      matches: (function(){ try { return document.querySelectorAll(cssPathFor(el)).length; } catch(e){ return 0; } })()
    };
  }

  // ---- element picker / "mark all" ----------------------------------
  var PICK_STYLE_ID = '__flavor_pick_style__';
  function ensurePickStyles(){
    if (document.getElementById(PICK_STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = PICK_STYLE_ID;
    st.textContent =
      '.__flavor_markall__ *:not(#__flavor_mascot__):not(#__flavor_panel__):not(#__flavor_panel__ *){outline:1px dashed rgba(200,109,252,.35)!important;outline-offset:-1px!important;}' +
      '.__flavor_pick_hot__{outline:3px solid #ff8fe0!important;outline-offset:-1px!important;background:rgba(255,143,224,.12)!important;cursor:crosshair!important;}';
    document.head.appendChild(st);
  }

  function startPicker(onPick, markAll){
    stopPicker();
    ensurePickStyles();
    if (markAll) document.documentElement.classList.add('__flavor_markall__');
    var hot = null;
    function inUI(el){ return el.closest && (el.closest('#__flavor_mascot__') || el.closest('#__flavor_panel__')); }
    function over(e){
      var el = e.target;
      if (!el || inUI(el)) return;
      if (hot) hot.classList.remove('__flavor_pick_hot__');
      hot = el; hot.classList.add('__flavor_pick_hot__');
    }
    function click(e){
      var el = e.target;
      if (!el || inUI(el)) return;
      e.preventDefault(); e.stopPropagation();
      onPick(describeEl(el));
    }
    document.addEventListener('mouseover', over, true);
    document.addEventListener('click', click, true);
    aiState.picker = function(){
      document.removeEventListener('mouseover', over, true);
      document.removeEventListener('click', click, true);
      if (hot) hot.classList.remove('__flavor_pick_hot__');
      document.documentElement.classList.remove('__flavor_markall__');
    };
  }
  function stopPicker(){ if (aiState.picker) { aiState.picker(); aiState.picker = null; } }

  // ---- record mode ---------------------------------------------------
  function startRecording(onStep){
    stopRecording();
    ensurePickStyles();
    document.documentElement.classList.add('__flavor_markall__');
    aiState.recording = { steps: [], startedAt: Date.now() };
    function onClick(e){
      var el = e.target;
      if (!el || (el.closest && (el.closest('#__flavor_mascot__') || el.closest('#__flavor_panel__')))) return;
      // observe only - never swallow the user's real click
      var d = describeEl(el);
      d.t = Date.now() - aiState.recording.startedAt;
      d.url = location.href;
      aiState.recording.steps.push(d);
      if (onStep) onStep(aiState.recording);
    }
    document.addEventListener('click', onClick, true);
    aiState.recorder = function(){
      document.removeEventListener('click', onClick, true);
      document.documentElement.classList.remove('__flavor_markall__');
    };
  }
  function stopRecording(){ if (aiState.recorder) { aiState.recorder(); aiState.recorder = null; } }

  function pageSnapshot(){
    var tags = {};
    document.querySelectorAll('*').forEach(function(el){
      var t = el.tagName.toLowerCase();
      if (t.indexOf('-') !== -1) tags[t] = (tags[t] || 0) + 1;
    });
    var top = Object.keys(tags).map(function(k){ return [k, tags[k]]; })
      .sort(function(a, b){ return b[1] - a[1]; }).slice(0, 30)
      .map(function(x){ return x[0] + ':' + x[1]; });
    return { url: location.href, title: document.title, components: top };
  }

  // ---- the generator call -------------------------------------------
  function callGenerator(payload, cb){
    aiState.busy = true; aiState.lastError = null;
    renderPanel();
    fetch(GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(r){
        // If the API isn't deployed the static host answers with a 404 HTML page,
        // and parsing that as JSON throws a browser-specific message that tells
        // the user nothing ("The string did not match the expected pattern" in
        // Safari). Read as text and diagnose properly.
        return r.text().then(function(body){
          var j = null;
          try { j = JSON.parse(body); } catch(e){}
          if (!j) {
            if (r.status === 404) {
              throw new Error('Generator API is not deployed yet (404 from ' + GENERATE_URL + ').');
            }
            throw new Error('Generator returned ' + r.status + ' but not JSON: ' +
                            body.slice(0, 80).replace(/\s+/g, ' '));
          }
          if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
          if (!j.code) throw new Error(j.error || 'Generator returned no code.');
          return j;
        });
      })
      .then(function(j){ aiState.busy = false; cb(null, j); })
      .catch(function(e){ aiState.busy = false; aiState.lastError = e.message; cb(e); });
  }

  function saveGenerated(result, prompt, existingId){
    var list = allCustomFlavors();
    var cf;
    if (existingId) {
      cf = list.filter(function(f){ return f.id === existingId; })[0];
    }
    if (!cf) {
      cf = {
        id: 'cf_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        name: result.name || 'AI flavor',
        site: siteKey(),
        on: false,
        generated: true,
        domain: siteKey(),
        messages: []
      };
      list.push(cf);
    }
    cf.code = result.code;
    cf.notes = result.notes || '';
    if (result.name) cf.name = result.name;
    cf.messages = (cf.messages || []).concat([
      { role: 'user', content: prompt },
      { role: 'assistant', content: result.notes || 'Updated the flavor.' }
    ]);
    saveCustomFlavors(list);
    return cf;
  }

  // ---- views ---------------------------------------------------------
  function aiHeader(titleText, backTo){
    var wrap = document.createElement('div');
    var t = document.createElement('div');
    t.textContent = titleText;
    t.style.cssText = 'font-family:"Baloo 2",cursive;font-weight:700;font-size:16px;margin-bottom:8px;color:#f5e9ff;';
    wrap.appendChild(t);
    return wrap;
  }

  function chipRow(items, onRemove){
    var box = document.createElement('div');
    box.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin:6px 0;';
    items.forEach(function(it, i){
      var c = document.createElement('span');
      c.textContent = (it.text ? it.text.slice(0, 18) : it.tag) + ' ✕';
      c.title = it.selector + '  (' + it.matches + ' matches)';
      c.style.cssText = 'font-size:10px;background:#3a2a5c;color:#f5e9ff;padding:3px 7px;border-radius:999px;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      c.onclick = function(){ onRemove(i); };
      box.appendChild(c);
    });
    return box;
  }

  function renderAIView(){
    panelEl.replaceChildren();
    panelEl.appendChild(aiHeader('✨ Create a flavor'));

    if (aiState.memoryIndex === null) {
      var loading = document.createElement('div');
      loading.textContent = 'Checking flavor memory…';
      loading.style.cssText = 'font-size:12px;color:#caa6f5;padding:8px 0;';
      panelEl.appendChild(loading);
      fetchMemoryIndex(function(){ renderPanel(); });
      panelEl.appendChild(smallBtn('Cancel', function(){ panelView = 'main'; renderPanel(); }));
      return;
    }

    var entry = memoryEntry();
    var site = document.createElement('div');
    site.textContent = siteKey();
    site.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#caa6f5;margin-bottom:6px;';
    panelEl.appendChild(site);

    if (!entry) {
      // Not in memory: we have no verified selectors, so generating would be guesswork.
      var no = document.createElement('div');
      no.style.cssText = 'font-size:12px;color:#f5e9ff;line-height:1.5;margin-bottom:8px;';
      no.textContent = aiState.memoryError
        ? 'Could not reach flavor memory (' + aiState.memoryError + '). This site may block it.'
        : 'No flavor memory for this site yet, so the AI has no verified elements to build against. Send a request and it can be mapped.';
      panelEl.appendChild(no);
      var reqBtn = smallBtn('📨 Request this site', function(){
        fetch(REQUEST_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: siteKey(), page: pageSnapshot() })
        }).then(function(){ alert('Request sent for ' + siteKey() + '.'); })
          .catch(function(e){ alert('Could not send request: ' + e.message); });
      });
      panelEl.appendChild(reqBtn);
      panelEl.appendChild(smallBtn('Cancel', function(){ panelView = 'main'; renderPanel(); }));
      return;
    }

    var ok = document.createElement('div');
    ok.textContent = '✅ ' + (entry.elements || '?') + ' verified elements in memory';
    ok.style.cssText = 'font-size:11px;color:#9be8a0;margin-bottom:8px;';
    panelEl.appendChild(ok);

    var ta = document.createElement('textarea');
    if (aiState.pendingPrompt) { ta.value = aiState.pendingPrompt; aiState.pendingPrompt = null; }
    ta.placeholder = 'e.g. show me emails in a tiktok format - as I scroll, show me a new email';
    ta.style.cssText = 'width:100%;box-sizing:border-box;height:66px;background:#2a1b45;color:#f5e9ff;border:1px solid #3a2a5c;border-radius:10px;padding:8px;font-size:12px;font-family:inherit;resize:vertical;';
    panelEl.appendChild(ta);

    if (aiState.picked.length) {
      panelEl.appendChild(chipRow(aiState.picked, function(i){
        aiState.picked.splice(i, 1); renderPanel();
      }));
    }

    var tools = document.createElement('div');
    tools.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;';
    tools.appendChild(smallBtn(aiState.picker ? '✓ Done picking' : '🎯 Select elements', function(){
      if (aiState.picker) { stopPicker(); }
      else {
        startPicker(function(d){ aiState.picked.push(d); renderPanel(); }, true);
      }
      renderPanel();
    }));
    var recLabel = aiState.recorder
      ? '⏹ Stop (' + (aiState.recording ? aiState.recording.steps.length : 0) + ')'
      : '⏺ Record';
    tools.appendChild(smallBtn(recLabel, function(){
      if (aiState.recorder) stopRecording();
      else startRecording(function(){ renderPanel(); });
      renderPanel();
    }));
    panelEl.appendChild(tools);

    if (aiState.recording && aiState.recording.steps.length) {
      var rec = document.createElement('div');
      rec.textContent = '⏺ ' + aiState.recording.steps.length + ' steps recorded';
      rec.style.cssText = 'font-size:11px;color:#ff8fe0;margin-bottom:6px;';
      panelEl.appendChild(rec);
    }

    if (aiState.lastError) {
      var err = document.createElement('div');
      err.textContent = '⚠️ ' + aiState.lastError;
      err.style.cssText = 'font-size:11px;color:#ff9b9b;margin:6px 0;line-height:1.4;';
      panelEl.appendChild(err);
    }

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
    var genBtn = smallBtn(aiState.busy ? '⏳ Generating…' : '✨ Generate', function(){
      var prompt = ta.value.trim();
      if (!prompt) { ta.focus(); return; }
      if (aiState.busy) return;
      stopPicker(); stopRecording();
      callGenerator({
        domain: siteKey(),
        prompt: prompt,
        elements: aiState.picked,
        recording: aiState.recording,
        page: pageSnapshot(),
        history: []
      }, function(e, res){
        if (e) { renderPanel(); return; }
        var cf = saveGenerated(res, prompt, null);
        aiState.picked = []; aiState.recording = null;
        aiState.chatFor = cf.id;
        panelView = 'main';
        renderPanel();
        bounceMascot();
      });
    });
    row.appendChild(genBtn);
    row.appendChild(smallBtn('Cancel', function(){
      stopPicker(); stopRecording();
      panelView = 'main'; renderPanel();
    }));
    panelEl.appendChild(row);
  }

  function renderChatView(){
    panelEl.replaceChildren();
    var cf = allCustomFlavors().filter(function(f){ return f.id === aiState.chatFor; })[0];
    if (!cf) { panelView = 'main'; renderPanel(); return; }

    panelEl.appendChild(aiHeader('💬 ' + cf.name));

    var log = document.createElement('div');
    log.style.cssText = 'max-height:150px;overflow:auto;margin-bottom:8px;display:flex;flex-direction:column;gap:5px;';
    (cf.messages || []).forEach(function(m){
      var b = document.createElement('div');
      b.textContent = m.content;
      b.style.cssText = 'font-size:11px;line-height:1.45;padding:6px 8px;border-radius:9px;max-width:92%;' +
        (m.role === 'user'
          ? 'align-self:flex-end;background:#7b2ff7;color:#fff;'
          : 'align-self:flex-start;background:#2a1b45;color:#f5e9ff;');
      log.appendChild(b);
    });
    panelEl.appendChild(log);

    var ta = document.createElement('textarea');
    ta.placeholder = 'Change something… e.g. make the cards rounder';
    ta.style.cssText = 'width:100%;box-sizing:border-box;height:52px;background:#2a1b45;color:#f5e9ff;border:1px solid #3a2a5c;border-radius:10px;padding:8px;font-size:12px;font-family:inherit;resize:vertical;';
    panelEl.appendChild(ta);

    if (aiState.picked.length) {
      panelEl.appendChild(chipRow(aiState.picked, function(i){
        aiState.picked.splice(i, 1); renderPanel();
      }));
    }

    var tools = document.createElement('div');
    tools.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;';
    tools.appendChild(smallBtn(aiState.picker ? '✓ Done picking' : '🎯 Select elements', function(){
      if (aiState.picker) stopPicker();
      else startPicker(function(d){ aiState.picked.push(d); renderPanel(); }, true);
      renderPanel();
    }));
    panelEl.appendChild(tools);

    if (aiState.lastError) {
      var err = document.createElement('div');
      err.textContent = '⚠️ ' + aiState.lastError;
      err.style.cssText = 'font-size:11px;color:#ff9b9b;margin:6px 0;';
      panelEl.appendChild(err);
    }

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
    row.appendChild(smallBtn(aiState.busy ? '⏳ Thinking…' : 'Send', function(){
      var prompt = ta.value.trim();
      if (!prompt || aiState.busy) return;
      stopPicker();
      callGenerator({
        domain: cf.domain || siteKey(),
        prompt: prompt,
        elements: aiState.picked,
        page: pageSnapshot(),
        currentCode: cf.code,
        history: cf.messages || []
      }, function(e, res){
        if (e) { renderPanel(); return; }
        saveGenerated(res, prompt, cf.id);
        aiState.picked = [];
        renderPanel();
      });
    }));
    row.appendChild(smallBtn('Back', function(){
      stopPicker();
      panelView = 'main'; renderPanel();
    }));
    panelEl.appendChild(row);
  }

  // ===================================================================
  //  Proactive suggestions (jev)
  //  We send region labels + geometry, never page content, and jev answers
  //  small typed questions. The decision to speak at all is made here, by
  //  thresholds we control - a model never decides to interrupt.
  // ===================================================================

  var SUGGEST_URL = API_BASE + '/api/suggest';
  var SUGGEST_DELAY = 9000;      // let the page settle, and the user actually look at it
  var SUGGEST_COOLDOWN = 6 * 60 * 60 * 1000;   // 6h per domain after a dismiss
  var suggestState = { shown: false, bubble: null, timer: null };

  // Class names are frequently obfuscated ("mwoq", "ytLockupViewModelHost"), so a
  // label scraped from the DOM is often unusable in a sentence. We send evidence
  // instead and let jev classify the region into a fixed vocabulary - the words
  // the user reads come from OUR list, never from the page's markup.
  function regionEvidence(el){
    var heading = '';
    var h = el.querySelector && el.querySelector('h1,h2,h3,[role=heading]');
    if (h) heading = (h.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 70);
    var aria = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || '';
    var text = (el.innerText || '').trim().replace(/\s+/g, ' ');
    return {
      heading: heading,
      aria: aria.slice(0, 50),
      role: (el.getAttribute && el.getAttribute('role')) || el.tagName.toLowerCase(),
      id: (el.id || '').slice(0, 30),
      sample: text.slice(0, 120),
      words: text.split(' ').length
    };
  }

  function analyzeRegions(){
    var vw = window.innerWidth, vh = window.innerHeight, viewArea = vw * vh;
    var out = [];
    var all = document.querySelectorAll('div,section,aside,nav,main,article,ol,ul,form,table,[role]');
    for (var i = 0; i < all.length && out.length < 90; i++) {
      var el = all[i];
      if (el.closest && (el.closest('#__flavor_mascot__') || el.closest('#__flavor_panel__'))) continue;
      // player internals are overlay shells with no meaning to a person
      if (el.closest && el.closest('#movie_player, video, .html5-video-player')) continue;
      var r;
      try { r = el.getBoundingClientRect(); } catch(e){ continue; }
      if (r.width < 140 || r.height < 110) continue;
      if (r.bottom < 0 || r.top > vh * 1.6) continue;
      var area = (r.width * r.height) / viewArea;
      if (area < 0.04 || area > 0.62) continue;
      var st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) continue;
      var txt = (el.innerText || '').trim();
      var links = el.querySelectorAll('a').length;
      // a region a person could name has words or links in it; empty shells do not
      if (txt.length < 25 && links < 3) continue;
      out.push({ el: el, area: Math.round(area * 100), links: links, repeats: el.children.length });
    }
    var kept = out.filter(function(c){
      return !out.some(function(o){ return o !== c && c.el.contains(o.el); });
    });
    kept.sort(function(a, b){ return b.area - a.area; });
    return kept.slice(0, 6).map(function(c){
      var ev = regionEvidence(c.el);
      return { selector: cssPathFor(c.el), area: c.area, links: c.links,
               repeats: c.repeats, heading: ev.heading, aria: ev.aria,
               role: ev.role, id: ev.id, sample: ev.sample, words: ev.words };
    });
  }

  function suggestAllowed(){
    if (suggestState.shown || panelOpen) return false;
    var mem = prefs.suggestMuted || {};
    var until = mem[siteKey()];
    if (until && Date.now() < until) return false;
    return true;
  }

  function muteSuggestions(ms){
    prefs.suggestMuted = prefs.suggestMuted || {};
    prefs.suggestMuted[siteKey()] = Date.now() + (ms || SUGGEST_COOLDOWN);
    savePrefs(prefs);
  }

  function buildBubble(text, onYes, onNo){
    var b = document.createElement('div');
    b.id = '__flavor_bubble__';
    b.style.cssText = 'position:fixed;z-index:2147483646;max-width:250px;background:linear-gradient(150deg,#3a1c66,#2a1b45);' +
      'color:#f5e9ff;border:1px solid rgba(200,109,252,.45);border-radius:14px;padding:11px 12px 9px;' +
      'font-family:Quicksand,-apple-system,sans-serif;font-size:12.5px;line-height:1.45;' +
      'box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 1px rgba(123,47,247,.25);' +
      'opacity:0;transform:translateY(6px) scale(.97);transition:opacity .28s ease,transform .28s cubic-bezier(.34,1.56,.64,1);';
    var msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = 'margin-bottom:9px;';
    b.appendChild(msg);
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;';
    var yes = document.createElement('button');
    yes.textContent = 'Yes please';
    yes.style.cssText = 'flex:1;border:none;border-radius:999px;padding:6px 10px;cursor:pointer;font-family:inherit;' +
      'font-size:11.5px;font-weight:700;color:#fff;background:linear-gradient(100deg,#7b2ff7,#ff8fe0);';
    var no = document.createElement('button');
    no.textContent = 'Not now';
    no.style.cssText = 'border:none;border-radius:999px;padding:6px 10px;cursor:pointer;font-family:inherit;' +
      'font-size:11.5px;color:#caa6f5;background:#2a1b45;';
    yes.onclick = onYes; no.onclick = onNo;
    row.appendChild(yes); row.appendChild(no);
    b.appendChild(row);
    return b;
  }

  function positionBubble(b){
    var r = mascotEl.getBoundingClientRect();
    var w = b.offsetWidth || 250, h = b.offsetHeight || 90;
    var left = r.left + r.width / 2 - w / 2;
    var top = r.top - h - 12;
    if (top < 8) top = r.bottom + 12;                       // flip under when near the top
    left = Math.min(Math.max(8, left), window.innerWidth - w - 8);
    b.style.left = left + 'px';
    b.style.top = top + 'px';
  }

  function hideBubble(){
    if (suggestState.timer) { clearTimeout(suggestState.timer); suggestState.timer = null; }
    var b = suggestState.bubble;
    if (!b) return;
    suggestState.bubble = null;
    b.style.opacity = '0';
    b.style.transform = 'translateY(6px) scale(.97)';
    setTimeout(function(){ if (b.parentNode) b.parentNode.removeChild(b); }, 300);
  }

  function showSuggestion(res){
    if (!mascotEl || suggestState.bubble) return;
    suggestState.shown = true;
    var b = buildBubble(res.message, function(){
      hideBubble();
      // hand the suggestion straight to the generator as a prefilled prompt
      aiState.pendingPrompt = res.prompt;
      aiState.picked = (res.targets || []).map(function(t){
        return { selector: t.selector, tag: 'div', text: t.label, matches: 1 };
      });
      panelView = 'ai';
      if (!panelOpen) togglePanel(); else renderPanel();
    }, function(){
      hideBubble();
      muteSuggestions();
    });
    document.body.appendChild(b);
    positionBubble(b);
    void b.offsetWidth;
    b.style.opacity = '1';
    b.style.transform = 'translateY(0) scale(1)';
    suggestState.bubble = b;
    bounceMascot();
    // never linger - if it is ignored, it goes away quietly
    suggestState.timer = setTimeout(function(){ hideBubble(); muteSuggestions(30 * 60 * 1000); }, 14000);
  }

  function maybeSuggest(){
    if (!suggestAllowed()) return;
    var regions = analyzeRegions();
    if (regions.length < 2) return;
    fetch(SUGGEST_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: location.href, title: document.title, regions: regions,
        headings: [].slice.call(document.querySelectorAll('h1,h2')).slice(0, 5)
          .map(function(h){ return (h.innerText || '').trim().slice(0, 80); }).filter(Boolean)
      })
    })
      .then(function(r){ return r.json(); })
      .then(function(j){ if (j && j.suggest && j.message) showSuggestion(j); })
      .catch(function(){ /* offline or CSP-blocked: stay silent, never nag */ });
  }

  function armSuggestions(){
    setTimeout(maybeSuggest, SUGGEST_DELAY);
  }

  function renderPanel(){
    ensureFont();
    if (panelView === 'add') { renderAddView(); return; }
    if (panelView === 'import') { renderImportView(); return; }
    if (panelView === 'ai') { renderAIView(); return; }
    if (panelView === 'chat') { renderChatView(); return; }

    panelEl.replaceChildren();

    var title = document.createElement('div');
    title.textContent = '✨ Flavors';
    title.style.cssText = 'font-family:"Baloo 2",cursive;font-weight:700;font-size:17px;margin-bottom:10px;color:#f5e9ff;';
    panelEl.appendChild(title);

    panelEl.appendChild(buildSearchInput());

    var flavor = activeFlavor();
    var shownAny = false;

    if (flavor) {
      var rows = [];
      if (flavor.toggleTheme && matchesSearch('Anime Purple theme')) {
        rows.push(buildToggleRow('🌸 Anime Purple theme', flavor.isThemeOn(), function(){
          flavor.toggleTheme();
          if (flavor.isThemeOn()) bounceMascot();
          renderPanel();
        }));
      }
      if (flavor.doomScroll && matchesSearch('Doom Scroll')) {
        rows.push(buildToggleRow('💀 Doom Scroll', flavor.isScrollOn(), function(){
          flavor.doomScroll();
          setTimeout(renderPanel, 50);
        }));
      }
      if (rows.length) {
        shownAny = true;
        var siteLabel = document.createElement('div');
        siteLabel.textContent = flavor.label;
        siteLabel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#caa6f5;margin-bottom:2px;';
        panelEl.appendChild(siteLabel);
        rows.forEach(function(r){ panelEl.appendChild(r); });
      }
    }

    var customs = customFlavorsForSite().filter(function(f){ return matchesSearch(f.name); });
    if (customs.length) {
      shownAny = true;
      var customLabel = document.createElement('div');
      customLabel.textContent = 'Custom';
      customLabel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#caa6f5;margin-top:14px;margin-bottom:2px;';
      panelEl.appendChild(customLabel);
      customs.forEach(function(cf){ panelEl.appendChild(buildCustomToggleRow(cf)); });
    }

    if (!shownAny) {
      var none = document.createElement('div');
      none.textContent = searchQuery ? 'No flavors match "' + searchQuery + '".' : (flavor ? 'Nothing here yet.' : 'No flavor built for this site yet.');
      none.style.cssText = 'font-size:13px;color:#caa6f5;margin-top:6px;';
      panelEl.appendChild(none);
    }

    panelEl.appendChild(buildToolbarRow());
  }

  var EDGE_HIDE = 40, EDGE_PEEK = 20, EDGE_SNAP = 90;
  var savedState = prefs.mascotState || { edge: 'top', along: null };
  var edge = ('edge' in savedState) ? savedState.edge : 'top';
  var alongPos = savedState.along;
  var freeX = savedState.freeX, freeY = savedState.freeY;

  function edgeGeometry(state){
    var w = (mascotEl && mascotEl.offsetWidth) || 88;
    var h = (mascotEl && mascotEl.offsetHeight) || 83;
    var amt = state === 'rest' ? EDGE_HIDE : EDGE_PEEK;
    var style = {};
    if (edge === 'top') {
      style.top = (state === 'full' ? 8 : -amt) + 'px';
      style.left = alongPos + 'px';
    } else if (edge === 'bottom') {
      style.top = (window.innerHeight - h + (state === 'full' ? -8 : amt)) + 'px';
      style.left = alongPos + 'px';
    } else if (edge === 'left') {
      style.left = (state === 'full' ? 8 : -amt) + 'px';
      style.top = alongPos + 'px';
    } else if (edge === 'right') {
      style.left = (window.innerWidth - w + (state === 'full' ? -8 : amt)) + 'px';
      style.top = alongPos + 'px';
    }
    return style;
  }

  function applyEdgeState(state){
    if (edge == null || !mascotEl) return;
    var s = edgeGeometry(state);
    mascotEl.style.top = s.top;
    mascotEl.style.left = s.left;
    mascotEl.style.right = 'auto';
  }

  function positionPanelNearMascot(){
    var r = mascotEl.getBoundingClientRect();
    var left = Math.min(Math.max(8, r.left + r.width / 2 - PANEL_W / 2), window.innerWidth - PANEL_W - 8);
    var top = r.bottom + 10;
    if (top + 260 > window.innerHeight) top = Math.max(8, r.top - 260);
    panelEl.style.left = left + 'px';
    panelEl.style.right = 'auto';
    panelEl.style.top = top + 'px';
  }

  function togglePanel(){
    hideBubble();
    panelOpen = !panelOpen;
    if (panelOpen) {
      applyEdgeState('full');
      positionPanelNearMascot();
      panelEl.style.opacity = '1';
      panelEl.style.pointerEvents = 'auto';
      renderPanel();
      bounceMascot();
    } else {
      applyEdgeState('rest');
      panelEl.style.opacity = '0';
      panelEl.style.pointerEvents = 'none';
      panelView = 'main';
    }
  }

  function savePosition(){
    if (edge == null) {
      prefs.mascotState = { edge: null, freeX: freeX, freeY: freeY };
    } else {
      prefs.mascotState = { edge: edge, along: alongPos };
    }
    savePrefs(prefs);
  }

  var EDGE_ROTATE = { top: 0, right: 90, bottom: 180, left: -90 };
  var mascotStyleTag;

  function updateOrientationStyles(){
    if (!mascotStyleTag) return;
    var deg = (edge != null && EDGE_ROTATE[edge] != null) ? EDGE_ROTATE[edge] : 0;
    mascotStyleTag.textContent =
      '@keyframes __flavor_bob__{0%,100%{transform:rotate(' + deg + 'deg) translateY(0)}50%{transform:rotate(' + deg + 'deg) translateY(3px)}}' +
      '@keyframes __flavor_bounce__{0%{transform:rotate(' + deg + 'deg) scale(1)}30%{transform:rotate(' + (deg - 4) + 'deg) scale(1.08)}55%{transform:rotate(' + (deg + 3) + 'deg) scale(.96)}100%{transform:rotate(' + deg + 'deg) scale(1)}}' +
      '#__flavor_mascot__{animation:__flavor_bob__ 2.6s ease-in-out infinite;}' +
      '#__flavor_mascot__.__flavor_bounce__{animation:__flavor_bounce__ .5s ease;}' +
      '#__flavor_mascot__.__flavor_dragging__{animation:none;transition:none;cursor:grabbing;transform:none;}' +
      '#__flavor_dragshield__{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483646;background:rgba(20,12,36,.42);cursor:grabbing;opacity:0;transition:opacity .15s ease;pointer-events:auto;}' +
      '#__flavor_dragshield__.__on__{opacity:1;}' +
      'html.__flavor_nosel__,html.__flavor_nosel__ *{user-select:none!important;-webkit-user-select:none!important;-moz-user-select:none!important;-ms-user-select:none!important;-webkit-touch-callout:none!important;}';
  }

  function buildMascot(){
    mascotStyleTag = document.createElement('style');
    document.head.appendChild(mascotStyleTag);
    updateOrientationStyles();

    mascotEl = document.createElement('div');
    mascotEl.id = '__flavor_mascot__';
    mascotEl.dir = 'ltr';
    mascotEl.style.cssText = 'position:fixed;width:88px;height:83px;cursor:grab;z-index:2147483647;background-image:url(' + MASCOT_OPEN_SRC + ');background-size:contain;background-repeat:no-repeat;image-rendering:pixelated;filter:drop-shadow(0 4px 10px rgba(123,47,247,.55));transition:top .4s cubic-bezier(.34,1.56,.64,1),left .4s cubic-bezier(.34,1.56,.64,1);user-select:none;touch-action:none;';

    if (edge == null) {
      mascotEl.style.left = (typeof freeX === 'number' ? freeX : window.innerWidth / 2 - 44) + 'px';
      mascotEl.style.top = (typeof freeY === 'number' ? freeY : window.innerHeight / 2 - 41) + 'px';
      mascotEl.style.right = 'auto';
    } else {
      if (alongPos == null) alongPos = (edge === 'top' || edge === 'bottom') ? window.innerWidth - 152 : window.innerHeight / 2 - 41;
      var s0 = edgeGeometry('rest');
      mascotEl.style.top = s0.top;
      mascotEl.style.left = s0.left;
      mascotEl.style.right = 'auto';
    }
    document.body.appendChild(mascotEl);

    mascotEl.onmouseenter = function(){ mascotHovering = true; applyEdgeState('peek'); };
    mascotEl.onmouseleave = function(){ mascotHovering = false; if (!panelOpen) applyEdgeState('rest'); };

    // Safari starts a text selection on the page as soon as the pointer moves outside
    // the mascot. A full-viewport shield swallows the pointer (nothing left to select)
    // and doubles as the dimmed "locked" backdrop while dragging.
    var shieldEl = null;
    function dragShield(on){
      if (on) {
        hideBubble();
        if (!shieldEl) {
          shieldEl = document.createElement('div');
          shieldEl.id = '__flavor_dragshield__';
          document.body.appendChild(shieldEl);
        }
        document.documentElement.classList.add('__flavor_nosel__');
        try { var sel = window.getSelection(); if (sel) sel.removeAllRanges(); } catch(e){}
        void shieldEl.offsetWidth;            // force a reflow so the fade actually runs
        shieldEl.classList.add('__on__');
      } else {
        document.documentElement.classList.remove('__flavor_nosel__');
        if (shieldEl) {
          shieldEl.classList.remove('__on__');
          var el = shieldEl;
          setTimeout(function(){ if (el && el.parentNode) el.parentNode.removeChild(el); }, 200);
          shieldEl = null;
        }
      }
    }

    var dragging = false, justDragged = false, startX, startY, startLeft, startTop, pointerId, lastNx, lastNy;
    mascotEl.addEventListener('pointerdown', function(e){
      e.preventDefault();   // Safari: without this the page starts selecting text
      dragging = false;
      pointerId = e.pointerId;
      // Capture immediately, not after the drag threshold: mouse pointer events stop
      // routing here the moment the cursor leaves the mascot, so a fast flick would
      // otherwise never start a drag at all.
      try { mascotEl.setPointerCapture(pointerId); } catch(err){}
      startX = e.clientX;
      startY = e.clientY;
      var r = mascotEl.getBoundingClientRect();
      startLeft = r.left;
      startTop = r.top;
      lastNx = startLeft;
      lastNy = startTop;
    });
    mascotEl.addEventListener('pointermove', function(e){
      if (startX == null) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!dragging && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        dragging = true;
        edge = null;
        mascotEl.classList.add('__flavor_dragging__');
        dragShield(true);
      }
      if (dragging) {
        var w = mascotEl.offsetWidth, h = mascotEl.offsetHeight;
        lastNx = Math.min(Math.max(0, startLeft + dx), window.innerWidth - w);
        lastNy = Math.min(Math.max(0, startTop + dy), window.innerHeight - h);
        mascotEl.style.left = lastNx + 'px';
        mascotEl.style.top = lastNy + 'px';
        mascotEl.style.right = 'auto';
        if (panelOpen) positionPanelNearMascot();
        try { var sel = window.getSelection(); if (sel && !sel.isCollapsed) sel.removeAllRanges(); } catch(e){}
      }
    });
    mascotEl.addEventListener('pointerup', function(e){
      if (dragging) {
        var w = mascotEl.offsetWidth, h = mascotEl.offsetHeight;
        var dLeft = lastNx, dRight = window.innerWidth - (lastNx + w);
        var dTop = lastNy, dBottom = window.innerHeight - (lastNy + h);
        var min = Math.min(dLeft, dRight, dTop, dBottom);
        if (min < EDGE_SNAP) {
          if (min === dTop) { edge = 'top'; alongPos = lastNx; }
          else if (min === dBottom) { edge = 'bottom'; alongPos = lastNx; }
          else if (min === dLeft) { edge = 'left'; alongPos = lastNy; }
          else { edge = 'right'; alongPos = lastNy; }
          updateOrientationStyles();
          mascotEl.classList.remove('__flavor_dragging__');
          applyEdgeState('rest');
        } else {
          edge = null;
          freeX = lastNx;
          freeY = lastNy;
          updateOrientationStyles();
          mascotEl.classList.remove('__flavor_dragging__');
        }
        savePosition();
        justDragged = true;
        setTimeout(function(){ justDragged = false; }, 0);
      }
      dragging = false;
      startX = null;
      try { if (pointerId != null) mascotEl.releasePointerCapture(pointerId); } catch(err){}
      dragShield(false);
    });
    // an interrupted drag (alt-tab, context menu, iOS gesture) must not leave the
    // page dimmed and unselectable
    mascotEl.addEventListener('pointercancel', function(){
      dragging = false; startX = null;
      mascotEl.classList.remove('__flavor_dragging__');
      dragShield(false);
    });
    window.addEventListener('blur', function(){ if (shieldEl) { dragging = false; startX = null;
      mascotEl.classList.remove('__flavor_dragging__'); dragShield(false); } });
    mascotEl.onclick = function(){
      if (justDragged) return;
      togglePanel();
    };

    setInterval(function(){
      mascotEl.style.backgroundImage = 'url(' + MASCOT_BLINK_SRC + ')';
      setTimeout(function(){ mascotEl.style.backgroundImage = 'url(' + MASCOT_OPEN_SRC + ')'; }, 160);
    }, 3600);

    setInterval(function(){
      if (edge == null || panelOpen || mascotHovering) return;
      applyEdgeState('peek');
      setTimeout(function(){ if (edge != null && !panelOpen && !mascotHovering) applyEdgeState('rest'); }, 1400);
    }, 9000);

    panelEl = document.createElement('div');
    panelEl.id = '__flavor_panel__';
    panelEl.dir = 'ltr';
    panelEl.style.cssText = 'box-sizing:border-box;position:fixed;top:-500px;left:0;width:' + PANEL_W + 'px;max-height:70vh;overflow:auto;background:#1c1230;border:1px solid #3a2a5c;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.5);z-index:2147483646;padding:16px;font-family:Quicksand,sans-serif;color:#f5e9ff;opacity:0;pointer-events:none;transition:opacity .2s ease;';
    document.body.appendChild(panelEl);

    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && panelOpen) togglePanel(); });
  }

  buildMascot();

  var flavorNow = activeFlavor();
  if (flavorNow && flavorNow.applyTheme && prefs.ytTheme) flavorNow.applyTheme();

  document.addEventListener('yt-navigate-finish', function(){
    var f = activeFlavor();
    if (f && f.applyTheme && prefs.ytTheme && !f.isThemeOn()) f.applyTheme();
    if (panelOpen) renderPanel();
  });

  armSuggestions();

  window.__flavorHub__ = { togglePanel: togglePanel, flavors: FLAVORS,
                           suggestNow: maybeSuggest, analyzeRegions: analyzeRegions,
                           runFlavorCode: runFlavorCode };
}
