// render-videos.mjs — rasteriza los anuncios .jsx a MP4 con Chrome headless + ffmpeg.
// No usa el runtime de Claude Design: carga el .jsx (que es JS puro con React.createElement)
// con un React de CDN en un harness propio, simula requestAnimationFrame para avanzar el
// tiempo de forma determinista y captura el canvas fotograma a fotograma.
//
//   npm install          (puppeteer-core; usa el Chrome del sistema)
//   node render-videos.mjs [16x9|9x16]
//
// Salida: renders/<ad>.mp4  (carpeta ignorada por git).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const FPS = 30;
const DURATION = 15;           // s (bucle completo)
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const FONTS = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Fredoka:wght@500;600;700&family=Poppins:wght@500;600;700&family=Roboto+Mono:wght@500;600;700&family=JetBrains+Mono:wght@600;700&display=swap';

const ADS = [
  { key: '16x9', dir: 'topadero-ad-16x9', jsx: 'TopaderoAd.jsx', global: 'Ad', w: 1920, h: 1080, assets: 'uploads/topadero-ad-16x9-assets' },
  { key: '9x16', dir: 'topadero-ad-9x16', jsx: 'topadero-ad.jsx', global: 'TopaderoAd', w: 1080, h: 1920, assets: 'uploads/topadero-ad-9x16-assets' },
];

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.jsx': 'application/javascript', '.mjs': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.json': 'application/json' };

function checkFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (r.error) { console.error('ERROR: ffmpeg no está instalado o no está en PATH.'); process.exit(1); }
}

function loadPuppeteer() {
  try { return require('puppeteer-core'); }
  catch {
    console.error('ERROR: falta puppeteer-core. Ejecuta `npm install` en marketing/animations/.');
    process.exit(1);
  }
}

function harnessHtml(ad, assetUrls) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#0a0a0a}#root{position:fixed;inset:0}</style>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<script>
  try{localStorage.clear()}catch(e){}
  var __q=[];
  window.requestAnimationFrame=function(cb){__q.push(cb);return __q.length;};
  window.cancelAnimationFrame=function(){};
  window.__tick=function(ts){var cbs=__q.splice(0);for(var i=0;i<cbs.length;i++){try{cbs[i](ts)}catch(e){console.error(e)}}};
</script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="./${ad.jsx}"></script>
<script>
  var W=${ad.w}, GLOBAL=${JSON.stringify(ad.global)};
  var ASSETS=${JSON.stringify(assetUrls)};
  window.__canvas=function(){
    var byAttr=document.querySelector('[data-stage-canvas]'); if(byAttr) return byAttr;
    return Array.prototype.find.call(document.querySelectorAll('div'), function(d){
      return d.style && d.style.width===W+'px' && d.style.position==='relative' && /60px/.test(d.style.boxShadow||'');
    });
  };
  window.__ready=(async function(){
    await Promise.all(ASSETS.map(function(u){return new Promise(function(res){var im=new Image();im.onload=res;im.onerror=res;im.src=u;});}));
    if(document.fonts&&document.fonts.ready){try{await document.fonts.ready}catch(e){}}
    var root=ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(window[GLOBAL]));
    await new Promise(function(r){setTimeout(r,250);});
    return true;
  })();
</script>
</head><body><div id="root"></div></body></html>`;
}

function startServer(adDir, ad, assetUrls) {
  const html = harnessHtml(ad, assetUrls);
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/__render.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); return; }
    if (urlPath === '/') urlPath = '/index.html';
    const fp = path.join(adDir, urlPath);
    if (!fp.startsWith(adDir) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function renderAd(puppeteer, ad) {
  const adDir = path.join(__dirname, ad.dir);
  const assetsDir = path.join(adDir, ad.assets);
  const assetUrls = fs.readdirSync(assetsDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).map(f => `${ad.assets}/${f}`);
  const server = await startServer(adDir, ad, assetUrls);
  const port = server.address().port;

  const outDir = path.join(__dirname, 'renders');
  fs.mkdirSync(outDir, { recursive: true });
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), `topadero-${ad.key}-`));

  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: ad.w, height: ad.h + 60, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.warn('  [page error]', e.message));
    await page.goto(`http://127.0.0.1:${port}/__render.html`, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => window.__ready);

    const clip = await page.evaluate(() => {
      const el = window.__canvas();
      if (!el) throw new Error('no se encontró el canvas de la animación');
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
    });

    const N = FPS * DURATION;
    const stepMs = 1000 / FPS;
    const flush = () => page.evaluate(() => new Promise(r => setTimeout(r, 0)));
    await page.evaluate(t => window.__tick(t), 0); // prime lastTs (time queda en 0)
    await flush();
    process.stdout.write(`  ${ad.key}: capturando ${N} fotogramas `);
    for (let f = 0; f < N; f++) {
      await page.screenshot({ path: path.join(framesDir, String(f).padStart(5, '0') + '.png'), clip, type: 'png', optimizeForSpeed: true });
      await page.evaluate(t => window.__tick(t), (f + 1) * stepMs);
      await flush();
      if (f % 60 === 0) process.stdout.write('.');
    }
    process.stdout.write(' ok\n');
  } finally {
    await browser.close();
    server.close();
  }

  const out = path.join(outDir, `${ad.dir}.mp4`);
  console.log(`  ${ad.key}: ffmpeg -> renders/${ad.dir}.mp4`);
  const ff = spawnSync('ffmpeg', [
    '-y', '-framerate', String(FPS), '-i', path.join(framesDir, '%05d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  fs.rmSync(framesDir, { recursive: true, force: true });
  if (ff.status !== 0) { console.error(`  ${ad.key}: ffmpeg falló`); return null; }
  const mb = (fs.statSync(out).size / 1048576).toFixed(1);
  console.log(`  ${ad.key}: listo (${mb} MB, ${ad.w}x${ad.h}, ${DURATION}s @ ${FPS}fps)`);
  return out;
}

async function main() {
  checkFfmpeg();
  const puppeteer = loadPuppeteer();
  const only = process.argv[2];
  const ads = only ? ADS.filter(a => a.key === only) : ADS;
  if (only && !ads.length) { console.error(`Anuncio desconocido: ${only} (usa 16x9 o 9x16)`); process.exit(1); }
  console.log(`Renderizando ${ads.length} anuncio(s) a ${FPS}fps...`);
  for (const ad of ads) await renderAd(puppeteer, ad);
  console.log('Hecho. MP4 en marketing/animations/renders/ (no versionado).');
}

main().catch(e => { console.error(e); process.exit(1); });
