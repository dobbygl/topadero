# Research — Feature 002 (variedad de obstáculos y vestido gráfico)

Decisiones de Phase 0. Las dos primeras (R1 y R-carry) deciden si la puerta del Principio II
se sostiene; el resto son de pipeline y ajuste.

## Conjunto de obstáculos comprometido

La spec exige **≥3 tipos nuevos** además del vaivén actual. Se comprometen ahora para que
`tasks.md` sea descomponible:

| Obstáculo | Movimiento | Comportamiento (legible) | Rotación de collider |
|---|---|---|---|
| Vaivén senoidal (existe) | traslación lateral X | empuje lateral | no |
| **Barra/brazo giratorio** | rotación alrededor de Y | empuje **tangencial** (barrido) | sí (Y) |
| **Péndulo** | arco alrededor de X | **tirón** (impulso de arco) | sí (X) |
| **Empujador alternante** | traslación a lo largo de Z | empuje/**tirón** frontal | no |
| **Plataforma portante** | traslación horizontal (X o Z) | transporta al jugador (no empuja) | no |

"Freno" se modela como **variante de knockback** (escala de velocidad, ver R4), disponible por
config; el rodillo (rotacionalmente simétrico, giro solo visual + arrastre/freno) queda como
4º opcional, no comprometido, para no inflar el alcance.

## R1 — Modelo de obstáculo: pose pura + rotación + knockback tangencial

**Decision**: Generalizar `obstaclePosition` a `pose(simTime, params) → { position: Vec3,
quaternion: Quat }`, función pura por tipo. El cuerpo cinemático usa
`setNextKinematicTranslation` **y** `setNextKinematicRotation`. Para los obstáculos rotatorios
(barra, péndulo) el knockback se deriva de la **velocidad tangencial en el punto de contacto**
(ω × r), no solo de la velocidad lineal. `Transform` se extiende para llevar un **quaternion**
(rotación completa) y el render hace **slerp** entre poses.

**Rationale**: barra y péndulo necesitan rotación real del collider; un modelo solo-posición
los dibujaría/colisionaría mal. La velocidad tangencial es lo que hace que una barra giratoria
empuje de forma legible (una velocidad lineal-solo no empuja en el sentido correcto). El
quaternion en `Transform` casa con lo que da Rapier y evita ambigüedad de ejes; el slerp evita
stutter a 144/60 (Principio I). Todo sigue siendo función pura del tiempo → determinista.

**Alternatives considered**: (a) seguir solo con posición y "fingir" la rotación en el render
— rechazada: la colisión de la barra/péndulo sería incorrecta. (b) `rotationY` escalar como
hoy — insuficiente para el péndulo (gira en X). (c) ángulos de Euler por eje — más frágil que
un quaternion para interpolar.

## R-carry — Transporte de plataforma portante (riesgo nº1 del Principio II)

**Decision**: Solo portantes **horizontales** (clarificación FR-007; vertical excluido por
rapier #488). Cada paso fijo: `delta = platform.pose(t+dt).position − platform.pose(t).position`
(puro). Test de soporte **AABB determinista de cara superior**: los pies del jugador dentro de
los límites XZ de la plataforma + banda Y estrecha sobre su cara superior, con el jugador
apoyado/descendente. Si soporta, se **suma el delta horizontal al movimiento deseado del KCC
ANTES de `computeColliderMovement`**; se "suelta" cuando el AABB falla. Nada de consultas de
contacto de Rapier.

**Rationale**: replica exactamente el precedente de 001, que en la reconciliación sustituyó las
consultas de contacto por **AABB deterministas** para empuje/meta. Una consulta de contacto de
Rapier puede variar con el orden de resolución y romper la igualdad exacta entre cadencias;
una AABB sobre datos puros no. Sumar el delta dentro del paso fijo mantiene el transporte
independiente de los FPS. El caso vertical, excluido, es justo el que dispara el hundimiento/
rebote del KCC (#488).

**Alternatives considered**: (a) parenting cinemático / `setTranslation` del jugador — rompe el
move-and-slide y arriesga tunneling. (b) consultas de contacto de Rapier para detectar soporte
— riesgo de no-determinismo (rechazada por el precedente de 001). (c) portantes verticales con
mitigación — descartada en clarify por el riesgo desproporcionado al Principio II.

## R3 — Pipeline de assets en la capa de render

**Decision**: `render/assets.ts` (NUEVO, solo render) carga de forma **asíncrona y antes de
jugar** (en `main.ts`, tras `RAPIER.init()` y antes de arrancar el bucle): skybox/fondo y
texturas con `TextureLoader`, mallas low-poly con `GLTFLoader` (three/examples), formato
**GLB**. Los campos **visual-only** (`meshUrl`, `texture`) viven en `circuit.ts` junto a la
geometría, igual que `color` hoy, y `src/sim/` los **ignora**. Regla dura: **cero imports de
Three o de assets alcanzables desde `src/sim/`** (si no, el test de determinismo en Node deja
de cargar). Si un asset falta o no carga, **reserva a la apariencia primitiva actual**
(BoxGeometry/CapsuleGeometry + color), sin fallo ni no-determinismo.

**Rationale**: la carga antes de jugar saca toda la latencia del paso fijo (FR-016). El patrón
"dato visual en `circuit.ts`, ignorado por sim" ya existe (`StaticBox.color`) y mantiene una
sola fuente de verdad de la geometría sin acoplar el núcleo. La reserva a primitivas hace el
juego robusto y preserva un modo "solo primitivas" implícito (Assumptions de la spec).

**Alternatives considered**: (a) cargar assets bajo demanda en runtime — riesgo de hitches y de
acoplar carga con el bucle. (b) hornear assets en el build — más rígido para iterar arte. (c)
colocar `meshUrl` en un módulo aparte de render — duplicaría la fuente de verdad de la geometría.

## R4 — Variantes de knockback (empuje / freno / tirón)

**Decision**: reutilizar el canal `knockbackX/knockbackZ` del jugador y parametrizar por config
tres variantes, todas consumidas **dentro del paso fijo** (flanco/within-step, nunca por
fotograma): **empuje** (impulso direccional, como hoy), **tirón** (impulso de mayor magnitud,
para el péndulo/empujador, con tope `knockbackMax` anti-tunneling), **freno** (factor de escala
< 1 sobre la velocidad horizontal del jugador). Para rotatorios, la dirección/magnitud usa la
velocidad tangencial (R1).

**Rationale**: no se introduce un sistema nuevo; se extiende el existente, que ya está cubierto
por el test y respeta el Principio II. Mantiene el ajuste en `config.ts` (Principio V).

**Alternatives considered**: motor de fuerzas por obstáculo — sobreingeniería para un prototipo.

## R5 — Crecimiento de la puerta de determinismo

**Decision**: añadir a `tests/determinism.test.ts`, a las **4 cadencias** (60/jitter/30/144) y
con **igualdad exacta a igual nº de pasos** (epsilon `FLOAT_EPSILON`): (a) un caso por tipo de
obstáculo nuevo que mida su efecto en la trayectoria del jugador (barra, péndulo, empujador);
(b) un caso de **transporte sobre plataforma portante** (el jugador apoyado viaja la misma
distancia a cualquier FPS); (c) la pureza de `pose()`/velocidad de cada tipo. Sin estos casos,
la rebanada P1 no se considera terminada (Principio II).

**Rationale**: la constitución y SC-002 exigen que la verificación crezca con el comportamiento
nuevo; el transporte portante es el más delicado y necesita su propio caso.

**Alternatives considered**: validar solo a ojo en playtest — viola la puerta automática.

## R6 — Presupuesto de rendimiento y arte

**Decision**: low-poly acotado a propósito; presupuesto orientativo en `config.ts`/notas de arte
(p. ej. props ≲ 1-2k tris, mallas de obstáculo/personaje ≲ 3-5k tris, texturas ≤ 1024², skybox
ligero). Reutilizar instancias/materiales donde haya props repetidos. Las cifras exactas son
ajuste por playtest (Principio V), no parte del contrato. Objetivo: SC-005 (≥60 FPS con todo
cargado).

**Rationale**: el bundle ya arrastra Rapier WASM (~2,76 MB); el arte debe sumar poco. Mantener
el presupuesto explícito evita degradar SC-005.

**Alternatives considered**: alta poligonización con LOD — fuera de alcance y de propósito (es
low-poly por diseño).

## Generación de assets (fase implement, no runtime)

Imágenes 2D con **gpt-image-2** (OpenAI; `OPENAI_API_KEY` en `.env` **local** gitignored, no
`../allbrands/.env`); mallas low-poly con **Meshy** (vía MCP, con confirmación de coste en
créditos antes de cada generación). Referencia de arte: `./marketing` (paleta cartoon, mascot,
props pendulum/cannon/ramp/finish ya existentes, reaprovechables como texturas/decals o como
semilla de imagen→3D). Esto ocurre en `/speckit-implement`, no aquí.
