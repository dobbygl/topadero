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

  // --- Feel del control (003; todo se consume dentro del paso fijo; afinar en playtest) ---
  // US1 — salto que perdona:
  jumpBufferTime: 0.12, // s; un flanco de salto pulsado hasta aquí antes de aterrizar se recuerda
  // US2 — salto de altura variable + gravedad asimétrica:
  jumpReleaseVelocity: 3.5, // m/s; al soltar en ascenso, vy se corta a este suelo (= salto mínimo, FR-004)
  fallGravityMult: 1.6, // × gravity.y al caer (caída más rápida; 1 = como el MVP)
  lowJumpGravityMult: 1.8, // × gravity.y al ascender con el salto ya soltado (1 = como el MVP)
  // US3 — locomoción con peso + control aéreo (rampa de velocidad; ajustables por separado):
  groundAccel: 70, // m/s^2 rampa de arranque en suelo
  groundDecel: 90, // m/s^2 rampa de frenado en suelo
  airAccel: 35, // m/s^2 control aéreo (aceleración horizontal en el aire; separada del suelo)

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
  contactPrediction: 0.2, // margen de detección (>= despl. por paso del obstáculo más rápido; 5 tipos, T038)

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

  // --- Animación del personaje (002 · v1.2.0, SOLO render; conducida por tiempo de render) ---
  animIdleSpeed: 0.6, // m/s por debajo → clip Idle
  animRunSpeed: 4.5, // m/s por encima → clip Run; entre idle y run → Walking
  animFade: 0.18, // s de crossfade entre clips

  // --- Vestido gráfico 2D (002 · US2). Solo ajuste visual; las RUTAS de asset van en circuit.ts. ---
  textureRepeat: 3, // repeticiones (tiling) de las texturas de superficie
  signageHeight: 2.2, // m de alto de los carteles de salida/meta sobre su losa
  maxTextureSize: 1024, // presupuesto de generación: lado máx. de textura (R6)

  // --- Recuperación ---
  fallThreshold: -8, // y por debajo del cual se reaparece

  // --- Look glossy candy (002 · key art). SOLO render (NeutralToneMapping + IBL). ---
  toneMappingExposure: 1.0, // única clave de exposición
  envIntensity: 1.0, // scene.environmentIntensity del IBL
  // Luz (unidades físicas post-r155)
  hemiSky: 0xbfe3ff,
  hemiGround: 0xf2efe0,
  hemiIntensity: 0.6,
  dirColor: 0xfff4e0,
  dirIntensity: 2.6,
  dirPosition: { x: -14, y: 22, z: 10 },
  dirTargetZ: -33,
  fillIntensity: 0.35,
  shadowMapSize: 2048,
  shadowBias: -0.0004,
  shadowNormalBias: 0.02,
  // Paleta candy de plataformas (alternancia rosa/teal; salida verde la da la zona start)
  candy: { platformA: 0xff5fa2, platformB: 0x2fd4c4, ramp: 0xff7a1a, wall: 0xffffff, start: 0x8bd936 },
  // Materiales glossy (MeshPhysicalMaterial: clearcoat = laca de caramelo)
  glossy: {
    statics: { roughness: 0.25, metalness: 0.0, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 0.8 },
    obstacle: { roughness: 0.3, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 0.7 },
    mascot: { roughness: 0.35, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 0.6 },
  },
  // Redondeo de plataformas (look caramelo)
  platformRoundRadius: 0.35,
  platformRoundSegments: 4,
  platformRoundMaxFrac: 0.85,
  // Decals (flecha chevron + lane de salida)
  decalYOffset: 0.06,
  decalChevronWidthFrac: 0.6,
  decalChevronLengthFrac: 0.5,
  decalChevronColor: 0xffffff,
  laneStripeWidth: 0.8,
  laneStripeColor: 0xffffff,
  laneStripeOpacity: 0.95,
  laneStripeYOffset: 0.04,
  // Entorno (cielo + props decorativos en el cielo)
  env: {
    backgroundIntensity: 1.15,
    fogColor: 0xaaf6fb,
    fogNear: 30,
    fogFar: 140,
    balloonSize: { x: 4, y: 6, z: 4 },
    pinwheelSize: { x: 2.5, y: 3.5, z: 1 },
    balloons: [
      { x: -15, y: 15, z: -6 },
      { x: 16, y: 19, z: -24 },
      { x: -20, y: 24, z: -40 },
      { x: 19, y: 17, z: -56 },
      { x: -4, y: 28, z: -88 },
    ],
    pinwheels: [
      { x: -9, y: 4, z: -11 },
      { x: 10, y: 5, z: -31 },
      { x: -10, y: 5, z: -44 },
      { x: 11, y: 6, z: -58 },
    ],
  },
  // Portal FINISH dorado + props
  finishPortal: { z: -66, span: 6, postRadius: 0.18, barThickness: 0.45, bannerHeight: 0.9, goldColor: 0xf5c542, goldMetalness: 0.6, goldRoughness: 0.3, goldEmissive: 0x3a2c00, goldEmissiveIntensity: 0.4 },
  railing: { postRadius: 0.08, postHeight: 0.9, railRadius: 0.06, count: 5 },
  cannonProp: { r: 1.0, h: 0.8, color: 0xff5fa2 },
  armProp: { r: 0.22, color: 0xff5fa2 },

  // --- Test / determinismo ---
  FLOAT_EPSILON: 1e-6, // tolerancia de redondeo en el test de igualdad
} as const

export type Config = typeof config
