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

  // --- Entrada: mando + táctil (004). Adaptadores en src/input; el FrameInput lo consume el
  // paso fijo (los flancos se ventanean → deterministas, Principio II). La cámara es render. ---
  gamepadDeadzone: 0.2, // deadzone radial de los sticks (0..1)
  gamepadLookSpeed: 2.6, // rad/s del stick derecho (cámara; escalado por dt de render)
  gamepadJumpButton: 0, // índice de botón de salto (A / cross)
  gamepadRestartButton: 9, // índice de botón de reinicio (Start / Options)
  invertCameraY: false, // US2: invertir el eje vertical de cámara (mando y táctil)
  touchLookSensitivity: 0.005, // rad por píxel de arrastre en la zona de cámara (US1)
  touchJoystickRadius: 60, // px; radio del joystick virtual a deflexión máxima
  touchJumpButtonSize: 88, // px; lado del botón de salto en pantalla
  touchControlMargin: 28, // px; margen de los controles táctiles al borde

  // --- Accesibilidad (004 · US3; solo render/UI, no toca el paso fijo) ---
  reducedMotion: false, // atenúa el movimiento/juice de cámara (semilla desde prefers-reduced-motion)
  hudScale: 1.0,
  hudHighContrast: false,

  // --- Audio (005; capa de render, fuera del paso fijo; no afecta al determinismo) ---
  audio: {
    master: 1.0, // ganancia maestra
    musicVolume: 0.5,
    sfxVolume: 0.85,
    musicCrossfade: 2, // s de crossfade en el bucle de música (loop sin corte perceptible)
    mutedByDefault: false,
    muteKey: 'KeyM', // tecla de silencio global
    dir: 'audio/', // base relativa (servida en /play); el cargador prueba .ogg y luego .mp3
    sfx: { jump: 'sfx_jump', land: 'sfx_land', hit: 'sfx_hit', finish: 'sfx_finish', respawn: 'sfx_respawn' },
    music: 'music_gameplay', // CC0; opcional (puede no existir todavía → degrada en silencio)
    // Umbrales del detector de eventos (tiempo de render):
    jumpVyThreshold: 3, // m/s: dejar el suelo con vy mayor = salto (no caída de borde)
    hitKnockbackThreshold: 3, // m/s de knockback para considerar "golpe"
    respawnDistThreshold: 5, // m de salto de posición en un fotograma = reaparición
  },

  // --- Generación de circuito diario (006; bloque CONGELADO versionado). El generador
  // (src/circuitgen/) lee ESTO, NO las perillas de feel vivas: afinar el feel no cambia circuitos
  // pasados. Si cambias CUALQUIER constante de aquí, SUBE generatorVersion (reproducibilidad
  // histórica, FR-012). El `envelope` se inicializa a los valores de feel vivos ACTUALES; mantenerlo
  // alineado (si el salto real diverge, subir versión, T026). Fuera del paso fijo; no afecta al sim. ---
  circuitgen: {
    generatorVersion: '1.0.0',
    varietySalt: '', // sal opcional concatenada antes del SHA-256 del hash; cambiarla = subir versión
    grid: 0.5, // m; toda posición/medida = entero·grid (exacto en float64 → mismo circuito en todo dispositivo)
    segmentsRange: { min: 8, max: 14 }, // nº de plataformas (suelo de variedad)
    gapRange: { min: 3, max: 7 }, // m de hueco entre plataformas (se acota por el envoltorio si hace falta)
    platformHalfWidthRange: { min: 1.5, max: 3 }, // semiancho X de plataforma (m)
    platformHalfDepth: 3, // semiprofundidad Z de plataforma (m)
    obstacleChance: { num: 3, den: 5 }, // prob. de obstáculo por segmento intermedio (num/den)
    minObstacles: 3, // suelo mínimo de obstáculos (evita trazado trivial)
    obstacleMix: { oscillate: 3, rotateBar: 3, pendulum: 2, pusher: 2, carry: 1 }, // pesos del catálogo 001/002
    reachMargin: 0.85, // fracción del envoltorio exigible soluble (margen de seguridad)
    // Envoltorio de salto CONGELADO (= valores de feel vivos actuales; T026 obliga a subir versión si divergen):
    envelope: { gravityY: -22, jumpSpeed: 9, moveSpeed: 7 },
  },

  // --- Circuito diario: resolución de baliza (006; red de SOLO LECTURA, fuera del paso fijo,
  // con degradación offline; constitución v2.2.0). Ajuste centralizado (Principio V). ---
  daily: {
    providers: ['https://mempool.space/api', 'https://blockstream.info/api'], // principal + alternativa (Esplora)
    confirmations: 3, // finalidad frente a reorg
    resolveDeadlineMs: 6000, // tope GLOBAL de resolución de baliza; si se excede → offline (arranque sin esperas largas)
    clockSanityToleranceMs: 2 * 60 * 60 * 1000, // 2 h: si el reloj local diverge más de esto, preferir el día de la cadena
    cacheKeyPrefix: 'topadero.daily.', // localStorage: circuito resuelto por día UTC
    bestMarkKeyPrefix: 'topadero.best.', // localStorage: mejor marca por día/circuito
  },

  // --- Ajustes del jugador (007; shell). Defaults aquí (Principio V); el valor ACTUAL elegido en
  // el panel se persiste en localStorage (FR-019a) reusando los volúmenes de `audio` y la
  // sensibilidad de `input/preferences`. El interruptor de debug de físicas NO se persiste. ---
  settings: {
    storageKey: 'topadero.settings.v1', // localStorage: preferencias de jugador (volúmenes + entrada)
  },

  // --- Cañón que apunta y dispara (prototipo; subsistema reactivo en sim/cannon.ts). Determinista:
  // todo se consume en el paso fijo. Por ahora solo se usa en la escena debug (circuito real sin
  // cañones → inerte). El impacto del proyectil reutiliza el knockback (cap knockbackMax). ---
  cannon: {
    rotationSpeed: 1.8, // rad/s a la que gira el apuntado hacia el objetivo
    aimCadence: 0.4, // s entre re-muestreos del objetivo (lag de apuntado → esquivable)
    fireToleranceRad: 0.12, // rad: dispara si el apuntado está dentro de este ángulo del jugador
    fireReload: 1.2, // s entre disparos
    projectileSpeed: 18, // m/s
    projectileRadius: 0.25, // m (colisión esfera + render)
    projectileLife: 4, // s antes de despawn
    muzzleLength: 1.0, // m del pivote a la boca del cañón (origen del proyectil)
    contactMargin: 0.05, // m extra anti-tunneling en el contacto barrido
    knockbackStrength: 12, // m/s de empuje al impactar (capado por knockbackMax)
    // Render (primitivas, reserva si no hay malla): pedestal + cañón + esfera de proyectil.
    baseRadius: 0.5,
    baseHeight: 0.6,
    barrelRadius: 0.22,
    barrelLength: 1.4,
    color: 0x4c566a,
    projectileColor: 0xff5fa2,
    // Render (malla low-poly del sandbox): torreta articulada = pedestal ESTÁTICO + tubo que
    // apunta (barrelPivot). Offsets de escala/orientación afinables a ojo en #/sandbox/cannon
    // (Principio V); no afectan a la simulación. Reserva a las primitivas de arriba si no carga.
    meshBaseSize: 1.6, // lado del cubo objetivo del pedestal (escala uniforme 'contain')
    meshBaseDropY: -0.8, // baja el pedestal bajo el pivote para que apoye en la plataforma
    meshBarrelSize: 1.9, // lado del cubo objetivo del tubo (conserva su proporción alargada)
    meshBarrelYaw: Math.PI / 2, // gira el eje largo del tubo (+X) a -Z (boca hacia delante)
    meshBarrelOffsetZ: -0.55, // desplaza el tubo hacia delante (-Z) para que salga del pivote
  },

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
