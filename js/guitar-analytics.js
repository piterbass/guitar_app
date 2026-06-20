// ============================================================
// guitar-analytics.js — Snippet de tracking para la PWA.
// Genera/persiste un vid anonimo, manda pageview al cargar, y expone
// window.track(eventName) para los botones de la app.
// Falla SIEMPRE en silencio: nunca debe romper la PWA.
// ============================================================
(function () {
  'use strict';

  var ENDPOINT = '/track';   // same-origin: nginx proxya a 127.0.0.1:3200
  var VID_KEY = 'ga_vid';

  // --- visitor id anonimo, persistido en localStorage --------
  function getVid() {
    try {
      var v = localStorage.getItem(VID_KEY);
      if (!v) {
        v = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
        localStorage.setItem(VID_KEY, v);
      }
      return v;
    } catch (e) {
      return null; // modo incognito / storage bloqueado
    }
  }

  // --- envio de un hit ---------------------------------------
  function send(event) {
    try {
      var vid = getVid();
      if (!vid) return;

      var payload = JSON.stringify({
        vid: vid,
        path: location.pathname + location.hash,
        ref: document.referrer || '',
        event: event || 'pageview'
      });

      // sendBeacon sobrevive al cierre/cambio de pestania.
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINT, blob)) return;
      }
      // Fallback: fetch keepalive, error ignorado.
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(function () {});
    } catch (e) {
      // silencio total
    }
  }

  // --- API publica para los botones de la app ----------------
  // Uso:  window.track('chord_generated')
  window.track = function (eventName) {
    send(eventName);
  };

  // --- pageview automatico al cargar -------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { send('pageview'); });
  } else {
    send('pageview');
  }
})();
