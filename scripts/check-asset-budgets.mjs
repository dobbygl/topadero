// Comprobador de presupuestos de assets (008 · US2, T014). Corre en `npm run build` tras `vite build`
// y SALE != 0 si algún asset o el total exceden su presupuesto (clarify: el build FALLA). Node puro,
// sin dependencias. Extiende el prototipo de conteo de triángulos del GLB.
//
// Hace cumplir (build gate): bytes por fichero, triángulos por malla (GLB), bytes de cada imagen
// embebida en GLB, peso TOTAL de dist/, y que ningún asset bajo assets//audio/ quede sin clasificar.
// NO comprueba: resolución de textura (la garantiza el optimizador, sharp fit:inside <=1024) ni
// `sceneMaxTriangles` (escena procedural → QA manual). Ver contracts/asset-budgets.md.
//
// Nota audio dual: dist/ publica mp3 + ogg de cada pista pero el navegador baja solo uno; el total
// los cuenta ambos, así que SOBREESTIMA la descarga real (conservador).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const KIB = 1024
const kb = (n) => (n / KIB).toFixed(0) + ' KB'
const mb = (n) => (n / (KIB * KIB)).toFixed(2) + ' MB'

// Extensiones de asset de JUEGO sujetas a presupuesto. El bundle de Vite (que también vive en
// dist/assets/: index-*.js/.css) y los iconos PWA NO son assets de juego: cuentan al total pero no se
// exigen clasificados (si no, el bundle .js bajo assets/ fallaría el gate en falso).
const GAME_ASSET_EXT = /\.(glb|gltf|webp|png|jpe?g|ktx2|mp3|ogg|wav|m4a)$/i

/** glob simple (un `*` casa dentro de un segmento) → RegExp anclado. */
export function globToRegExp(glob) {
  const esc = glob.split('*').map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')).join('[^/]*')
  return new RegExp('^' + esc + '$')
}

/** Categoría que casa `relPath` (POSIX, relativo a dist/), o null. */
export function classify(relPath, categories) {
  return categories.find((c) => c.match.some((g) => globToRegExp(g).test(relPath))) ?? null
}

/**
 * Evalúa los items contra el manifest. PURA (testeable, T015).
 * items: [{ path, bytes, triangles?, embeddedImageBytes?: number[] }]
 * Devuelve { rows, totalBytes, problems, exitCode }.
 */
export function evaluate(items, manifest) {
  const rows = []
  const problems = []
  let totalBytes = 0
  // El audio se publica en mp3 + ogg, pero el navegador descarga UN formato del par: para el TOTAL
  // se cuenta solo el mayor de cada par (descarga real). El presupuesto POR fichero sí aplica a cada uno.
  const audioMax = new Map() // stem → bytes del mayor del par
  for (const it of items) {
    const isAudioPair = it.path.startsWith('audio/') && /\.(mp3|ogg)$/i.test(it.path)
    if (isAudioPair) {
      const stem = it.path.replace(/\.(mp3|ogg)$/i, '')
      audioMax.set(stem, Math.max(audioMax.get(stem) ?? 0, it.bytes))
    } else {
      totalBytes += it.bytes
    }
    const inAssetDir = it.path.startsWith('assets/') || it.path.startsWith('audio/')
    const isGameAsset = inAssetDir && GAME_ASSET_EXT.test(it.path)
    const cat = classify(it.path, manifest.categories)
    if (!cat) {
      // Un asset de juego (glb/webp/audio…) bajo assets//audio/ sin categoría = algo escapó al
      // presupuesto → error. El bundle (index.html, *.js/.css, iconos, sw.js, manifest) solo cuenta al total.
      if (isGameAsset) {
        problems.push(`unclassified: ${it.path} (asset de juego sin categoría en el manifest)`)
        rows.push({ path: it.path, category: '—', status: 'unclassified', bytes: it.bytes })
      } else {
        rows.push({ path: it.path, category: 'bundle', status: 'ok', bytes: it.bytes })
      }
      continue
    }
    let status = 'ok'
    if (cat.maxBytesPerFile != null && it.bytes > cat.maxBytesPerFile) {
      status = 'over-size'
      problems.push(`over-size: ${it.path} ${kb(it.bytes)} > ${kb(cat.maxBytesPerFile)}`)
    }
    if (cat.maxTrianglesPerMesh != null && it.triangles != null && it.triangles > cat.maxTrianglesPerMesh) {
      status = 'over-triangles'
      problems.push(`over-triangles: ${it.path} ${it.triangles} > ${cat.maxTrianglesPerMesh}`)
    }
    if (cat.maxEmbeddedImageBytes != null && it.embeddedImageBytes?.length) {
      const worst = Math.max(...it.embeddedImageBytes)
      if (worst > cat.maxEmbeddedImageBytes) {
        status = 'over-embedded-image'
        problems.push(`over-embedded-image: ${it.path} ${kb(worst)} > ${kb(cat.maxEmbeddedImageBytes)}`)
      }
    }
    rows.push({ path: it.path, category: cat.id, status, bytes: it.bytes, triangles: it.triangles })
  }
  for (const b of audioMax.values()) totalBytes += b // sumar un solo formato por pista de audio
  if (totalBytes > manifest.totalMaxBytes) {
    problems.push(`over-total: ${mb(totalBytes)} > ${mb(manifest.totalMaxBytes)}`)
  }
  return { rows, totalBytes, problems, exitCode: problems.length ? 1 : 0 }
}

