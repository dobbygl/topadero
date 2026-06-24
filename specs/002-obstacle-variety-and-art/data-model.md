# Data Model — Feature 002

Estado y datos que añade/extiende esta feature sobre el modelo de 001. Convención de ejes igual
que 001 (−Z hacia delante). Lo que no aparece aquí no cambia (runState, zonas, input).

## Tipos compartidos (`types.ts`)

### `ObstacleKind` (NUEVO)

```ts
type ObstacleKind = 'oscillate' | 'rotateBar' | 'pendulum' | 'pusher' | 'carry'
```

Discriminante de la trayectoria. `'oscillate'` es el vaivén actual (compatibilidad).

### `Transform` (EXTENDIDO)

```ts
interface Transform {
  position: Vec3
  quaternion: { x: number; y: number; z: number; w: number } // orientación completa
}
```

Pasa de `rotationY: number` a **quaternion** (decisión R1: barra gira en Y, péndulo en X). El
`facingYaw` del jugador se convierte a un quaternion de eje Y en el getter de lectura; el render
hace **slerp** uniforme sobre quaternions. (El núcleo puede seguir guardando `facingYaw` por
dentro; el quaternion se materializa en la frontera de lectura.)

## Definición del circuito (`circuit.ts`)

### `ObstacleDef` (NUEVO — unión discriminada por `kind`)

Campos de **simulación** (los consume `sim/`) + campos **visual-only** (los ignora `sim/`,
igual que `StaticBox.color` hoy):

```ts
interface ObstacleDefBase {
  id: string
  kind: ObstacleKind
  base: Vec3            // pivote/centro de la trayectoria
  // --- visual-only (solo render) ---
  color: number
  meshUrl?: string      // GLB low-poly; si falta → reserva a primitiva
}
```

Parámetros por tipo (todas las magnitudes viven en `config.ts`, aquí van solo los que definen
la instancia en el circuito, p. ej. eje/longitud/fase):

- `oscillate`: eje (X por defecto), referencia a amplitud/velocidad de config.
- `rotateBar`: longitud del brazo, eje de giro Y, sentido; collider cuboide alargado.
- `pendulum`: longitud, eje de pivote (X), amplitud angular; collider de la masa.
- `pusher`: eje de empuje (Z), carrera, periodo; collider cuboide.
- `carry`: ver `CarryingPlatformDef`.

### `CarryingPlatformDef` (NUEVO)

```ts
interface CarryingPlatformDef extends ObstacleDefBase {
  kind: 'carry'
  halfExtents: Vec3     // la cara superior define el AABB de soporte (R-carry)
  axis: 'x' | 'z'       // SOLO horizontal (clarificación FR-007)
  // amplitud/velocidad en config
}
```

### `CircuitDefinition` (EXTENDIDO)

```ts
interface CircuitDefinition {
  spawn: Vec3
  statics: StaticBox[]          // sin cambios (StaticBox puede ganar meshUrl?/texture? visual-only)
  obstacles: ObstacleDef[]      // SUSTITUYE al único obstacleBase: lista de obstáculos + portantes
  zones: ZoneDef[]
  theme?: { palette: ...; skyboxUrl?: string }  // visual-only: dirección de arte (./marketing)
}
```

`obstacleBase` (singular) desaparece a favor de `obstacles[]`. El circuito se alarga a ≈8-12
tramos con al menos un atajo arriesgado opcional (FR-003).

## Estado en memoria (`sim/`)

- **Obstáculos**: array de `{ body: RAPIER.RigidBody (kinematicPositionBased), def: ObstacleDef }`.
  Cada paso: `pose(simTime+dt)` → `setNextKinematicTranslation` + `setNextKinematicRotation`.
- **Knockback** (en `player`): `knockbackX/Z` persistente con decaimiento (existe) + variante
  (`push`/`throw`/`brake`) resuelta dentro del paso. Para rotatorios, dirección/magnitud desde
  la velocidad tangencial (ω × r).
- **Soporte de portante** (transitorio, recomputado cada paso, NO persistido entre pasos salvo
  lo imprescindible): resultado del test AABB de cara superior → delta horizontal sumado al
  movimiento deseado del KCC antes de `computeColliderMovement`.
- `simTime`, `prevPlayerPos`, y ahora `prevObstaclePoses[]` (array, para interpolar N obstáculos).

## Catálogo de assets (`render/assets.ts`, SOLO render — no es estado de simulación)

```ts
interface AssetCatalog {
  textures: Map<string, THREE.Texture>
  meshes: Map<string, THREE.Object3D>   // escenas GLTF clonables
  skybox?: THREE.Texture
  // estado de carga para decidir reserva a primitiva
}
```

Se construye con carga asíncrona **antes de jugar**; cada fallo de carga marca "usar primitiva".
No cruza la frontera hacia `sim/`.

## Validación / invariantes

- `sim/` NO importa Three ni assets; no lee `meshUrl`/`texture`/`theme`/`skyboxUrl`.
- Toda `pose(simTime)` es pura (sin `Date.now`/`Math.random`/estado oculto).
- La colisión usa solo los colliders primitivos (cuboide/cápsula/cilindro); las mallas son
  decoración alineada, nunca geometría de colisión.
- Portantes: solo `axis` horizontal; el soporte se decide por AABB, no por contacto de Rapier.
