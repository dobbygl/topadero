// TopaderoAd.jsx — 16:9 looping ad for TOPADERO (candy party-game).
// Self-contained: bundles a trimmed timeline engine + all six scenes.
// Mounted by TopaderoAd.dc.html via <x-import component="Ad">.
// Uses the global React injected by the DC runtime.

const E = React.createElement;

/* ───────────────────────── timeline engine ───────────────────────── */
const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeOutQuart: t => 1 - (--t) * t * t * t,
  easeInExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  easeInBack: t => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  easeOutElastic: t => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0; if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
function interpolate(input, output, ease = Easing.linear) {
  return t => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const ef = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        return output[i] + (output[i + 1] - output[i]) * ef(local);
      }
    }
    return output[output.length - 1];
  };
}

const TimelineContext = React.createContext({ time: 0, duration: 15, playing: false });
const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);
const SpriteContext = React.createContext({ localTime: 0, progress: 0, duration: 0 });
const useSprite = () => React.useContext(SpriteContext);

function Sprite({ start = 0, end = Infinity, children }) {
  const { time } = useTimeline();
  if (time < start || time > end) return null;
  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration) ? clamp(localTime / duration, 0, 1) : 0;
  return E(SpriteContext.Provider, { value: { localTime, progress, duration } },
    typeof children === 'function' ? children({ localTime, progress, duration }) : children);
}

