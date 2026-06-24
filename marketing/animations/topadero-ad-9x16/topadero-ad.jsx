// TOPADERO — vertical 9:16 looping ad. Self-contained: timeline engine + scenes.
// Mounted by Topadero Ad.dc.html via <x-import component="TopaderoAd">.
// Uses window.React (injected). No imports.

// ────────────────────────────────────────────────────────────── engine
const Easing = {
  linear: t => t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInCubic: t => t * t * t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeOutBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  easeOutElastic: t => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0; if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function interpolate(input, output, ease = Easing.linear) {
  return t => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const e = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        return output[i] + (output[i + 1] - output[i]) * e(local);
      }
    }
    return output[output.length - 1];
  };
}

const TimelineContext = React.createContext({ time: 0, duration: 15 });
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
  const value = { localTime, progress, duration };
  return React.createElement(SpriteContext.Provider, { value },
    typeof children === 'function' ? children(value) : children);
}

// fade-in / fade-out opacity helper
function fade(lt, dur, inDur, outDur) {
  let o = 1;
  if (lt < inDur) o = clamp(lt / inDur, 0, 1);
  const os = dur - outDur;
  if (lt > os) o = Math.min(o, clamp(1 - (lt - os) / outDur, 0, 1));
  return o;
}

// ────────────────────────────────────────────────────────────── assets
const A = 'uploads/topadero-ad-9x16-assets/';
const ASPECT = { // width / height
  logo: 3.849, 'mascot-wave': 0.893, 'mascot-run': 0.878, 'mascot-jump': 0.914,
  'mascot-gag': 1.075, 'mascot-win': 0.884, 'blob-pink': 0.94, 'blob-teal': 0.898,
  'blob-yellow': 0.973, 'platform-teal': 1.535, 'platform-pink': 1.449, ramp: 1.054,
  pendulum: 1.866, finish: 1.268,
};

function AbsImg({ name, w, x, y, tx = 0, ty = 0, rot = 0, sx = 1, sy = 1, opacity = 1, z = 0, origin = 'center', shadow = true }) {
  const h = w / ASPECT[name];
  return React.createElement('img', {
    src: A + name + '.png', draggable: false, alt: '',
    style: {
      position: 'absolute', left: x, top: y, width: w, height: h,
      transform: `translate(-50%,-50%) translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${sx},${sy})`,
      transformOrigin: origin, opacity, zIndex: z, willChange: 'transform, opacity',
      filter: shadow ? 'drop-shadow(0 18px 16px rgba(20,35,59,0.28))' : 'none',
    },
  });
}

const NAVY = '#14233B';
function Candy({ text, x, y, size, color = '#fff', stroke, opacity = 1, tx = 0, ty = 0, rot = 0, sx = 1, sy = 1, weight = 700, font = 'Fredoka', z = 6, letter = '0.01em', shadow = true }) {
  const st = stroke == null ? Math.round(size * 0.085) : stroke;
  return React.createElement('div', {
    style: {
      position: 'absolute', left: x, top: y,
      transform: `translate(-50%,-50%) translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${sx},${sy})`,
      opacity, fontFamily: font + ', system-ui, sans-serif', fontWeight: weight, fontSize: size,
      color, WebkitTextStrokeWidth: st + 'px', WebkitTextStrokeColor: NAVY, paintOrder: 'stroke',
      textShadow: shadow ? '0 7px 0 rgba(20,35,59,0.20)' : 'none', letterSpacing: letter,
      whiteSpace: 'nowrap', lineHeight: 1.04, textAlign: 'center', zIndex: z, willChange: 'transform, opacity',
    },
  }, text);
}

// ────────────────────────────────────────────────────────────── background
function BgLayer() {
  const t = useTime();
  const ph = (t / 15) * Math.PI * 2;
  const ty = Math.sin(ph) * 26;
  const scale = 1.1 + Math.cos(ph) * 0.025;
  return React.createElement('div', {
    style: {
      position: 'absolute', inset: 0,
      backgroundImage: `url(${A}bg-vertical.png)`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      transform: `translateY(${ty}px) scale(${scale})`,
      willChange: 'transform', zIndex: 0,
    },
  });
}

// soft top/bottom safe-zone scrims to anchor text and respect Reels UI
function Scrims() {
  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, top: 0, height: 360, background: 'linear-gradient(rgba(126,200,243,0.55), rgba(126,200,243,0))', zIndex: 1, pointerEvents: 'none' } }),
    React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 520, background: 'linear-gradient(rgba(191,230,255,0), rgba(150,210,250,0.5))', zIndex: 1, pointerEvents: 'none' } }),
  );
}

