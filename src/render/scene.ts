// Vista Three.js: construye la geometría estática desde la definición del circuito
// (sim.getCircuitDefinition()) y refleja las poses dinámicas (jugador + obstáculos)
// interpoladas entre el paso previo y el actual. No contiene lógica de juego.
// Look "candy glossy" (key art): NeutralToneMapping + IBL (RoomEnvironment) + clearcoat +
// RoundedBoxGeometry + decals + props de cielo + portal FINISH. Todo SOLO render.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { CircuitDefinition } from '../circuit'
import { config } from '../config'
import { colliderHalfExtents } from '../sim/movingObstacle'
import {
  getMesh,
  getTexture,
  MASCOT_MESH_URL,
  PLAYER_RIG_URL,
  BALLOON_MESH_URL,
  PINWHEEL_MESH_URL,
  type AssetCatalog,
} from './assets'
import type { Transform, Vec3 } from '../types'

function lerpInto(out: THREE.Vector3, a: Vec3, b: Vec3, t: number): void {
  out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t)
}

/**
 * Escala una malla GLB a `target` y la centra en su origen local.
 * - 'contain' (def.): uniforme, cabe DENTRO (min de proporciones); para props del cielo.
 * - 'cover': uniforme, LLENA desbordando los ejes menores; para el personaje (si no, ~50%).
 * - 'fill': NO uniforme, rellena exactamente la caja del collider (XYZ por separado); para
 *   obstáculos → la malla adopta la forma/orientación del collider (barra larga en X, vaivén
 *   en Z…) sin huecos. Distorsiona algo la proporción, aceptable en props abstractos.
 */
function fitInto(obj: THREE.Object3D, target: Vec3, mode: 'contain' | 'cover' | 'fill' = 'contain'): void {
  const size = new THREE.Vector3()
  new THREE.Box3().setFromObject(obj).getSize(size)
  const rx = target.x / (size.x || 1)
  const ry = target.y / (size.y || 1)
  const rz = target.z / (size.z || 1)
  if (mode === 'fill') obj.scale.set(rx, ry, rz)
  else obj.scale.setScalar(mode === 'cover' ? Math.max(rx, ry, rz) : Math.min(rx, ry, rz))
  const center = new THREE.Vector3()
  new THREE.Box3().setFromObject(obj).getCenter(center)
  obj.position.sub(center)
}

type GlossyParams = { roughness: number; metalness: number; clearcoat: number; clearcoatRoughness: number; envMapIntensity: number }

/** Hace glossy los materiales de un GLB MUTÁNDOLOS en sitio (conserva map/color/normalMap).
 *  No reemplaza el material: MeshPhysicalMaterial.copy() desde un Standard revienta (campos
 *  physical-only undefined). Se bajan roughness/metalness + envMapIntensity; clearcoat solo si
 *  el material ya es physical. */
function applyGlossy(obj: THREE.Object3D, p: GlossyParams): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      const sm = m as THREE.MeshStandardMaterial
      if (!sm.isMeshStandardMaterial) continue // physical también pasa (extiende standard); unlit no
      sm.roughness = p.roughness
      sm.metalness = p.metalness
      sm.envMapIntensity = p.envMapIntensity
      const pm = sm as THREE.MeshPhysicalMaterial
      if (pm.isMeshPhysicalMaterial) {
        pm.clearcoat = p.clearcoat
        pm.clearcoatRoughness = p.clearcoatRoughness
      }
      sm.needsUpdate = true
    }
  })
}

