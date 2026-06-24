// Único lugar de los parámetros de ajuste (Principio V de la constitución).
// La geometría/contenido del circuito vive en circuit.ts; aquí van las "perillas" de
// física, feel, cámara, obstáculo y la tolerancia del test de determinismo.

export const config = {
  // --- Bucle / simulación ---
  FIXED_DT: 1 / 60, // s, paso fijo de física (independiente del render)
  MAX_SUBSTEPS: 5, // tope de pasos por fotograma (guard anti espiral de la muerte)
  gravity: { x: 0, y: -22, z: 0 }, // m/s^2 (más fuerte que 9.81: se siente mejor en plataformas)

  // --- Jugador / KCC ---
  capsuleHalfHeight: 0.5, // mitad del cilindro central de la cápsula
  capsuleRadius: 0.4,
  kccOffset: 0.02, // hueco que deja el character controller
  moveSpeed: 7, // m/s
  jumpSpeed: 9, // m/s (velocidad vertical inicial del salto)
  coyoteTime: 0.08, // s de margen para saltar tras dejar el borde (decidir en playtest)
  maxSlopeClimbAngleRad: (50 * Math.PI) / 180,
  minSlopeSlideAngleRad: (40 * Math.PI) / 180,
  snapToGroundDistance: 0.5,
  autostepMaxHeight: 0.3,
  autostepMinWidth: 0.1,
  autostepIncludeDynamic: false,

  // --- Cámara (capa de render; no afecta a la simulación) ---
  cameraFov: 60, // grados
  cameraNear: 0.1,
  cameraFar: 300,
  cameraDistance: 9,
  cameraHeight: 4,
  cameraTargetOffsetY: 1.0, // mira un poco por encima de los pies
  cameraPitchMin: -0.6, // rad
  cameraPitchMax: 0.9, // rad
  cameraSmoothingK: 12, // mayor = más rígida
  mouseSensitivity: 0.0025, // rad por píxel de movimiento
  mouseDeltaClamp: 100, // px máximos por evento (evita saltos bruscos)

  // --- Obstáculo móvil ---
  obstacleAmplitude: 4.5, // m de vaivén (eje X)
  obstacleSpeed: 1.6, // rad/s de la fase senoidal
  obstacleHalfExtents: { x: 0.6, y: 0.8, z: 2.6 }, // caja gruesa (anti tunneling)
  knockbackStrength: 11, // m/s de empuje base al contacto
  knockbackThrowStrength: 16, // m/s de "tirón" (péndulo): impulso más fuerte que el empuje base
  knockbackMax: 18, // m/s tope del empuje (anti tunneling)
  knockbackDecay: 6, // 1/s de decaimiento de la velocidad de empuje
  contactPrediction: 0.15, // margen de detección de contactCollider (>= despl. del obstáculo por paso)

  // --- Obstáculos nuevos (002 · US1). Magnitudes por tipo (Principio V); afinar en playtest. ---
  rotateBar: {
    halfExtents: { x: 3.2, y: 0.35, z: 0.45 }, // brazo largo en X (gira alrededor de Y)
    angularSpeed: 1.4, // rad/s
  },
  pendulum: {
    armLength: 4.0, // del pivote al centro del bob
    bobHalfExtents: { x: 0.9, y: 0.9, z: 0.9 },
    amplitude: 1.0, // rad (amplitud angular del vaivén alrededor de X)
    angularSpeed: 1.7, // rad/s de la fase
  },
  pusher: {
    halfExtents: { x: 1.3, y: 1.0, z: 1.0 },
    stroke: 2.6, // m de carrera en Z
    speed: 1.5, // rad/s de la fase
  },
  carry: {
    amplitude: 3.5, // m de recorrido horizontal
    speed: 1.0, // rad/s de la fase
    supportBandY: 0.35, // banda Y sobre la cara superior para el test de soporte (R-carry)
  },

  // --- Vestido gráfico 2D (002 · US2). Solo ajuste visual; las RUTAS de asset van en circuit.ts. ---
  textureRepeat: 3, // repeticiones (tiling) de las texturas de superficie
  signageHeight: 2.2, // m de alto de los carteles de salida/meta sobre su losa
  maxTextureSize: 1024, // presupuesto de generación: lado máx. de textura (R6)

  // --- Recuperación ---
  fallThreshold: -8, // y por debajo del cual se reaparece

  // --- Test / determinismo ---
  FLOAT_EPSILON: 1e-6, // tolerancia de redondeo en el test de igualdad
} as const

export type Config = typeof config
