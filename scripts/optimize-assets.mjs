// Pipeline de optimización de assets (008 · US2, T011). OFFLINE: se ejecuta a mano con
// `npm run assets:optimize` cuando cambian los assets fuente, NO en cada build (research R3).
//
// Entradas: assets-src/ (originales pesados, no servido). Salidas: public/assets/ (SOLO lo
// referenciado y optimizado, mismas rutas de runtime). Así "el build no publica peso muerto"
// (FR-010) queda garantizado por construcción: los *_base_color.png y arrow.png NO se emiten.
//
// Texturas embebidas en GLB → WebP 1024² (three r163+ las decodifica vía EXT_texture_webp, research
// R1). Geometría: solo se DECIMA el péndulo (~20k → <=12k); el resto no se toca. Mallas riggeadas
// (player-rigged) NUNCA se simplifican (rompería el skinning, U1): solo se les recodifica la textura.
// Texturas standalone (sky, tex-*, sign-finish) → WebP <=1024² como ficheros sueltos.

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { textureCompress, simplify, prune, dedup } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { writeFileSync, mkdirSync, statSync } from 'node:fs'

// IMPRESCINDIBLE registrar las extensiones: sin esto, EXT_texture_webp NO se serializa (el GLB
// quedaría con imágenes webp sin declarar la extensión = glTF inválido que three no carga) y se
// perderían KHR_materials_ior/specular del original. Un IO reutilizable para todos los GLB.
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

const SRC = 'assets-src'
const OUT = 'public/assets'
const MAX_TEX = 1024 // lado máximo de textura (clarify)

// GLBs referenciados (src/render/assets.ts + circuit.ts). `simplify`: solo el péndulo. NUNCA mallas
// riggeadas (player-rigged) ni el resto (ya bajo techo).
const GLBS = [
  { file: 'mascot.glb' },
  { file: 'player-rigged.glb', rigged: true },
  { file: 'prop-balloon.glb' },
  { file: 'prop-pinwheel.glb' },
  { file: 'obstacle-carry.glb' },
  { file: 'obstacle-oscillate.glb' },
  { file: 'obstacle-pendulum.glb', simplifyRatio: 0.5 }, // ~20k → ~10k (<=12k con margen)
  { file: 'obstacle-pusher.glb' },
  { file: 'obstacle-rotatebar.glb' },
]

// Texturas standalone referenciadas (theme/signage). Pasan a .webp; los refs se actualizan en T012.
const TEXTURES = ['sky.png', 'sign-finish.png', 'tex-platform.png', 'tex-ramp.png', 'tex-wall.png']

const kb = (n) => (n / 1024).toFixed(0) + ' KB'

async function optimizeGlb(spec) {
  const doc = await io.read(`${SRC}/${spec.file}`)

  const transforms = [
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [MAX_TEX, MAX_TEX] }),
  ]
  if (spec.simplifyRatio && !spec.rigged) {
    await MeshoptSimplifier.ready
    transforms.push(simplify({ simplifier: MeshoptSimplifier, ratio: spec.simplifyRatio, error: 0.01 }))
  }
  transforms.push(prune())

  await doc.transform(...transforms)
  const glb = await io.writeBinary(doc)
  writeFileSync(`${OUT}/${spec.file}`, glb)
  return glb.byteLength
}

async function optimizeTexture(file) {
  const out = file.replace(/\.(png|jpe?g)$/i, '.webp')
  await sharp(`${SRC}/${file}`)
    .resize(MAX_TEX, MAX_TEX, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(`${OUT}/${out}`)
  return { out, bytes: statSync(`${OUT}/${out}`).size }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  console.log('Optimizando GLBs (textura→WebP 1024², péndulo decimado)...')
  for (const spec of GLBS) {
    const before = statSync(`${SRC}/${spec.file}`).size
    const after = await optimizeGlb(spec)
    console.log(`  ${spec.file.padEnd(26)} ${kb(before).padStart(9)} → ${kb(after).padStart(9)}${spec.simplifyRatio ? '  (decimado)' : ''}`)
  }
  console.log('Optimizando texturas standalone (→WebP 1024²)...')
  for (const file of TEXTURES) {
    const before = statSync(`${SRC}/${file}`).size
    const { out, bytes } = await optimizeTexture(file)
    console.log(`  ${file.padEnd(26)} ${kb(before).padStart(9)} → ${kb(bytes).padStart(9)}  (${out})`)
  }
  console.log('Hecho. Solo se emitió lo referenciado a public/assets/ (sin peso muerto).')
}

main().catch((e) => {
  console.error('optimize-assets falló:', e)
  process.exit(1)
})
