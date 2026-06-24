<div align="center">

<img src="icon.png" alt="Topadero" width="130">

# Topadero

*Un prototipo de plataformas de obstáculos en el navegador, al estilo Fall Guys, para una persona en local.*

![Estado](https://img.shields.io/badge/estado-prototipo-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-WebGL2-000000?logo=three.js&logoColor=white)
![Rapier](https://img.shields.io/badge/Rapier-f%C3%ADsicas%20WASM-FF6B00)
![Vite](https://img.shields.io/badge/Vite-dev%20%2B%20build-646CFF?logo=vite&logoColor=white)

[Características](#características) • [Cómo se juega](#cómo-se-juega) • [Puesta en marcha](#puesta-en-marcha) • [Arquitectura](#arquitectura) • [Estado y desarrollo](#estado-y-desarrollo)

<img src="art.png" alt="Key art de Topadero: personajes cápsula recorriendo un circuito de obstáculos" width="100%">

</div>

Topadero es el prototipo (MVP) de un juego de plataformas de obstáculos que corre en el navegador. Controlas un personaje cápsula en tercera persona, saltas desniveles y recorres un circuito corto hasta una meta cronometrada. Su única razón de existir es validar una hipótesis: que mover esa cápsula sobre un motor de físicas resulta divertido y responde bien. Todo lo demás está al servicio de esa pregunta.

> [!NOTE]
> Proyecto en fase temprana y dirigido por especificación. El diseño está cerrado (especificación, plan, contratos y constitución); la implementación llega con `/speckit-tasks` + `/speckit-implement`. Aún no hay código fuente en el repositorio.

## Características

- **Control en tercera persona** con cámara orbital que sigue al personaje de forma suave, sin saltos bruscos.
- **Físicas deterministas e independientes de la tasa de fotogramas**: el mismo input produce la misma trayectoria a 30 o a 144 FPS.
- **Salto solo apoyado**: nada de doble salto ni salto en el aire.
- **Circuito de primitivas** con plataformas, una rampa y al menos un obstáculo en movimiento que te empuja al contacto.
- **Cronómetro por intento** y estado de victoria con el tiempo al cruzar la meta.
- **Respawn al caer** en pocos segundos y **reinicio del intento** con una tecla, sin recargar la página.

Sin multijugador, sin modelos 3D, sin audio y sin menús: la escena se construye solo con cápsulas, cajas y cilindros.

## Cómo se juega

| Acción | Tecla / entrada |
|---|---|
| Mover (relativo a la cámara) | `W` `A` `S` `D` o flechas |
| Saltar (solo apoyado) | `Espacio` |
| Orbitar la cámara | Ratón (clic en el canvas para capturar el puntero) |
| Reiniciar el intento | `R` |

> [!TIP]
> El cronómetro arranca con tu primer movimiento o salto, no al mover la cámara. Cae por un borde y reaparecerás en la salida sin perder la partida.

## Puesta en marcha

**Requisitos:** Node.js 20+ y un navegador de escritorio con WebGL2 y WebAssembly.

> [!IMPORTANT]
> Estos scripts son los **previstos** para cuando exista la implementación (tras `/speckit-tasks` + `/speckit-implement`). Hoy el repositorio aún no incluye `package.json`, así que todavía no se ejecutan.

```bash
npm install      # three, @dimforge/rapier3d-compat, vite, vitest, typescript
npm run dev      # arranca Vite; abre la URL que imprime (p. ej. http://localhost:5173)
npm run build    # build de producción
npm run preview  # sirve el build de producción
npm test         # Vitest, incluye la puerta de determinismo (Principio II)
```

La guía completa de puesta en marcha y validación está en [`quickstart.md`](specs/001-obstacle-platformer/quickstart.md).

## Arquitectura

La línea divisoria que importa separa el **núcleo de simulación** del **render**:

- **`src/sim/`** es un núcleo *headless*: posee el mundo de Rapier (controlador de personaje cinemático con cápsula, obstáculo móvil, zonas de salida y meta) y no importa Three.js ni toca el DOM. Avanza con **paso de tiempo fijo mediante acumulador** (60 Hz), desacoplado del render.
- **`src/render/`, `src/ui/` y `src/input/`** son vistas y adaptadores puros: leen el estado de la simulación, lo dibujan e interpolan entre estados para suavizar el movimiento a tasas de render altas.
- **`src/config.ts`** concentra todos los parámetros de ajuste (velocidad, salto, umbral de caída, cámara…) en un único lugar.

```text
src/
├── main.ts            # Bootstrap: await RAPIER.init(), arma simulación + render + input + HUD
├── config.ts          # Único lugar de parámetros de ajuste
├── core/gameLoop.ts   # Bucle de paso fijo (acumulador) e interpolación de render
├── sim/               # Núcleo headless: simulación, jugador (KCC), obstáculo, zonas, estado del intento
├── input/             # Teclado + ratón (pointer lock), buffer de flancos
├── render/            # Mallas Three.js y cámara de seguimiento
└── ui/hud.ts          # Overlay DOM: cronómetro, victoria, aviso de reinicio
```

> [!IMPORTANT]
> Que el núcleo sea instanciable sin navegador es lo que permite verificar la regla no negociable del proyecto: `tests/determinism.test.ts` ejercita la simulación con varias líneas de tiempo de fotograma (60 Hz, jitter, 144 Hz) sobre los mismos inputs y comprueba que el estado coincide. Si ese test falla, ninguna historia se considera terminada.

## Estado y desarrollo

El proyecto se construye con [Spec Kit](https://github.com/github/spec-kit), siguiendo el flujo constitución → especificación → clarificación → plan → tareas → implementación. Las reglas no negociables (sensación de juego, físicas deterministas, disciplina de alcance) viven en la constitución.

| Documento | Descripción |
|---|---|
| [Constitución](.specify/memory/constitution.md) | Principios y gobernanza del proyecto |
| [Especificación](specs/001-obstacle-platformer/spec.md) | Historias de usuario, requisitos y criterios de éxito |
| [Plan](specs/001-obstacle-platformer/plan.md) | Stack, arquitectura y estructura |
| [Quickstart](specs/001-obstacle-platformer/quickstart.md) | Puesta en marcha y checklist de validación |
| [Contratos](specs/001-obstacle-platformer/contracts/) | Seam de la simulación y mapeo de controles |

El MVP se entrega en rebanadas verticales jugables, en orden de prioridad y validando cada una antes de la siguiente:

- [ ] **P1 — Control y sensación.** Mover, saltar y cámara que sigue; colisiones estables.
- [ ] **P2 — Circuito hasta la meta.** Plataformas, rampa y obstáculo móvil; cronómetro y victoria.
- [ ] **P3 — Caída y reinicio.** Respawn al caer y reinicio del intento sin recargar.
