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