// ────────────────────────────────────────────────────────────── S1 logo + tagline
function S1() {
  return React.createElement(Sprite, { start: 0, end: 2.3 }, ({ localTime, duration }) => {
    const inT = Easing.easeOutBack(clamp(localTime / 0.85, 0, 1));
    const scale = 0.4 + 0.6 * inT;
    const bob = Math.sin(localTime * 3.0) * 7;
    const op = fade(localTime, duration, 0.2, 0.4);
    const tagP = Easing.easeOutBack(clamp((localTime - 0.5) / 0.55, 0, 1));
    return React.createElement('div', { style: { position: 'absolute', inset: 0, zIndex: 5 } },
      React.createElement(AbsImg, { name: 'logo', w: 920, x: 540, y: 520, sx: scale, sy: scale, ty: bob, opacity: op, z: 5 }),
      React.createElement(Candy, { text: 'Corre. Salta. Sobrevive.', x: 540, y: 760, size: 70, color: '#FFD23F', opacity: op * tagP, ty: (1 - tagP) * 36 }),
    );
  });
}

// ────────────────────────────────────────────────────────────── S2 wave
function S2() {
  return React.createElement(Sprite, { start: 2.0, end: 4.7 }, ({ localTime, duration }) => {
    const op = fade(localTime, duration, 0.05, 0.4);
    // drop-in with squash landing
    const dropP = Easing.easeOutBack(clamp(localTime / 0.6, 0, 1));
    const dropY = (1 - dropP) * -360;
    // landing squash pulse around t=0.6, then idle bob
    const idle = Math.max(0, localTime - 0.6);
    const bob = Math.sin(idle * 3.4) * 14;
    const landSquash = localTime > 0.5 && localTime < 0.78 ? (0.78 - localTime) / 0.28 : 0;
    const sy = 1 - landSquash * 0.18 + Math.sin(idle * 3.4) * 0.015;
    const sx = 1 + landSquash * 0.16 - Math.sin(idle * 3.4) * 0.015;
    const wave = Math.sin(idle * 6) * 7; // wave wiggle
    return React.createElement('div', { style: { position: 'absolute', inset: 0, zIndex: 5 } },
      React.createElement(AbsImg, { name: 'mascot-wave', w: 520, x: 540, y: 980, ty: dropY + bob, sx, sy, rot: wave, opacity: op, z: 5, origin: 'center bottom' }),
      React.createElement(Candy, { text: '¡Únete a la fiesta!', x: 540, y: 640, size: 56, color: '#FF5FA2', opacity: op * clamp((localTime - 0.7) / 0.5, 0, 1) }),
    );
  });
}

// ────────────────────────────────────────────────────────────── S3 climb
const S3_PLATFORMS = [
  { name: 'platform-pink', x: 430, y: 1640, w: 540 },
  { name: 'platform-teal', x: 690, y: 1150, w: 500 },
  { name: 'ramp', x: 440, y: 600, w: 560 },
  { name: 'platform-pink', x: 660, y: 70, w: 500 },
  { name: 'platform-teal', x: 400, y: -440, w: 500 },
];
function SpeedLines() {
  const { localTime } = useSprite();
  const lines = React.useMemo(() => Array.from({ length: 18 }, () => ({
    x: Math.random() * 1080, len: 120 + Math.random() * 200, w: 3 + Math.random() * 5,
    sp: 1000 + Math.random() * 800, off: Math.random() * 2200, op: 0.1 + Math.random() * 0.22,
  })), []);
  return React.createElement(React.Fragment, null, lines.map((l, i) => {
    const y = ((localTime * l.sp + l.off) % (1920 + l.len)) - l.len;
    return React.createElement('div', { key: i, style: {
      position: 'absolute', left: l.x, top: y, width: l.w, height: l.len,
      background: `linear-gradient(rgba(255,255,255,0), rgba(255,255,255,${l.op}))`,
      borderRadius: l.w, zIndex: 3,
    } });
  }));
}
function S3() {
  return React.createElement(Sprite, { start: 4.5, end: 8.05 }, ({ localTime, duration }) => {
    const op = fade(localTime, duration, 0.3, 0.4);
    const scroll = localTime * 215;
    // mascot hop arcs
    const P = 0.82, phase = (localTime % P) / P, hop = Math.sin(phase * Math.PI), lift = hop * 250;
    const grounded = hop < 0.12;
    const sy = grounded ? 0.84 : 1.05, sx = grounded ? 1.13 : 0.96;
    const img = lift > 70 ? 'mascot-jump' : 'mascot-run';
    const mx = 540 + Math.sin(localTime * 2.3) * 36;
    const my = 1090 - lift;
    const rot = Math.sin(localTime * 4) * 5;
    return React.createElement('div', { style: { position: 'absolute', inset: 0, zIndex: 4, opacity: op } },
      // scrolling platform world
      ...S3_PLATFORMS.map((p, i) =>
        React.createElement(AbsImg, { key: i, name: p.name, w: p.w, x: p.x, y: p.y + scroll, z: 2 })),
      // accompanying blobs
      React.createElement(AbsImg, { name: 'blob-teal', w: 190, x: 250, y: 1180 - Math.abs(Math.sin((localTime + 0.3) * 3.6)) * 150, sx: 0.95, sy: 1.05, z: 3 }),
      React.createElement(AbsImg, { name: 'blob-pink', w: 200, x: 850, y: 1220 - Math.abs(Math.sin((localTime + 0.6) * 3.6)) * 170, sx: 0.95, sy: 1.05, z: 3 }),
      // speed lines
      React.createElement(SpeedLines, null),
      // hero
      React.createElement(AbsImg, { name: img, w: 380, x: mx, y: my, sx, sy, rot, z: 5, origin: 'center bottom' }),
    );
  });
}

