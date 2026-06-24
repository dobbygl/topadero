// Carga de assets de la capa de RENDER (US2). SOLO render: nada de esto es alcanzable desde
// src/sim/ (eso rompería la frontera headless y la carga del test en Node). La carga es
// ASÍNCRONA y ocurre ANTES de jugar (main.ts); si un recurso falla, se marca como no cargado
// y scene.ts usa la reserva (color de paleta / primitiva). Nunca rechaza: no debe romper el arranque.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { CircuitDefinition } from '../circuit'

/** Malla del personaje (US3). No es obstáculo, así que su ruta vive aquí, no en circuit.ts. */
export const MASCOT_MESH_URL = 'assets/mascot.glb'

export interface AssetCatalog {
  textures: Map<string, THREE.Texture>
  /** Mallas GLB clonables (US3 lo rellena con GLTFLoader; aquí queda vacío). */
  meshes: Map<string, THREE.Object3D>
  skybox?: THREE.Texture
  /** Estado de carga por URL: true si cargó, false si falló → reserva. */
  loaded: Map<string, boolean>
}

function loadTexture(loader: THREE.TextureLoader, url: string, catalog: AssetCatalog): Promise<void> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        catalog.textures.set(url, tex)
        catalog.loaded.set(url, true)
        resolve()
      },
      undefined,
      () => {
        catalog.loaded.set(url, false) // fallo → reserva, sin romper el arranque
        resolve()
      },
    )
  })
}

function loadMesh(loader: GLTFLoader, url: string, catalog: AssetCatalog): Promise<void> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        catalog.meshes.set(url, gltf.scene)
        catalog.loaded.set(url, true)
        resolve()
      },
      undefined,
      () => {
        catalog.loaded.set(url, false) // fallo → reserva a primitiva, sin romper el arranque
        resolve()
      },
    )
  })
}

/** Carga (antes de jugar) texturas/skybox + mallas GLB referenciadas. Siempre resuelve. */
export async function loadAssets(circuit: CircuitDefinition): Promise<AssetCatalog> {
  const catalog: AssetCatalog = { textures: new Map(), meshes: new Map(), loaded: new Map() }
  const texLoader = new THREE.TextureLoader()
  const gltfLoader = new GLTFLoader()
  const theme = circuit.theme

  const texUrls = new Set<string>()
  if (theme?.skyboxUrl) texUrls.add(theme.skyboxUrl)
  if (theme?.textures) for (const u of Object.values(theme.textures)) if (u) texUrls.add(u)
  for (const z of circuit.zones) if (z.signageUrl) texUrls.add(z.signageUrl)
  for (const s of circuit.statics) if (s.texture) texUrls.add(s.texture)

  const meshUrls = new Set<string>([MASCOT_MESH_URL])
  for (const o of circuit.obstacles) if (o.meshUrl) meshUrls.add(o.meshUrl)

  await Promise.all([
    ...[...texUrls].map((u) => loadTexture(texLoader, u, catalog)),
    ...[...meshUrls].map((u) => loadMesh(gltfLoader, u, catalog)),
  ])

  if (theme?.skyboxUrl && catalog.loaded.get(theme.skyboxUrl)) {
    catalog.skybox = catalog.textures.get(theme.skyboxUrl)
  }
  return catalog
}

/** Clon de la malla GLB cargada para `url`, o undefined si no existe/falló (→ reserva a primitiva). */
export function getMesh(catalog: AssetCatalog, url: string | undefined): THREE.Object3D | undefined {
  if (!url || !catalog.loaded.get(url)) return undefined
  const src = catalog.meshes.get(url)
  return src ? src.clone(true) : undefined
}

/** Devuelve la textura cargada para `url`, o undefined si no existe o falló (→ reserva). */
export function getTexture(catalog: AssetCatalog, url: string | undefined): THREE.Texture | undefined {
  if (!url) return undefined
  return catalog.loaded.get(url) ? catalog.textures.get(url) : undefined
}