// --- CLI: mide dist/ y aplica el gate ---

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

/** Parseo del chunk JSON del GLB: triángulos + bytes de cada imagen embebida (bufferView). */
function glbStats(path) {
  const buf = readFileSync(path)
  if (buf.readUInt32LE(0) !== 0x46546c67) return { triangles: 0, embeddedImageBytes: [] }
  let off = 12
  let json = null
  while (off < buf.length) {
    const len = buf.readUInt32LE(off)
    const type = buf.readUInt32LE(off + 4)
    if (type === 0x4e4f534a) { json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8')); break }
    off += 8 + len
  }
  if (!json) return { triangles: 0, embeddedImageBytes: [] }
  let triangles = 0
  for (const m of json.meshes ?? []) {
    for (const p of m.primitives ?? []) {
      if ((p.mode ?? 4) !== 4) continue
      const idx = p.indices !== undefined ? p.indices : p.attributes?.POSITION
      if (idx !== undefined) triangles += Math.floor(json.accessors[idx].count / 3)
    }
  }
  const embeddedImageBytes = []
  for (const img of json.images ?? []) {
    if (img.bufferView !== undefined) embeddedImageBytes.push(json.bufferViews[img.bufferView].byteLength)
  }
  return { triangles, embeddedImageBytes }
}

function main() {
  const dist = 'dist'
  if (!existsSync(dist)) {
    console.error('check-asset-budgets: no existe dist/. Ejecuta `vite build` primero.')
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync('asset-budgets.json', 'utf8'))
  const items = walk(dist).map((p) => {
    const rel = relative(dist, p).split(sep).join('/')
    const bytes = statSync(p).size
    if (rel.endsWith('.glb')) {
      const g = glbStats(p)
      return { path: rel, bytes, triangles: g.triangles, embeddedImageBytes: g.embeddedImageBytes }
    }
    return { path: rel, bytes }
  })

  const { rows, totalBytes, problems, exitCode } = evaluate(items, manifest)

  // Resumen: assets clasificados (omitir el ruido del bundle salvo el total).
  console.log('Presupuestos de assets:')
  for (const r of rows.filter((r) => r.category !== 'bundle')) {
    const extra = r.triangles != null ? ` · ${r.triangles} tris` : ''
    const flag = r.status === 'ok' ? 'ok' : `✗ ${r.status}`
    console.log(`  [${flag}] ${r.path.padEnd(28)} ${kb(r.bytes).padStart(9)}${extra}`)
  }
  console.log(`  Total descarga (bundle + assets; audio: 1 formato/pista): ${mb(totalBytes)} / ${mb(manifest.totalMaxBytes)}`)

  if (problems.length) {
    console.error('\nPRESUPUESTO EXCEDIDO (el build FALLA):')
    for (const p of problems) console.error('  ✗ ' + p)
    process.exit(1)
  }
  console.log('\nTodos los presupuestos dentro de límite. ✅')
  process.exit(exitCode)
}

// Ejecutar solo como CLI (no al importar para los tests).
if (import.meta.url === `file://${process.argv[1]}`) main()
