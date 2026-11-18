/*
 * Nymind's TV — dvojité Zpět ve StremioK (Tizen 3.x / TizenBrew)
 * Opravuje obě podoby Samsung tlačítka: keydown i tizenhwkey.
 * Jedno Zpět zachová původní navigaci StremioK; dvě do 520 ms otevřou launcher.
 * Zatím neověřeno na konkrétní televizi.
 */
(function () {
  'use strict';

  var HOME = 'gh/romangazdik-web/mojeTV';
  var DOUBLE_MS = 520;
  var DUPLICATE_MS = 110;
  var pendingTimer = null;
  var pendingTarget = null;
  var pendingKind = null;
  var lastPhysicalKind = null;
  var lastPhysicalAt = 0;
  var goBusy = false;

  function isBack(e) {
    if (!e) return false;
    var c = e.keyCode || e.which;
    return c === 10009 || c === 27 || e.key === 'Back' ||
           e.key === 'Escape' || (e.type === 'tizenhwkey' && e.keyName === 'back');
  }

  function block(e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  }

  function syntheticBack(kind, target) {
    try {
      var ev = document.createEvent('Event');
      ev.initEvent(kind === 'tizenhwkey' ? 'tizenhwkey' : 'keydown', true, true);
      ev.__nymindsReplayed = true;
      if (kind === 'tizenhwkey') {
        ev.keyName = 'back';
        document.dispatchEvent(ev);
      } else {
        Object.defineProperty(ev, 'keyCode', { get: function () { return 10009; } });
        Object.defineProperty(ev, 'which',   { get: function () { return 10009; } });
        Object.defineProperty(ev, 'key',     { get: function () { return 'Back'; } });
        (target && target.dispatchEvent ? target : document).dispatchEvent(ev);
      }
    } catch (e) {
      if (window.console && console.warn) console.warn('Nymind: přehrání Zpět selhalo', e);
    }
  }

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

  function onBack(e) {
    if (e.__nymindsReplayed || !isBack(e)) return;
    // Některé Samsungy pošlou tentýž stisk jako keydown i tizenhwkey.
    // Druhou událost nesmíme považovat za druhé stisknutí.
    var now = new Date().getTime();
    var kind = e.type;
    if (kind !== lastPhysicalKind && now - lastPhysicalAt < DUPLICATE_MS) {
      block(e);
      return;
    }
    lastPhysicalKind = kind;
    lastPhysicalAt = now;
    if (e.repeat || goBusy) {
      block(e);
      return;
    }
    block(e);
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
      pendingTarget = null;
      pendingKind = null;
      gotoHome();
    } else {
      pendingTarget = e.target || document;
      pendingKind = kind;
      pendingTimer = setTimeout(function () {
        var t = pendingTarget, k = pendingKind;
        pendingTimer = null;
        pendingTarget = null;
        pendingKind = null;
        syntheticBack(k, t);
      }, DOUBLE_MS);
    }
  }

  // Capture fáze: před původním ovládáním StremioK.
  window.addEventListener('keydown', onBack, true);
  window.addEventListener('tizenhwkey', onBack, true);
}());
