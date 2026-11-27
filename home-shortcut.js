/*
 * Nymind TV launcher bridge / 2.5.17
 * Removed accidental double-BACK navigation: never intercepts any remote key.
 * StremioK handles BACK natively, including fast repeated presses.
 * The explicit "Nymind TV" sidebar entry calls window.NymindHome.open().
 * ES5, Tizen 3 / Chromium 47.
 */
(function () {
  'use strict';
  var HOME = 'gh/romangazdik-web/nyminds-tv';
  var goBusy = false;
  function gotoHome() {
    if (goBusy) return;
    goBusy = true;
    var ws;
    var done = false;
    var watchdog = setTimeout(function () {
      if (done) return;
      done = true;
      goBusy = false;
      try { ws.close(); } catch (ignored) {}
      if (window.console && console.warn) console.warn('Nymind: TizenBrew neodpovídá');
      try{window.location.href='https://cdn.jsdelivr.net/gh/romangazdik-web/nyminds-tv@v4.0.1/app/index.html';}catch(e){}
    }, 4500);

    try {
      ws = new WebSocket('ws://127.0.0.1:8081');
      ws.onopen = function () {
        ws.send(JSON.stringify({ type: 4, payload: false }));
      };
      ws.onmessage = function (event) {
        var msg, mods, mod = null, url, i;
        if (done) return;
        try { msg = JSON.parse(event.data); } catch (ignored) { return; }
        if (msg.type !== 4 || Object.prototype.toString.call(msg.payload) !== '[object Array]') return;
        mods = msg.payload;
        for (i = 0; i < mods.length; i++) {
          var fullName = (mods[i].fullName || '').toLowerCase();
          var base = HOME.toLowerCase();
          if (fullName === base || fullName.indexOf(base + '@') === 0) {
            mod = mods[i];
            break;
          }
        }
        if (!mod) {
          done = true;
          clearTimeout(watchdog);
          goBusy = false;
          try { ws.close(); } catch (ignored2) {}
          if (window.console && console.warn) console.warn('Nymind: modul Moje TV nebyl nalezen');
          try{window.location.href='https://cdn.jsdelivr.net/gh/romangazdik-web/nyminds-tv@v4.0.1/app/index.html';}catch(e){}
          return;
        }
        url = mod.appPath || mod.websiteURL;
        if (!url) {
          done = true;
          clearTimeout(watchdog);
          goBusy = false;
          try { ws.close(); } catch (ignored3) {}
          return;
        }
        done = true;
        clearTimeout(watchdog);
        ws.send(JSON.stringify({ type: 5, payload: mod }));
        setTimeout(function () { window.location.href = url; }, 320);
      };
      ws.onerror = function () {
        clearTimeout(watchdog);
        done = true;
        goBusy = false;
        if (window.console && console.warn) console.warn('Nymind: WebSocket TizenBrew není dostupný');
      };
    } catch (e) {
      clearTimeout(watchdog);
      goBusy = false;
      if (window.console && console.warn) console.warn('Nymind: nelze otevřít TizenBrew', e);
    }
  }



  /* One consistent intentional shortcut: RED -> Nymind Home.
     Preserve native BACK and all other colored-key handling. */
  function redHomeKey(e) {
    var k=e.keyCode||e.which||0;
    if(k!==403 && e.key!=='ColorF0Red')return;
    if(e.type!=='keydown')return;
    try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}catch(ignore){}
    gotoHome();
  }
  window.addEventListener('keydown',redHomeKey,true);

  window.NymindHome = { open: gotoHome };
}());