/** Textura de flecha chevron blanca (canvas, una vez). Browser-only (vive en render). */
function makeChevronTexture(): THREE.Texture {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const x = c.getContext('2d')!
  x.clearRect(0, 0, S, S)
  x.strokeStyle = '#ffffff'
  x.lineWidth = S * 0.16
  x.lineCap = 'round'
  x.lineJoin = 'round'
  x.beginPath()
  x.moveTo(S * 0.2, S * 0.62)
  x.lineTo(S * 0.5, S * 0.3)
  x.lineTo(S * 0.8, S * 0.62)
  x.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Textura de cuadros (banner FINISH), procedural una vez. */
function makeCheckerTexture(squares = 8, size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')!
  const s = size / squares
  for (let j = 0; j < squares; j++)
    for (let i = 0; i < squares; i++) {
      x.fillStyle = (i + j) & 1 ? '#14233b' : '#ffffff'
      x.fillRect(i * s, j * s, s, s)
    }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.NearestFilter
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export class SceneView {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  private readonly playerMesh: THREE.Object3D
  private readonly obstacleMeshes: THREE.Object3D[]
  // Overlay de depuración de física (colliders de Rapier como líneas); SOLO render.
  private readonly debugLines: THREE.LineSegments
  // Animación del personaje (v1.2.0, SOLO render): mezclador + clips por nombre.
  private mixer: THREE.AnimationMixer | null = null
  private readonly actions = new Map<string, THREE.AnimationAction>()
  private currentClip = ''
  private readonly lastPlayerPos = new THREE.Vector3()
  // Temporales reutilizables para el slerp de orientación (evita asignar por fotograma).
  private readonly _qa = new THREE.Quaternion()
  private readonly _qb = new THREE.Quaternion()

  constructor(container: HTMLElement, circuit: CircuitDefinition, catalog: AssetCatalog) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.NeutralToneMapping // preserva saturación candy (NO ACES)
    this.renderer.toneMappingExposure = config.toneMappingExposure
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    const theme = circuit.theme
    this.scene.background = catalog.skybox ?? new THREE.Color(theme?.palette.sky ?? 0x0e0f12)
    if (catalog.skybox) this.scene.backgroundIntensity = config.env.backgroundIntensity

    // Glossy IBL: environment una sola vez (reflejos suaves de estudio sobre el caramelo).
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = config.envIntensity
    pmrem.dispose()

    this.scene.fog = new THREE.Fog(config.env.fogColor, config.env.fogNear, config.env.fogFar)

    const hemi = new THREE.HemisphereLight(config.hemiSky, config.hemiGround, config.hemiIntensity)
    this.scene.add(hemi)
    const dir = new THREE.DirectionalLight(config.dirColor, config.dirIntensity)
    dir.position.set(config.dirPosition.x, config.dirPosition.y, config.dirPosition.z)
    dir.castShadow = true
    dir.shadow.mapSize.set(config.shadowMapSize, config.shadowMapSize)
    dir.shadow.bias = config.shadowBias
    dir.shadow.normalBias = config.shadowNormalBias
    const sc = dir.shadow.camera
    sc.left = -22
    sc.right = 22
    sc.top = 8
    sc.bottom = -80
    sc.near = 0.5
    sc.far = 120
    sc.updateProjectionMatrix()
    dir.target.position.set(0, 0, config.dirTargetZ)
    this.scene.add(dir)
    this.scene.add(dir.target)
    const fill = new THREE.DirectionalLight(0xffffff, config.fillIntensity)
    fill.position.set(0, 6, 14)
    this.scene.add(fill)

    // --- Geometría estática: caramelo redondeado + color candy + clearcoat + sombras + flechas ---
    const g = config.glossy.statics
    const chevronTex = makeChevronTexture()
    const chevronMat = new THREE.MeshBasicMaterial({
      map: chevronTex,
      color: config.decalChevronColor,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
    let platIdx = 0
    for (const s of circuit.statics) {
      const he = s.halfExtents
      const minHE = Math.min(he.x, he.y, he.z)
      const r = Math.min(config.platformRoundRadius, minHE * config.platformRoundMaxFrac)
      const geo = new RoundedBoxGeometry(he.x * 2, he.y * 2, he.z * 2, config.platformRoundSegments, r)

      let col: number
      if (s.kind === 'ramp' || s.id === 'shortcut') col = config.candy.ramp
      else if (s.kind === 'wall') col = config.candy.wall
      else if (s.id === 'p0') col = config.candy.start // salida verde
      else col = platIdx++ % 2 === 0 ? config.candy.platformA : config.candy.platformB

      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshPhysicalMaterial({
          color: col,
          roughness: g.roughness,
          metalness: g.metalness,
          clearcoat: g.clearcoat,
          clearcoatRoughness: g.clearcoatRoughness,
          envMapIntensity: g.envMapIntensity,
        }),
      )
      mesh.position.set(s.center.x, s.center.y, s.center.z)
      if (s.rotationX) mesh.rotation.x = s.rotationX
      mesh.receiveShadow = true
      mesh.castShadow = true
      this.scene.add(mesh)

      // Flecha chevron en la cara superior de las plataformas del camino (apunta a -Z).
      if (s.kind === 'platform' && s.id !== 'p0' && s.id !== 'shortcut') {
        const w = he.x * 2 * config.decalChevronWidthFrac
        const l = he.z * 2 * config.decalChevronLengthFrac
        const chev = new THREE.Mesh(new THREE.PlaneGeometry(w, l), chevronMat)
        chev.rotation.x = -Math.PI / 2
        chev.position.set(s.center.x, s.center.y + he.y + config.decalYOffset, s.center.z)
        chev.renderOrder = 1
        this.scene.add(chev)
      }
    }

    // --- Zonas: losa glossy + cartel + franja de salida ---
    for (const z of circuit.zones) {
      const geo = new THREE.BoxGeometry(z.halfExtents.x * 2, 0.12, z.halfExtents.z * 2)
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshPhysicalMaterial({
          color: z.color,
          transparent: true,
          opacity: 0.55,
          roughness: g.roughness,
          metalness: 0,
          clearcoat: g.clearcoat,
          clearcoatRoughness: g.clearcoatRoughness,
          envMapIntensity: g.envMapIntensity,
        }),
      )
      mesh.position.set(z.center.x, z.center.y - z.halfExtents.y + 0.06, z.center.z)
      mesh.receiveShadow = true
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
        plane.position.set(z.center.x, z.center.y + config.signageHeight, z.center.z)
        this.scene.add(plane)
      }

      if (z.kind === 'start') {
        const stripe = new THREE.Mesh(
          new THREE.PlaneGeometry(config.laneStripeWidth, z.halfExtents.z * 2 * 0.92),
          new THREE.MeshBasicMaterial({
            color: config.laneStripeColor,
            transparent: true,
            opacity: config.laneStripeOpacity,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          }),
        )
        stripe.rotation.x = -Math.PI / 2
        const slabTop = z.center.y - z.halfExtents.y + 0.12
        stripe.position.set(z.center.x, slabTop + config.laneStripeYOffset, z.center.z)
        stripe.renderOrder = 2
        this.scene.add(stripe)
      }
    }

    // --- Jugador (collider SIEMPRE cápsula). Rig animado (v1.2.0) → mascot estático → cápsula. ---
    const capH = config.capsuleHalfHeight * 2 + config.capsuleRadius * 2
    const capsuleTarget = { x: config.capsuleRadius * 2, y: capH, z: config.capsuleRadius * 2 }
    const capsuleFallback = (): THREE.Object3D =>
      new THREE.Mesh(
        new THREE.CapsuleGeometry(config.capsuleRadius, config.capsuleHalfHeight * 2, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xe8b341 }),
      )
    if (catalog.playerScene && catalog.loaded.get(PLAYER_RIG_URL)) {
      const rig = catalog.playerScene // instancia única: NO se clona (clone() no reata el skeleton)
      fitInto(rig, capsuleTarget, 'cover') // llena la cápsula (si no, ~50% de la altura)
      const group = new THREE.Group()
      group.add(rig)
      this.playerMesh = group
      this.mixer = new THREE.AnimationMixer(rig)
      for (const clip of catalog.playerClips ?? []) this.actions.set(clip.name, this.mixer.clipAction(clip))
    } else {
      this.playerMesh = buildDynamic(getMesh(catalog, MASCOT_MESH_URL), capsuleTarget, capsuleFallback, 'cover')
    }
    applyGlossy(this.playerMesh, config.glossy.mascot)
    this.scene.add(this.playerMesh)
    this.lastPlayerPos.copy(this.playerMesh.position)

    // --- Obstáculos: malla GLB ajustada al collider; reserva = caja redondeada. Glossy en ambos. ---
    this.obstacleMeshes = circuit.obstacles.map((ob) => {
      const he = colliderHalfExtents(ob, config)
      const target = { x: he.x * 2, y: he.y * 2, z: he.z * 2 }
      const group = buildDynamic(getMesh(catalog, ob.meshUrl), target, () => {
        const minHE = Math.min(he.x, he.y, he.z)
        const r = Math.min(config.platformRoundRadius, minHE * config.platformRoundMaxFrac)
        return new THREE.Mesh(
          new RoundedBoxGeometry(target.x, target.y, target.z, config.platformRoundSegments, r),
          new THREE.MeshStandardMaterial({ color: ob.color }),
        )
      }, 'fill')
      applyGlossy(group, config.glossy.obstacle)
      this.scene.add(group)
      return group
    })

    this.buildDecor(catalog)
    this.buildEnvironmentProps()

    // Overlay de depuración (oculto por defecto): líneas de los colliders de Rapier.
    // depthTest:false + renderOrder alto → se dibuja ENCIMA de las mallas (si no, coincide con
    // ellas y queda oculto). vertexColors usa los colores de Rapier (sólido/cinético/sensor).
    this.debugLines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xff2d2d, depthTest: false, depthWrite: false }),
    )
    this.debugLines.frustumCulled = false
    this.debugLines.renderOrder = 999
    this.debugLines.visible = false
    this.scene.add(this.debugLines)
  }

  /** Dibuja/actualiza los colliders de física (datos planos de la sim). null = oculta. SOLO render. */
  setDebug(data: { vertices: Float32Array; colors: Float32Array } | null): void {
    if (!data) {
      this.debugLines.visible = false
      return
    }
    const geo = this.debugLines.geometry
    geo.setAttribute('position', new THREE.BufferAttribute(data.vertices, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 4))
    this.debugLines.visible = true
  }

  /** Props decorativos del cielo (globos + molinillos). Sin colliders; no entra en la simulación. */
  private buildDecor(catalog: AssetCatalog): void {
    const place = (url: string, pos: Vec3, target: Vec3): void => {
      const mesh = getMesh(catalog, url)
      if (!mesh) return // GLB ausente → decoración omitida, sin romper
      fitInto(mesh, target)
      const grp = new THREE.Group()
      grp.add(mesh)
      grp.position.set(pos.x, pos.y, pos.z)
      this.scene.add(grp)
    }
    for (const b of config.env.balloons) place(BALLOON_MESH_URL, b, config.env.balloonSize)
    for (const p of config.env.pinwheels) place(PINWHEEL_MESH_URL, p, config.env.pinwheelSize)
  }

  /** Portal FINISH dorado + barandilla + pedestal del cañón + poste del brazo. Estático; no toca sim. */
  private buildEnvironmentProps(): void {
    const fp = config.finishPortal
    const top = 2.0 // top de P7 (center.y 1.5 + halfExtents.y 0.5)
    const gold = new THREE.MeshStandardMaterial({
      color: fp.goldColor,
      metalness: fp.goldMetalness,
      roughness: fp.goldRoughness,
      emissive: fp.goldEmissive,
      emissiveIntensity: fp.goldEmissiveIntensity,
    })
    const group = new THREE.Group()

    // Arco de medio toro (vertical en XY, extremos en ±span/2).
    const arch = new THREE.Mesh(new THREE.TorusGeometry(fp.span / 2, fp.barThickness / 2, 16, 64, Math.PI), gold)
    arch.position.set(0, top, fp.z)
    arch.castShadow = true
    group.add(arch)

    // Banner a cuadros colgando del ápice.
    const ctex = makeCheckerTexture(8, 256)
    ctex.repeat.set(Math.max(2, Math.round(fp.span / fp.bannerHeight)), 1)
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(fp.span, fp.bannerHeight),
      new THREE.MeshStandardMaterial({ map: ctex, roughness: 0.5, side: THREE.DoubleSide }),
    )
    banner.position.set(0, top + fp.span / 2 - fp.bannerHeight / 2, fp.z)
    group.add(banner)

    // Barandilla dorada en los bordes en X de P7.
    const rl = config.railing
    const p7HalfX = 4
    const p7HalfZ = 4
    const railPostGeo = new THREE.CylinderGeometry(rl.postRadius, rl.postRadius, rl.postHeight, 12)
    for (const sx of [-1, 1]) {
      for (let k = 0; k < rl.count; k++) {
        const z = fp.z - p7HalfZ + 2 * p7HalfZ * (k / (rl.count - 1))
        const post = new THREE.Mesh(railPostGeo, gold)
        post.position.set(sx * p7HalfX, top + rl.postHeight / 2, z)
        group.add(post)
      }
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(rl.railRadius, rl.railRadius, 2 * p7HalfZ, 10), gold)
      rail.rotation.x = Math.PI / 2
      rail.position.set(sx * p7HalfX, top + rl.postHeight, fp.z)
      group.add(rail)
    }

    // Pedestal rosa bajo el cañón (pusher en P6, z=-58).
    const cp = config.cannonProp
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(cp.r, cp.r * 1.15, cp.h, 20),
      new THREE.MeshStandardMaterial({ color: cp.color, roughness: 0.35 }),
    )
    ped.position.set(0, top + cp.h / 2, -58)
    group.add(ped)

    // Poste rosa bajo el brazo giratorio (rotateBar en P2, z=-22, pivote y=2.6).
    const ap = config.armProp
    const postH = 2.6 - top + 0.2
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(ap.r, ap.r, postH, 16),
      new THREE.MeshStandardMaterial({ color: ap.color, roughness: 0.35 }),
    )
    post.position.set(0, (top + 2.6) / 2, -22)
    group.add(post)

    this.scene.add(group)
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

  /**
   * Selecciona y mezcla el clip del personaje según su velocidad horizontal + apoyo, y avanza
   * el mezclador con el DELTA DE RENDER (v1.2.0). SOLO cosmético: no toca la simulación.
   */
  updatePlayerAnimation(isGrounded: boolean, dtRender: number): void {
    if (!this.mixer) return
    const cur = this.playerMesh.position
    const speed =
      dtRender > 1e-5 ? Math.hypot(cur.x - this.lastPlayerPos.x, cur.z - this.lastPlayerPos.z) / dtRender : 0
    this.lastPlayerPos.copy(cur)

    let want = 'Idle_4'
    if (!isGrounded) want = 'Jump'
    else if (speed >= config.animRunSpeed) want = 'Run_03'
    else if (speed >= config.animIdleSpeed) want = 'Walking'

    if (want !== this.currentClip) {
      const next = this.actions.get(want) ?? this.actions.get('Idle_4')
      if (next) {
        const prev = this.currentClip ? this.actions.get(this.currentClip) : undefined
        next.reset().setEffectiveWeight(1).fadeIn(config.animFade).play()
        if (prev && prev !== next) prev.fadeOut(config.animFade)
        this.currentClip = want
      }
    }
    this.mixer.update(dtRender)
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera)
  }
}

/** Grupo dinámico: malla GLB (ajustada) si existe, o la primitiva de reserva. Lo mueve updateDynamic. */
function buildDynamic(
  meshClone: THREE.Object3D | undefined,
  target: Vec3,
  fallback: () => THREE.Object3D,
  mode: 'contain' | 'cover' | 'fill' = 'contain',
): THREE.Object3D {
  const group = new THREE.Group()
  if (meshClone) {
    fitInto(meshClone, target, mode)
    group.add(meshClone)
  } else {
    group.add(fallback())
  }
  return group
}