// ────────────────────────────────────────────────────────────── S4 pendulum
function S4() {
  return React.createElement(Sprite, { start: 8.0, end: 10.55 }, ({ localTime, duration }) => {
    const op = fade(localTime, duration, 0.25, 0.4);
    const angle = 36 * Math.sin(localTime * 2.5 + 0.6);
    const impact = 1.0;
    const hit = localTime >= impact;
    // label shake
    const labelIn = Easing.easeOutBack(clamp((localTime - 0.15) / 0.5, 0, 1));
    const shake = localTime < 1.4 ? Math.sin(localTime * 40) * (1.4 - localTime) * 4 : 0;
    // gag launch
    const gp = clamp((localTime - impact) / 1.3, 0, 1);
    const gx = 540 + gp * 360, gy = 700 - Math.sin(gp * Math.PI) * 360 + gp * 220;
    const grot = gp * 520, gop = (1 - clamp((gp - 0.7) / 0.3, 0, 1));
    // impact ring
    const ringP = clamp((localTime - impact) / 0.35, 0, 1);
    return React.createElement('div', { style: { position: 'absolute', inset: 0, zIndex: 5, opacity: op } },
      // pendulum (pivot near top of image)
      React.createElement('img', { src: A + 'pendulum.png', alt: '', draggable: false, style: {
        position: 'absolute', left: 540, top: 210, width: 760, height: 760 / ASPECT.pendulum,
        transform: `translateX(-50%) rotate(${angle}deg)`, transformOrigin: '50% 24%',
        filter: 'drop-shadow(0 18px 16px rgba(20,35,59,0.28))', zIndex: 4, willChange: 'transform',
      } }),
      // target blob before impact
      !hit && React.createElement(AbsImg, { name: 'blob-yellow', w: 220, x: 540, y: 705, sx: 1 + Math.sin(localTime * 5) * 0.03, sy: 1 - Math.sin(localTime * 5) * 0.03, z: 3 }),
      // impact ring
      hit && ringP < 1 && React.createElement('div', { style: {
        position: 'absolute', left: 540, top: 705, width: 60 + ringP * 360, height: 60 + ringP * 360,
        transform: 'translate(-50%,-50%)', border: `${14 - ringP * 10}px solid #fff`, borderRadius: '50%',
        opacity: (1 - ringP) * 0.9, zIndex: 5,
      } }),
      // gag flying off
      hit && React.createElement(AbsImg, { name: 'mascot-gag', w: 300, x: gx, y: gy, rot: grot, opacity: gop, z: 5 }),
      // label
      React.createElement(Candy, { text: '¡ESQUIVA O CAE!', x: 540, y: 1310, size: 116, color: '#FFD23F', opacity: op * labelIn, rot: shake, sx: 0.8 + labelIn * 0.2, sy: 0.8 + labelIn * 0.2 }),
    );
  });
}

