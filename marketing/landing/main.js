/* TOPADERO landing - interacciones. Todo degrada con prefers-reduced-motion. */
(function () {
  "use strict";
  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = mq.matches;

  /* ---- barra de progreso de scroll (scaleX, acelerado por GPU) ---- */
  var bar = document.querySelector(".scroll-progress");
  if (bar) {
    var ticking = false;
    function updateBar() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      bar.style.transform = "scaleX(" + pct.toFixed(4) + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(updateBar); ticking = true; }
    }, { passive: true });
    updateBar();
  }

  /* ---- scrollspy: nodo activo del eje del circuito ---- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var railLinks = {};
  document.querySelectorAll(".rail__link").forEach(function (a) {
    var id = (a.getAttribute("href") || "").replace("#", "");
    if (id) railLinks[id] = a;
  });
  function setActive(id) {
    Object.keys(railLinks).forEach(function (key) {
      railLinks[key].setAttribute("aria-current", key === id ? "true" : "false");
    });
  }
  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(e.target.id);
      });
    }, { rootMargin: "-48% 0px -48% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---- reveal al entrar en viewport ---- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (reduce) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else if ("IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); obs.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }
  // El reveal ya está montado: desactiva la red de seguridad del <head>.
  window.__revealInit = true;

  /* ---- firma de telemetría ----
     Las dos trazas se renderizan estáticas y superpuestas: la tesis (misma
     trayectoria a cualquier FPS) se lee sola, sin depender de JS. El único
     movimiento de la firma es el cronómetro en vivo de abajo. */
  var sig = document.querySelector(".signature");

  /* ---- cronómetro de muestra (mm:ss.mmm, cifras tabulares) ---- */
  function fmt(ms) {
    var m = Math.floor(ms / 60000);
    var s = Math.floor(ms / 1000) % 60;
    var mil = Math.floor(ms) % 1000;
    function p(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
    return p(m, 2) + ":" + p(s, 2) + "." + p(mil, 3);
  }
  var sigCrono = document.getElementById("sig-crono");
  if (sigCrono) {
    if (reduce) {
      sigCrono.textContent = "00:00.000";
    } else if (sig && "IntersectionObserver" in window) {
      var running = false, start = 0, raf;
      function tick(now) {
        if (!start) start = now;
        sigCrono.textContent = fmt(now - start);
        raf = window.requestAnimationFrame(tick);
      }
      function stopCrono() { running = false; window.cancelAnimationFrame(raf); }
      var cObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !running && !mq.matches) { running = true; start = 0; raf = window.requestAnimationFrame(tick); }
          else if ((!e.isIntersecting || mq.matches) && running) { stopCrono(); }
        });
      }, { threshold: 0.25 });
      cObs.observe(sig);
      // Si el usuario activa "reduce" después de cargar, detenemos el cronómetro.
      var onReduce = function (e) { if (e.matches && running) { stopCrono(); sigCrono.textContent = "00:00.000"; } };
      if (mq.addEventListener) mq.addEventListener("change", onReduce);
      else if (mq.addListener) mq.addListener(onReduce);
    }
  }

  /* ---- formulario de lista de espera (solo cliente; conectar backend real) ---- */
  var form = document.getElementById("waitlist");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var msg = form.parentNode.querySelector(".waitlist__msg");
      var val = input ? input.value.trim() : "";
      if (!val) return;
      if (msg) msg.textContent = "¡Hecho! Te escribimos a " + val + " el día que se pueda jugar.";
      form.reset();
      // TODO: enviar a un backend o servicio de listas; ahora solo confirma en el cliente.
    });
  }
})();

/* ---- PWA (004 · US4): registro del SW + invitación a instalar el juego ----
   El SW (scope raíz) da offline a landing y /play. La invitación usa beforeinstallprompt
   cuando el navegador lo permite; en iOS Safari (sin ese evento) muestra instrucciones. Nunca
   es bloqueante (FR-022) y no reaparece de forma molesta en la misma sesión. */
(function () {
  "use strict";
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  var standalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  if (standalone) return; // ya instalado: no insistir
  if (sessionStorage.getItem("tp-install-dismissed")) return;

  var style = document.createElement("style");
  style.textContent =
    ".pwa-install{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;display:flex;gap:10px;" +
    "align-items:center;justify-content:center;background:#14233b;color:#fff;border:3px solid #fff;" +
    "border-radius:14px;padding:10px 12px;box-shadow:0 6px 0 rgba(0,0,0,.25);font:600 14px/1.3 system-ui,sans-serif;max-width:520px;margin:0 auto}" +
    ".pwa-install__go{cursor:pointer;background:#ff5fa2;color:#fff;border:0;border-radius:999px;padding:9px 16px;font:inherit;font-weight:800}" +
    ".pwa-install__x{cursor:pointer;background:transparent;color:#fff;border:0;font-size:22px;line-height:1;padding:0 6px}";
  document.head.appendChild(style);

  function dismiss(box) {
    box.remove();
    try { sessionStorage.setItem("tp-install-dismissed", "1"); } catch (e) {}
  }
  function banner(html) {
    var box = document.createElement("div");
    box.className = "pwa-install";
    box.innerHTML = html + '<button class="pwa-install__x" aria-label="Descartar">×</button>';
    document.body.appendChild(box);
    box.querySelector(".pwa-install__x").addEventListener("click", function () { dismiss(box); });
    return box;
  }

  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    var box = banner('<span>Instala Topadero como app</span><button class="pwa-install__go">Instalar</button>');
    box.querySelector(".pwa-install__go").addEventListener("click", function () {
      box.remove();
      if (deferred) { deferred.prompt(); deferred = null; }
    });
  });
  window.addEventListener("appinstalled", function () {
    try { sessionStorage.setItem("tp-install-dismissed", "1"); } catch (e) {}
  });

  // iOS Safari no expone beforeinstallprompt → instrucciones equivalentes.
  var ua = navigator.userAgent || "";
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isSafari = /safari/i.test(ua) && !/crios|fxios|chrome|android/i.test(ua);
  if (isIOS && isSafari) {
    banner('<span>Instala el juego: pulsa <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b></span>');
  }
})();
