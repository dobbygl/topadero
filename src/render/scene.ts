// Vista Three.js: construye la geometría estática desde la definición del circuito
// (sim.getCircuitDefinition()) y refleja las poses dinámicas (jugador + obstáculo)
// interpoladas entre el paso previo y el actual. No contiene lógica de juego.

import * as THREE from 'three'
import type { CircuitDefinition } from '../circuit'
import { config } from '../config'
import type { Transform, Vec3 } from '../types'

function lerpInto(out: THREE.Vector3, a: Vec3, b: Vec3, t: number): void {
  out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t)
}

export class SceneView {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  private readonly playerMesh: THREE.Mesh
  private readonly obstacleMesh: THREE.Mesh

  constructor(container: HTMLElement, circuit: CircuitDefinition) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)
    this.scene.background = new THREE.Color(0x0e0f12)

    const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x202028, 1.1)
    this.scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 1.4)
    dir.position.set(8, 16, 6)
    this.scene.add(dir)

    // Geometría estática
    for (const s of circuit.statics) {
      const geo = new THREE.BoxGeometry(s.halfExtents.x * 2, s.halfExtents.y * 2, s.halfExtents.z * 2)
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: s.color }))
      mesh.position.set(s.center.x, s.center.y, s.center.z)
      if (s.rotationX) mesh.rotation.x = s.rotationX
      this.scene.add(mesh)
    }

    // Marcadores visibles de zonas (losas finas sobre la plataforma)
    for (const z of circuit.zones) {
      const geo = new THREE.BoxGeometry(z.halfExtents.x * 2, 0.12, z.halfExtents.z * 2)
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: z.color, transparent: true, opacity: 0.55 }),
      )
      mesh.position.set(z.center.x, z.center.y - z.halfExtents.y + 0.06, z.center.z)
      this.scene.add(mesh)
    }

    // Jugador (cápsula): length = 2·halfHeight
    this.playerMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(config.capsuleRadius, config.capsuleHalfHeight * 2, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xe8b341 }),
    )
    this.scene.add(this.playerMesh)

    // Obstáculo
    const he = config.obstacleHalfExtents
    this.obstacleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(he.x * 2, he.y * 2, he.z * 2),
      new THREE.MeshStandardMaterial({ color: 0xbf4040 }),
    )
    this.scene.add(this.obstacleMesh)
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
    prevObstacle: Transform,
    curObstacle: Transform,
    alpha: number,
  ): void {
    lerpInto(this.playerMesh.position, prevPlayer.position, curPlayer.position, alpha)
    this.playerMesh.rotation.y = curPlayer.rotationY
    lerpInto(this.obstacleMesh.position, prevObstacle.position, curObstacle.position, alpha)
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera)
  }
}
