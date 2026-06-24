// Vista Three.js: construye la geometría estática desde la definición del circuito
// (sim.getCircuitDefinition()) y refleja las poses dinámicas (jugador + obstáculo)
// interpoladas entre el paso previo y el actual. No contiene lógica de juego.

import * as THREE from 'three'
import type { CircuitDefinition } from '../circuit'
import { config } from '../config'
import { colliderHalfExtents } from '../sim/movingObstacle'
import { getMesh, getTexture, MASCOT_MESH_URL, type AssetCatalog } from './assets'
import type { Transform, Vec3 } from '../types'

function lerpInto(out: THREE.Vector3, a: Vec3, b: Vec3, t: number): void {
  out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t)
}

/** Escala uniformemente una malla GLB para que quepa en `target` y la centra en su origen local. */
function fitInto(obj: THREE.Object3D, target: Vec3): void {
  const size = new THREE.Vector3()
  new THREE.Box3().setFromObject(obj).getSize(size)
  const s = Math.min(target.x / (size.x || 1), target.y / (size.y || 1), target.z / (size.z || 1))
  obj.scale.setScalar(s)
  const center = new THREE.Vector3()
  new THREE.Box3().setFromObject(obj).getCenter(center)
  obj.position.sub(center)
}

/** Grupo dinámico: malla GLB (ajustada) si existe, o la primitiva de reserva. Lo mueve updateDynamic. */
function buildDynamic(meshClone: THREE.Object3D | undefined, target: Vec3, fallback: () => THREE.Object3D): THREE.Object3D {
  const group = new THREE.Group()
  if (meshClone) {
    fitInto(meshClone, target)
    group.add(meshClone)
  } else {
    group.add(fallback())
  }
  return group
}

export class SceneView {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  private readonly playerMesh: THREE.Object3D
  private readonly obstacleMeshes: THREE.Object3D[]
  // Temporales reutilizables para el slerp de orientación (evita asignar por fotograma).
  private readonly _qa = new THREE.Quaternion()
  private readonly _qb = new THREE.Quaternion()

  constructor(container: HTMLElement, circuit: CircuitDefinition, catalog: AssetCatalog) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)
    const theme = circuit.theme
    // Fondo: skybox cargado → color de cielo de la paleta → reserva oscura.
    this.scene.background = catalog.skybox ?? new THREE.Color(theme?.palette.sky ?? 0x0e0f12)

    const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x202028, 1.1)
    this.scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 1.4)
    dir.position.set(8, 16, 6)
    this.scene.add(dir)

    // Geometría estática: textura de superficie por tipo → color de paleta → color del box (reserva).
    for (const s of circuit.statics) {
      const geo = new THREE.BoxGeometry(s.halfExtents.x * 2, s.halfExtents.y * 2, s.halfExtents.z * 2)
      const texUrl = (theme?.textures && theme.textures[s.kind]) || s.texture
      const tex = getTexture(catalog, texUrl)
      let material: THREE.MeshStandardMaterial
      if (tex) {
        const t = tex.clone()
        t.wrapS = THREE.RepeatWrapping
        t.wrapT = THREE.RepeatWrapping
        t.repeat.set((s.halfExtents.x * 2) / config.textureRepeat, (s.halfExtents.z * 2) / config.textureRepeat)
        t.needsUpdate = true
        material = new THREE.MeshStandardMaterial({ map: t })
      } else {
        material = new THREE.MeshStandardMaterial({ color: theme?.palette[s.kind] ?? s.color })
      }
      const mesh = new THREE.Mesh(geo, material)
      mesh.position.set(s.center.x, s.center.y, s.center.z)
      if (s.rotationX) mesh.rotation.x = s.rotationX
      this.scene.add(mesh)
    }

    // Zonas: losa fina visible (reserva) + cartel de señalización si hay textura cargada.
    for (const z of circuit.zones) {
      const geo = new THREE.BoxGeometry(z.halfExtents.x * 2, 0.12, z.halfExtents.z * 2)
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: z.color, transparent: true, opacity: 0.55 }),
      )
      mesh.position.set(z.center.x, z.center.y - z.halfExtents.y + 0.06, z.center.z)
      this.scene.add(mesh)

      const sign = getTexture(catalog, z.signageUrl)
      if (sign) {
        const w = z.halfExtents.x * 2
        const img = sign.image as { width?: number; height?: number } | undefined
        const aspect = img?.width && img?.height ? img.height / img.width : 1
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(w, w * aspect),
          new THREE.MeshBasicMaterial({ map: sign, transparent: true }),
        )
        // Sobre la losa, mirando a +Z (hacia el jugador que llega por -Z).
        plane.position.set(z.center.x, z.center.y + config.signageHeight, z.center.z)
        this.scene.add(plane)
      }
    }

    // Jugador: malla del mascot (US3) si existe; si no, la cápsula (reserva). El collider sigue cápsula.
    const capH = config.capsuleHalfHeight * 2 + config.capsuleRadius * 2
    this.playerMesh = buildDynamic(
      getMesh(catalog, MASCOT_MESH_URL),
      { x: config.capsuleRadius * 2, y: capH, z: config.capsuleRadius * 2 },
      () =>
        new THREE.Mesh(
          new THREE.CapsuleGeometry(config.capsuleRadius, config.capsuleHalfHeight * 2, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0xe8b341 }),
        ),
    )
    this.scene.add(this.playerMesh)

    // Obstáculos: malla GLB (US3) ajustada al collider si existe; si no, caja primitiva (reserva).
    this.obstacleMeshes = circuit.obstacles.map((ob) => {
      const he = colliderHalfExtents(ob, config)
      const target = { x: he.x * 2, y: he.y * 2, z: he.z * 2 }
      const group = buildDynamic(
        getMesh(catalog, ob.meshUrl),
        target,
        () =>
          new THREE.Mesh(
            new THREE.BoxGeometry(target.x, target.y, target.z),
            new THREE.MeshStandardMaterial({ color: ob.color }),
          ),
      )
      this.scene.add(group)
      return group
    })
  }

  get aspect(): number {
    return window.innerWidth / window.innerHeight
  }

  resize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  updateDynamic(
    prevPlayer: Transform,
    curPlayer: Transform,
    prevObstacles: Transform[],
    curObstacles: Transform[],
    alpha: number,
  ): void {
    lerpInto(this.playerMesh.position, prevPlayer.position, curPlayer.position, alpha)
    const pq = curPlayer.quaternion
    this.playerMesh.quaternion.set(pq.x, pq.y, pq.z, pq.w)
    for (let i = 0; i < this.obstacleMeshes.length; i++) {
      const mesh = this.obstacleMeshes[i]
      lerpInto(mesh.position, prevObstacles[i].position, curObstacles[i].position, alpha)
      const a = prevObstacles[i].quaternion
      const b = curObstacles[i].quaternion
      this._qa.set(a.x, a.y, a.z, a.w)
      this._qb.set(b.x, b.y, b.z, b.w)
      mesh.quaternion.slerpQuaternions(this._qa, this._qb, alpha)
    }
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera)
  }
}