// ────────────────────────────────────────────────────────────── S5 victory
function Confetti() {
  const { localTime, duration } = useSprite();
  const pieces = React.useMemo(() => {
    const cols = ['#FF7A1A', '#2FD4C4', '#FF5FA2', '#FFD23F', '#ffffff', '#D4AF37'];
    return Array.from({ length: 80 }, () => ({
      x: Math.random() * 1080, col: cols[(Math.random() * cols.length) | 0],
      size: 12 + Math.random() * 18, delay: Math.random() * 0.5, dur: 1.6 + Math.random() * 1.0,
      drift: (Math.random() - 0.5) * 260, rot0: Math.random() * 360, rspd: (Math.random() - 0.5) * 900,
      round: Math.random() > 0.5,
    }));
  }, []);
  const sceneFade = fade(localTime, duration, 0.05, 0.4);
  return React.createElement(React.Fragment, null, pieces.map((p, i) => {
    const pr = clamp((localTime - p.delay) / p.dur, 0, 1);
    if (pr <= 0) return null;
    const y = -40 + pr * 2000;
    const x = p.x + p.drift * pr;
    const rot = p.rot0 + p.rspd * localTime;
    return React.createElement('div', { key: i, style: {
      position: 'absolute', left: x, top: y, width: p.size, height: p.size * (p.round ? 1 : 0.55),
      background: p.col, borderRadius: p.round ? '50%' : 2,
      transform: `translate(-50%,-50%) rotate(${rot}deg)`, opacity: sceneFade, zIndex: 7,
    } });
  }));
}
function S5() {
  return React.createElement(Sprite, { start: 10.5, end: 13.05 }, ({ localTime, duration }) => {
    const op = fade(localTime, duration, 0.05, 0.4);
    const archP = Easing.easeOutBack(clamp(localTime / 0.7, 0, 1));
    const archY = (1 - archP) * -260;
    const winP = Easing.easeOutBack(clamp((localTime - 0.3) / 0.7, 0, 1));
    const winY = (1 - winP) * 420;
    const cel = Math.max(0, localTime - 1.0);
    const winBob = Math.sin(cel * 5) * 16;
    const winScale = 1 + Math.sin(cel * 5) * 0.03;
    const chronoP = clamp((localTime - 0.5) / 0.4, 0, 1);
    const vicP = Easing.easeOutBack(clamp((localTime - 0.9) / 0.6, 0, 1));
    return React.createElement('div', { style: { position: 'absolute', inset: 0, zIndex: 5, opacity: op } },
      React.createElement(Confetti, null),
      React.createElement(AbsImg, { name: 'finish', w: 780, x: 540, y: 420, ty: archY, opacity: archP, z: 4 }),
      React.createElement(Candy, { text: '00:42.18', x: 540, y: 700, size: 92, color: '#fff', font: 'JetBrains Mono', weight: 700, letter: '0.02em', opacity: chronoP, ty: (1 - chronoP) * 20, stroke: 7 }),
      React.createElement(AbsImg, { name: 'mascot-win', w: 430, x: 540, y: 1010, ty: winY + winBob, sx: winScale, sy: winScale, z: 5, origin: 'center bottom' }),
      React.createElement(Candy, { text: '¡VICTORIA!', x: 540, y: 1290, size: 132, color: '#FFD23F', opacity: vicP, sx: 0.7 + vicP * 0.3, sy: 0.7 + vicP * 0.3 }),
    );
  });
}