function Stage({ width, height, duration, background, persistKey, children }) {
  const [time, setTime] = React.useState(() => {
    try { const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0'); return isFinite(v) ? clamp(v, 0, duration) : 0; } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(true);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);
  const stageRef = React.useRef(null), rafRef = React.useRef(null), lastTs = React.useRef(null);

  React.useEffect(() => { try { localStorage.setItem(persistKey + ':t', String(time)); } catch {} }, [time, persistKey]);
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => { const s = Math.min(el.clientWidth / width, (el.clientHeight - 44) / height); setScale(Math.max(0.05, s)); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [width, height]);
  React.useEffect(() => {
    if (!playing) { lastTs.current = null; return; }
    const step = ts => {
      if (lastTs.current == null) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000; lastTs.current = ts;
      setTime(t => { let n = t + dt; if (n >= duration) n = n % duration; return n; });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTs.current = null; };
  }, [playing, duration]);
  React.useEffect(() => {
    const onKey = e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') { e.preventDefault(); setPlaying(p => !p); }
      else if (e.code === 'ArrowLeft') setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      else if (e.code === 'ArrowRight') setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      else if (e.key === '0' || e.code === 'Home') setTime(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  const displayTime = hoverTime != null ? hoverTime : time;
  const ctx = React.useMemo(() => ({ time: displayTime, duration, playing }), [displayTime, duration, playing]);
  React.useEffect(() => { window.__seek = t => { setPlaying(false); setTime(clamp(t, 0, duration)); }; window.__play = () => setPlaying(true); }, [duration]);

  return E('div', { ref: stageRef, style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a0a0a', fontFamily: 'Poppins, system-ui, sans-serif' } },
    E('div', { style: { flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0 } },
      E('div', { style: { width, height, background, position: 'relative', transform: `scale(${scale})`, transformOrigin: 'center', flexShrink: 0, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', overflow: 'hidden' } },
        E(TimelineContext.Provider, { value: ctx }, children))),
    E(PlaybackBar, { time: displayTime, duration, playing, onPlayPause: () => setPlaying(p => !p), onReset: () => setTime(0), onSeek: t => setTime(t), onHover: t => setHoverTime(t) }));
}

function PlaybackBar({ time, duration, playing, onPlayPause, onReset, onSeek, onHover }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const tFromE = React.useCallback(e => { const r = trackRef.current.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1) * duration; }, [duration]);
  React.useEffect(() => {
    if (!dragging) return;
    const up = () => setDragging(false);
    const mv = e => { if (trackRef.current) onSeek(tFromE(e)); };
    window.addEventListener('mouseup', up); window.addEventListener('mousemove', mv);
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', mv); };
  }, [dragging, tFromE, onSeek]);
  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const mono = 'ui-monospace, "Roboto Mono", monospace';
  const fmt = t => { const tot = Math.max(0, t); const s = Math.floor(tot % 60), cs = Math.floor((tot * 100) % 100); return `0:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`; };
  const btn = (onClick, title, child) => E('button', { onClick, title, style: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f6f4ef', cursor: 'pointer', padding: 0 } }, child);
  return E('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(20,20,20,0.92)', borderTop: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: 680, borderRadius: 8, color: '#f6f4ef', userSelect: 'none', flexShrink: 0 } },
    btn(onReset, 'Restart (0)', E('svg', { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none' }, E('path', { d: 'M3 2v10M12 2L5 7l7 5V2z', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round', strokeLinecap: 'round' }))),
    btn(onPlayPause, 'Play/pause (space)', playing
      ? E('svg', { width: 14, height: 14, viewBox: '0 0 14 14' }, E('rect', { x: 3, y: 2, width: 3, height: 10, fill: 'currentColor' }), E('rect', { x: 8, y: 2, width: 3, height: 10, fill: 'currentColor' }))
      : E('svg', { width: 14, height: 14, viewBox: '0 0 14 14' }, E('path', { d: 'M3 2l9 5-9 5V2z', fill: 'currentColor' }))),
    E('div', { style: { fontFamily: mono, fontSize: 12, fontVariantNumeric: 'tabular-nums', width: 56, textAlign: 'right' } }, fmt(time)),
    E('div', { ref: trackRef, onMouseMove: e => { if (dragging) onSeek(tFromE(e)); else onHover(tFromE(e)); }, onMouseLeave: () => { if (!dragging) onHover(null); }, onMouseDown: e => { setDragging(true); onSeek(tFromE(e)); onHover(null); }, style: { flex: 1, height: 22, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' } },
      E('div', { style: { position: 'absolute', left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2 } }),
      E('div', { style: { position: 'absolute', left: 0, width: pct + '%', height: 4, background: '#FF7A1A', borderRadius: 2 } }),
      E('div', { style: { position: 'absolute', left: pct + '%', top: '50%', width: 12, height: 12, marginLeft: -6, marginTop: -6, background: '#fff', borderRadius: 6, boxShadow: '0 2px 4px rgba(0,0,0,0.4)' } })),
    E('div', { style: { fontFamily: mono, fontSize: 12, fontVariantNumeric: 'tabular-nums', width: 56, color: 'rgba(246,244,239,0.55)' } }, fmt(duration)));
}

/* ───────────────────────── assets + palette ───────────────────────── */
const A = 'uploads/topadero-ad-16x9-assets/';
const IMG = {
  bg: A + 'bg-horizontal.png', logo: A + 'logo.png',
  wave: A + 'mascot-wave.png', run: A + 'mascot-run.png', jump: A + 'mascot-jump.png',
  gag: A + 'mascot-gag.png', win: A + 'mascot-win.png',
  teal: A + 'blob-teal.png', pink: A + 'blob-pink.png', yellow: A + 'blob-yellow.png',
  cannon: A + 'prop-cannon.png', pendulum: A + 'prop-pendulum.png', ramp: A + 'prop-ramp.png',
  finish: A + 'prop-finish.png', pPink: A + 'prop-platform-pink.png', pTeal: A + 'prop-platform-teal.png',
};
const C = { sky1: '#7EC8F3', sky2: '#BFE6FF', orange: '#FF7A1A', teal: '#2FD4C4', pink: '#FF5FA2', yellow: '#FFD23F', gold: '#D4AF37', navy: '#14233B', white: '#fff' };
const DISPLAY = '"Baloo 2", "Fredoka", system-ui, sans-serif';

/* helpers */
function sceneFade(lt, dur, fin = 0.3, fout = 0.3) {
  if (lt < fin) return clamp(lt / fin, 0, 1);
  if (lt > dur - fout) return clamp((dur - lt) / fout, 0, 1);
  return 1;
}
// image placed by CENTER point
function Img({ src, cx, cy, w, h, rot = 0, sx = 1, sy = 1, opacity = 1, z = 0, flip = false, shadow = true }) {
  return E('img', {
    src, draggable: false, style: {
      position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h,
      transform: `rotate(${rot}deg) scale(${(flip ? -1 : 1) * sx}, ${sy})`, transformOrigin: 'center',
      opacity, zIndex: z, willChange: 'transform,opacity', pointerEvents: 'none',
      filter: shadow ? 'drop-shadow(0 14px 16px rgba(20,35,59,0.22))' : 'none',
    }
  });
}
// sticker-style display text
function Sticker({ children, size, color = C.white, stroke = C.navy, sw, weight = 800, style = {} }) {
  const w = sw != null ? sw : Math.max(4, Math.round(size * 0.085));
  return E('div', {
    style: {
      fontFamily: DISPLAY, fontWeight: weight, fontSize: size, color, lineHeight: 1,
      WebkitTextStrokeWidth: w + 'px', WebkitTextStrokeColor: stroke, paintOrder: 'stroke fill',
      textShadow: `0 ${Math.round(w * 0.9)}px 0 ${stroke}, 0 ${Math.round(w * 1.1 + 6)}px 14px rgba(20,35,59,0.30)`,
      whiteSpace: 'nowrap', letterSpacing: '0.5px', ...style,
    }
  }, children);
}

/* ───────────────────────── background (always on, seamless) ───────────────────────── */
function Cloud({ phase, top, scale, op }) {
  const t = useTime();
  const p = ((t / 15) + phase) % 1;
  const x = p * (1920 + 560) - 280;
  return E('div', { style: { position: 'absolute', left: x, top, width: 240 * scale, height: 78 * scale, background: 'rgba(255,255,255,0.55)', borderRadius: 999, filter: 'blur(3px)', opacity: op } });
}
function Background() {
  const t = useTime();
  const p = t / 15;
  const tx = Math.sin(p * Math.PI * 2) * 26;
  const ty = Math.cos(p * Math.PI * 2) * 12;
  return E('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden', background: `linear-gradient(180deg, ${C.sky1}, ${C.sky2})` } },
    E('img', { src: IMG.bg, draggable: false, style: { position: 'absolute', left: '50%', top: '50%', width: '114%', height: '114%', objectFit: 'cover', transform: `translate(-50%,-50%) translate(${tx}px,${ty}px) scale(1.05)`, transformOrigin: 'center' } }),
    E(Cloud, { phase: 0.0, top: 250, scale: 1.0, op: 0.35 }),
    E(Cloud, { phase: 0.55, top: 430, scale: 0.7, op: 0.28 }));
}

/* ───────────────────────── S1 — logo reveal ───────────────────────── */
function S1() {
  const { localTime: lt, duration: dur } = useSprite();
  const op = sceneFade(lt, dur, 0.25, 0.35);
  const logoW = 940, logoH = logoW * (352 / 1355);
  const ty = interpolate([0, 0.9], [380, 0], Easing.easeOutBack)(lt);
  const sc = interpolate([0, 0.55, 0.9], [0.72, 1.05, 1], [Easing.easeOutCubic, Easing.easeOutBack])(lt);
  // flash sweep across logo
  const fp = clamp((lt - 0.55) / 0.7, 0, 1);
  const flashX = -0.4 + fp * 1.8; // fraction of width
  const flashOp = lt > 0.55 && lt < 1.3 ? Math.sin(fp * Math.PI) * 0.9 : 0;
  const tagTy = interpolate([0.75, 1.35], [40, 0], Easing.easeOutBack)(lt);
  const tagOp = clamp((lt - 0.75) / 0.35, 0, 1);
  return E('div', { style: { position: 'absolute', inset: 0, opacity: op } },
    E('div', { style: { position: 'absolute', left: 960 - logoW / 2, top: 320 - logoH / 2, width: logoW, height: logoH, transform: `translateY(${ty}px) scale(${sc})`, transformOrigin: 'center' } },
      E('img', { src: IMG.logo, draggable: false, style: { width: '100%', height: '100%', filter: 'drop-shadow(0 16px 22px rgba(20,35,59,0.30))' } }),
      E('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 24 } },
        E('div', { style: { position: 'absolute', top: '-30%', height: '160%', left: (flashX * 100) + '%', width: '22%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.95), transparent)', transform: 'skewX(-18deg)', opacity: flashOp, filter: 'blur(2px)' } }))),
    E('div', { style: { position: 'absolute', left: 0, right: 0, top: 540, display: 'flex', justifyContent: 'center', transform: `translateY(${tagTy}px)`, opacity: tagOp } },
      E(Sticker, { size: 74, color: C.yellow, sw: 7 }, 'Corre. Salta. Sobrevive.')));
}

/* ───────────────────────── S2 — mascot waves in ───────────────────────── */
function S2() {
  const { localTime: lt, duration: dur } = useSprite();
  const op = sceneFade(lt, dur, 0.3, 0.3);
  const camS = interpolate([0, dur], [1.0, 1.07], Easing.easeInOutCubic)(lt);
  const h = 560, w = h * (587 / 657);
  const groundY = 1010;
  const cx = interpolate([0, 0.85], [1620, 1160], Easing.easeOutCubic)(lt);
  const ty = interpolate([0, 0.55, 0.72, 0.88], [560, -30, 18, 0], [Easing.easeOutCubic, Easing.easeOutBack, Easing.easeOutQuad])(lt);
  // squash on land near lt 0.72
  const sl = clamp((lt - 0.6) / 0.28, 0, 1);
  const squash = lt < 0.6 ? 0 : Math.sin(sl * Math.PI) * 0.16;
  const sx = 1 + squash, sy = 1 - squash;
  // wave wobble after landing
  const rot = lt > 0.92 ? Math.sin((lt - 0.92) * 7.5) * 5 : 0;
  const cy = groundY - h / 2 + ty;
  return E('div', { style: { position: 'absolute', inset: 0, opacity: op, transform: `scale(${camS})`, transformOrigin: '62% 70%' } },
    E(Img, { src: IMG.wave, cx, cy, w, h, rot, sx, sy, z: 5 }),
    E('div', { style: { position: 'absolute', left: 110, top: 350, opacity: clamp((lt - 0.95) / 0.4, 0, 1), transform: `translateY(${interpolate([0.95, 1.4], [30, 0], Easing.easeOutBack)(lt)}px)` } },
      E(Sticker, { size: 100, color: C.white, sw: 7 }, '¡Bienvenido'),
      E(Sticker, { size: 100, color: C.orange, sw: 7, style: { marginTop: 4 } }, 'al caos!')));
}

/* ───────────────────────── S3 — the run + jump ───────────────────────── */
function SpeedLines({ cx, cy, t, color = 'rgba(255,255,255,0.9)' }) {
  const lines = [{ dy: -110, len: 130, sp: 0.0, w: 11 }, { dy: -40, len: 180, sp: 0.18, w: 13 }, { dy: 30, len: 110, sp: 0.34, w: 10 }];
  return lines.map((l, i) => {
    const ph = ((t * 3.2 + l.sp * 7) % 1);
    const op = 0.65 * (1 - ph);
    const x = cx - 70 - ph * 80 - l.len;
    return E('div', { key: i, style: { position: 'absolute', left: x, top: cy + l.dy, width: l.len, height: l.w, background: color, borderRadius: 99, opacity: op } });
  });
}
function S3() {
  const { localTime: lt, duration: dur } = useSprite();
  const op = sceneFade(lt, dur, 0.3, 0.3);
  // platforms slide up
  const platTy = interpolate([0, 0.55], [260, 0], Easing.easeOutBack)(lt);
  const pPinkW = 600, pPinkH = pPinkW * (563 / 816);
  const pTealW = 620, pTealH = pTealW * (555 / 852);
  const cannonH = 470, cannonW = cannonH * (709 / 813);
  // runner pack
  const lead = -200 + lt * 470;
  const js = 1.5, je = 2.45;
  const jumping = lt >= js && lt <= je;
  const jp = clamp((lt - js) / (je - js), 0, 1);
  const jumpY = jumping ? -Math.sin(jp * Math.PI) * 250 : 0;
  const groundY = 700;
  const rh = 300;
  const bob = (ph) => Math.sin(lt * 9 + ph) * 9;
  const heroSrc = jumping ? IMG.jump : IMG.run;
  const heroH = jumping ? 300 : 300;
  const heroW = heroH * (jumping ? 596 / 652 : 643 / 732);
  const heroRot = jumping ? interpolate([js, (js + je) / 2, je], [-8, 6, 14], Easing.linear)(lt) : Math.sin(lt * 9) * 3;
  return E('div', { style: { position: 'absolute', inset: 0, opacity: op } },
    // background cannon decor (left)
    E(Img, { src: IMG.cannon, cx: 175, cy: 560, w: cannonW, h: cannonH, opacity: 0.96, z: 1 }),
    // platforms (with a gap in the middle)
    E('div', { style: { position: 'absolute', inset: 0, transform: `translateY(${platTy}px)` } },
      E(Img, { src: IMG.pPink, cx: 330, cy: 880, w: pPinkW, h: pPinkH, z: 2 }),
      E(Img, { src: IMG.pTeal, cx: 1560, cy: 884, w: pTealW, h: pTealH, z: 2 })),
    // runners
    E('div', { style: { position: 'absolute', inset: 0, zIndex: 4 } },
      E(SpeedLines, { cx: lead + 250, cy: groundY - 150 + bob(2), t: lt, color: 'rgba(47,212,196,0.85)' }),
      E(Img, { src: IMG.teal, cx: lead + 250, cy: groundY - 150 + bob(2), w: 300 * (657 / 732), h: 300, rot: Math.sin(lt * 9 + 2) * 3, z: 4 }),
      E(SpeedLines, { cx: lead - 270, cy: groundY - 150 + bob(4), t: lt, color: 'rgba(255,95,162,0.85)' }),
      E(Img, { src: IMG.pink, cx: lead - 270, cy: groundY - 150 + bob(4), w: 300 * (705 / 750), h: 300, rot: Math.sin(lt * 9 + 4) * 3, z: 4 }),
      E(SpeedLines, { cx: lead, cy: groundY - 150 + (jumping ? 0 : bob(0)), t: lt }),
      E(Img, { src: heroSrc, cx: lead, cy: groundY - heroH / 2 + jumpY + (jumping ? 0 : bob(0)), w: heroW, h: heroH, rot: heroRot, z: 6 })));
}

/* ───────────────────────── S4 — pendulum hit ───────────────────────── */
function S4() {
  const { localTime: lt, duration: dur } = useSprite();
  const op = sceneFade(lt, dur, 0.3, 0.3);
  const penW = 820, penH = penW * (650 / 1213);
  const drop = interpolate([0, 0.5], [-340, 0], Easing.easeOutBack)(lt);
  const swing = lt > 0.45 ? Math.sin((lt - 0.45) * 3.0 + Math.PI / 2) * 30 : 30; // starts swung to right
  // victim
  const hitT = 1.05;
  const hit = lt >= hitT;
  const hp = clamp((lt - hitT) / 1.0, 0, 1);
  const victimCx = 640 + (hit ? hp * 720 : 0);
  const victimCy = 600 + (hit ? -hp * 560 : 0);
  const victimRot = hit ? hp * 760 : 0;
  const victimOp = hit ? clamp(1 - (hp - 0.6) / 0.4, 0, 1) : 1;
  const victimSrc = hit ? IMG.gag : IMG.yellow;
  const vW = hit ? 300 * (628 / 584) : 300 * (695 / 714);
  // camera punch on impact
  const punch = hit && hp < 0.18 ? Math.sin((hp / 0.18) * Math.PI) * 0.04 : 0;
  // label shake
  const labelOp = clamp((lt - 0.85) / 0.3, 0, 1);
  const labelPop = interpolate([0.85, 1.2], [0.6, 1], Easing.easeOutBack)(lt);
  const shake = lt > hitT && lt < 2.1 ? Math.sin(lt * 42) * 6 : 0;
  return E('div', { style: { position: 'absolute', inset: 0, opacity: op, transform: `scale(${1 + punch})`, transformOrigin: '50% 45%' } },
    E('div', { style: { position: 'absolute', left: 960 - penW / 2, top: 70 - penH / 2 + drop, width: penW, height: penH, transform: `rotate(${swing}deg)`, transformOrigin: '50% 22%', zIndex: 6 } },
      E('img', { src: IMG.pendulum, draggable: false, style: { width: '100%', height: '100%', filter: 'drop-shadow(0 16px 18px rgba(20,35,59,0.25))' } })),
    E(Img, { src: victimSrc, cx: victimCx, cy: victimCy, w: vW, h: 300, rot: victimRot, opacity: victimOp, z: 5 }),
    E('div', { style: { position: 'absolute', left: 0, right: 0, top: 820, display: 'flex', justifyContent: 'center', opacity: labelOp, transform: `translateX(${shake}px) scale(${labelPop})` } },
      E(Sticker, { size: 138, color: C.yellow, sw: 11 }, '¡ESQUIVA O CAE!')));
}

/* ───────────────────────── S5 — finish + victory ───────────────────────── */
function Confetti({ t, start }) {
  const tb = t - start;
  if (tb < 0) return null;
  const N = 80;
  const pieces = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + (i % 7);
    const sp = 280 + (i % 11) * 70;
    const g = 520;
    const x = 960 + Math.cos(a) * sp * tb;
    const y = 380 + Math.sin(a) * sp * tb * 0.7 + 0.5 * g * tb * tb;
    if (y > 1120) continue;
    const cols = [C.orange, C.teal, C.pink, C.yellow, C.gold, C.white];
    const col = cols[i % cols.length];
    const sz = 14 + (i % 4) * 6;
    const rot = (i * 47 + tb * 600) % 360;
    const op = clamp(1 - tb / 2.4, 0, 1);
    pieces.push(E('div', { key: i, style: { position: 'absolute', left: x, top: y, width: sz, height: sz * 0.5, background: col, borderRadius: 2, transform: `rotate(${rot}deg)`, opacity: op } }));
  }
  return E('div', { style: { position: 'absolute', inset: 0, zIndex: 8 } }, pieces);
}
function S5() {
  const { localTime: lt, duration: dur } = useSprite();
  const op = sceneFade(lt, dur, 0.3, 0.35);
  const arW = 660, arH = arW * (821 / 1041);
  const arCx = interpolate([0, 0.8], [2500, 980], Easing.easeOutCubic)(lt);
  // winner runs through arch
  const winCx = interpolate([0.5, 1.5], [-260, 1010], Easing.easeOutCubic)(lt);
  const winJump = lt > 0.6 && lt < 1.5 ? -Math.sin(clamp((lt - 0.6) / 0.9, 0, 1) * Math.PI) * 120 : 0;
  const winRot = Math.sin(lt * 8) * 4;
  const stampOp = clamp((lt - 1.55) / 0.3, 0, 1);
  const stampPop = interpolate([1.55, 1.95], [0.5, 1], Easing.easeOutBack)(lt);
  const vicOp = clamp((lt - 1.8) / 0.3, 0, 1);
  const vicPop = interpolate([1.8, 2.2], [0.4, 1], Easing.easeOutBack)(lt);
  return E('div', { style: { position: 'absolute', inset: 0, opacity: op } },
    E(Img, { src: IMG.finish, cx: arCx, cy: 590, w: arW, h: arH, z: 3 }),
    E(Img, { src: IMG.win, cx: winCx, cy: 760 + winJump, w: 300 * (610 / 690), h: 300, rot: winRot, z: 5 }),
    E(Confetti, { t: lt, start: 1.45 }),
    E('div', { style: { position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, zIndex: 9 } },
      E('div', { style: { opacity: vicOp, transform: `scale(${vicPop})` } }, E(Sticker, { size: 150, color: C.yellow, sw: 12 }, '¡VICTORIA!')),
      E('div', { style: { opacity: stampOp, transform: `scale(${stampPop})`, background: C.navy, color: C.white, fontFamily: 'ui-monospace, "Roboto Mono", monospace', fontWeight: 700, fontSize: 64, letterSpacing: '2px', padding: '10px 34px', borderRadius: 18, border: `6px solid ${C.gold}`, boxShadow: '0 10px 24px rgba(20,35,59,0.35)', fontVariantNumeric: 'tabular-nums' } }, '00:42.18')));
}

/* ───────────────────────── S6 — CTA, dissolve to loop ───────────────────────── */
function S6() {
  const { localTime: lt, duration: dur } = useSprite();
  // fade content out fully by the end so we return to bare bg (seamless to t=0)
  const cOp = lt < 0.4 ? clamp(lt / 0.4, 0, 1) : clamp((dur - lt) / 0.6, 0, 1);
  const dim = (lt < 0.5 ? clamp(lt / 0.5, 0, 1) : clamp((dur - lt) / 0.6, 0, 1)) * 0.55;
  const logoW = 760, logoH = logoW * (352 / 1355);
  const logoTy = interpolate([0, 0.7], [40, 0], Easing.easeOutBack)(lt);
  const bounce = 1 + Math.sin(lt * 5) * 0.035;
  return E('div', { style: { position: 'absolute', inset: 0 } },
    E('div', { style: { position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${C.sky1}, ${C.sky2})`, opacity: dim } }),
    E('div', { style: { position: 'absolute', inset: 0, opacity: cOp, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26 } },
      E('img', { src: IMG.logo, draggable: false, style: { width: logoW, height: logoH, transform: `translateY(${logoTy}px)`, filter: 'drop-shadow(0 16px 22px rgba(20,35,59,0.30))' } }),
      E('div', { style: { fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 40, color: C.navy, textAlign: 'center', whiteSpace: 'nowrap', textShadow: '0 2px 0 rgba(255,255,255,0.6)' } }, 'Juega gratis en tu navegador'),
      E('div', { style: { transform: `scale(${bounce})`, background: C.orange, color: C.white, fontFamily: DISPLAY, fontWeight: 800, fontSize: 58, letterSpacing: '2px', padding: '14px 70px', borderRadius: 999, border: `7px solid ${C.navy}`, WebkitTextStrokeWidth: '2px', WebkitTextStrokeColor: C.navy, paintOrder: 'stroke fill', boxShadow: '0 12px 0 rgba(20,35,59,0.35)' } }, 'JUGAR'),
      E('div', { style: { fontFamily: 'ui-monospace, "Roboto Mono", monospace', fontWeight: 600, fontSize: 32, color: C.navy, letterSpacing: '1px', marginTop: 4 } }, 'dobbygl.github.io/topadero')));
}

/* ───────────────────────── root ───────────────────────── */
function Ad() {
  return E(Stage, { width: 1920, height: 1080, duration: 15, background: C.sky2, persistKey: 'topadero-ad' },
    E(Background, null),
    E(Sprite, { start: 0.0, end: 2.7 }, E(S1, null)),
    E(Sprite, { start: 2.5, end: 5.1 }, E(S2, null)),
    E(Sprite, { start: 4.9, end: 8.1 }, E(S3, null)),
    E(Sprite, { start: 7.9, end: 10.6 }, E(S4, null)),
    E(Sprite, { start: 10.4, end: 13.1 }, E(S5, null)),
    E(Sprite, { start: 12.9, end: 15.0 }, E(S6, null)));
}

window.Ad = Ad;
if (typeof module !== 'undefined' && module.exports) module.exports = { Ad };