// ────────────────────────────────────────────────────────────── S6 CTA
function S6() {
  return React.createElement(Sprite, { start: 13.0, end: 15.0 }, ({ localTime, duration }) => {
    const op = fade(localTime, duration, 0.45, 0.45);
    const logoP = Easing.easeOutBack(clamp(localTime / 0.6, 0, 1));
    const subP = clamp((localTime - 0.35) / 0.45, 0, 1);
    const btnP = Easing.easeOutBack(clamp((localTime - 0.55) / 0.6, 0, 1));
    const pulse = 1 + Math.sin(Math.max(0, localTime - 0.9) * 4.2) * 0.04;
    return React.createElement('div', { style: { position: 'absolute', inset: 0, zIndex: 6, opacity: op } },
      React.createElement(AbsImg, { name: 'logo', w: 860, x: 540, y: 600, sx: 0.5 + logoP * 0.5, sy: 0.5 + logoP * 0.5, z: 6 }),
      React.createElement(Candy, { text: 'Juega gratis en tu navegador', x: 540, y: 820, size: 52, color: '#fff', stroke: 5, opacity: subP, ty: (1 - subP) * 24, font: 'Fredoka', weight: 600 }),
      // JUGAR pill button
      React.createElement('div', { style: {
        position: 'absolute', left: 540, top: 1300, transform: `translate(-50%,-50%) scale(${(0.6 + btnP * 0.4) * pulse})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 620, height: 196, borderRadius: 110,
        background: 'linear-gradient(180deg, #FFD23F 0%, #FF7A1A 100%)',
        border: '12px solid #fff', boxShadow: '0 22px 0 rgba(20,35,59,0.22), 0 30px 40px rgba(20,35,59,0.3)',
        opacity: btnP, zIndex: 7, willChange: 'transform',
      } },
        React.createElement('span', { style: {
          fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 104, color: '#fff',
          WebkitTextStrokeWidth: '8px', WebkitTextStrokeColor: NAVY, paintOrder: 'stroke',
          letterSpacing: '0.04em', lineHeight: 1,
        } }, 'JUGAR'),
      ),
      React.createElement(Candy, { text: 'dobbygl.github.io/topadero', x: 540, y: 1460, size: 44, color: '#fff', stroke: 4, opacity: clamp((localTime - 0.8) / 0.5, 0, 1), font: 'Fredoka', weight: 600 }),
    );
  });
}

// ────────────────────────────────────────────────────────────── Stage
function Stage({ width, height, duration, children }) {
  const persistKey = 'topadero-ad';
  const [time, setTime] = React.useState(() => {
    try { const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0'); return isFinite(v) ? clamp(v, 0, duration) : 0; } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(true);
  const [scale, setScale] = React.useState(1);
  const stageRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  React.useEffect(() => { try { localStorage.setItem(persistKey + ':t', String(time)); } catch {} }, [time]);

  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 46;
      const s = Math.min(el.clientWidth / width, (el.clientHeight - barH) / height);
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [width, height]);

  React.useEffect(() => {
    if (!playing) { lastTsRef.current = null; return; }
    const step = ts => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000; lastTsRef.current = ts;
      setTime(t => { let n = t + dt; if (n >= duration) n = n % duration; return n; });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTsRef.current = null; };
  }, [playing, duration]);

  React.useEffect(() => {
    const onKey = e => {
      if (e.code === 'Space') { e.preventDefault(); setPlaying(p => !p); }
      else if (e.code === 'ArrowLeft') setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      else if (e.code === 'ArrowRight') setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      else if (e.key === '0') setTime(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  const pct = (time / duration) * 100;
  const fmt = t => { const s = Math.floor(t % 60), cs = Math.floor((t * 100) % 100); return `0:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`; };

  return React.createElement('div', { ref: stageRef, style: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: '#0a0a0a', fontFamily: 'Poppins, system-ui, sans-serif',
  } },
    React.createElement('div', { style: { flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0 } },
      React.createElement('div', { 'data-stage-canvas': '1', style: {
        width, height, background: 'linear-gradient(#7EC8F3, #BFE6FF)', position: 'relative',
        transform: `scale(${scale})`, transformOrigin: 'center', flexShrink: 0, overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      } },
        React.createElement(TimelineContext.Provider, { value: { time, duration } }, children),
      ),
    ),
    // playback bar
    React.createElement('div', { 'data-chrome': '1', style: {
      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', width: '100%', maxWidth: 680,
      background: 'rgba(20,20,20,0.92)', borderRadius: 8, color: '#fff', flexShrink: 0,
    } },
      React.createElement('button', { onClick: () => setTime(0), style: btnStyle, title: 'Reset (0)' }, '⏮'),
      React.createElement('button', { onClick: () => setPlaying(p => !p), style: btnStyle, title: 'Play/Pause (space)' }, playing ? '❚❚' : '▶'),
      React.createElement('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 12, width: 60, textAlign: 'right' } }, fmt(time)),
      React.createElement('div', {
        onClick: e => { const r = e.currentTarget.getBoundingClientRect(); setTime(clamp((e.clientX - r.left) / r.width, 0, 1) * duration); },
        style: { flex: 1, height: 22, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' },
      },
        React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 } }),
        React.createElement('div', { style: { position: 'absolute', left: 0, width: pct + '%', height: 4, background: '#FF7A1A', borderRadius: 2 } }),
        React.createElement('div', { style: { position: 'absolute', left: pct + '%', width: 12, height: 12, marginLeft: -6, background: '#fff', borderRadius: 6 } }),
      ),
      React.createElement('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 12, width: 60, color: 'rgba(255,255,255,0.5)' } }, fmt(duration)),
    ),
  );
}
const btnStyle = { width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12 };

// ────────────────────────────────────────────────────────────── root
function TopaderoAd() {
  return React.createElement(Stage, { width: 1080, height: 1920, duration: 15 },
    React.createElement(BgLayer, null),
    React.createElement(Scrims, null),
    React.createElement(S1, null),
    React.createElement(S2, null),
    React.createElement(S3, null),
    React.createElement(S4, null),
    React.createElement(S5, null),
    React.createElement(S6, null),
  );
}

window.TopaderoAd = TopaderoAd;
if (typeof module !== 'undefined') module.exports = { TopaderoAd };
