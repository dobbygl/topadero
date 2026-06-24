<div align="center">

<img src="icon.png" alt="Topadero" width="130">

# Topadero

*Un prototipo de plataformas de obstáculos en el navegador, al estilo Fall Guys, para una persona en local.*

![Estado](https://img.shields.io/badge/estado-MVP%20jugable-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-WebGL2-000000?logo=three.js&logoColor=white)
![Rapier](https://img.shields.io/badge/Rapier-f%C3%ADsicas%20WASM-FF6B00)
![Vite](https://img.shields.io/badge/Vite-dev%20%2B%20build-646CFF?logo=vite&logoColor=white)

[Jugar ahora](https://dobbygl.github.io/topadero/) • [Código fuente](https://github.com/dobbygl/topadero) • [Características](#características) • [Puesta en marcha](#puesta-en-marcha) • [Arquitectura](#arquitectura)

<img src="art.png" alt="Key art de Topadero: personajes cápsula recorriendo un circuito de obstáculos" width="100%">

</div>

Topadero es el prototipo (MVP) de un juego de plataformas de obstáculos que corre en el navegador. Controlas un personaje cápsula en tercera persona, saltas desniveles y recorres un circuito corto hasta una meta cronometrada. Su única razón de existir es validar una hipótesis: que mover esa cápsula sobre un motor de físicas resulta divertido y responde bien. Todo lo demás está al servicio de esa pregunta.

> [!TIP]
> El MVP está implementado y publicado. Puedes [jugar en el navegador](https://dobbygl.github.io/topadero/) sin instalar nada.

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

**Requisitos:** Node.js 22 (la versión usada en CI), npm y un navegador de escritorio con WebGL2 y WebAssembly.

```bash
git clone https://github.com/dobbygl/topadero.git
cd topadero
npm ci
npm run dev
```

Comandos disponibles:

| Comando | Propósito |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite |
| `npm test` | Cuatro pruebas de determinismo con Vitest |
| `npm run test:watch` | Vitest en modo interactivo |
| `npm run typecheck` | Validación estricta de TypeScript |
| `npm run build` | Typecheck y build de producción en `dist/` |
| `npm run preview` | Servir localmente el build |

La guía completa de ejecución y validación está en [`quickstart.md`](specs/001-obstacle-platformer/quickstart.md).

## Arquitectura

La línea divisoria que importa separa el **núcleo de simulación** del **render**:

- **`src/sim/`** es un núcleo *headless*: posee el mundo de Rapier, el controlador cinemático, el obstáculo y el estado del intento; no importa Three.js ni toca el DOM.
- **`src/core/gameLoop.ts`** convierte el reloj de render en pasos fijos de 60 Hz. También asigna cada flanco de teclado, capturado con timestamp, al paso de simulación correspondiente.
- **`src/render/`, `src/ui/` y `src/input/`** son vistas y adaptadores: dibujan el estado, interpolan transformaciones y traducen teclado/ratón a entrada del bucle.
- **`src/circuit.ts`** es la fuente compartida de la geometría que utilizan física y render.
- **`src/config.ts`** concentra todos los parámetros de ajuste (velocidad, salto, umbral de caída, cámara…) en un único lugar.

```text
src/
├── main.ts            # Bootstrap: await RAPIER.init(), arma simulación + render + input + HUD
├── config.ts          # Único lugar de parámetros de ajuste
├── circuit.ts         # Definición única del circuito
├── core/gameLoop.ts   # Paso fijo, ventanas temporales de input e interpolación
├── sim/               # Núcleo headless: Rapier, jugador, obstáculo y estado del intento
├── input/             # Teclado + ratón, pointer lock y buffer de eventos
├── render/            # Mallas Three.js y cámara de seguimiento
└── ui/hud.ts          # Overlay DOM: cronómetro, victoria, aviso de reinicio
```

> [!IMPORTANT]
> Que el núcleo sea instanciable sin navegador permite verificar la regla no negociable del proyecto: `tests/determinism.test.ts` ejercita la simulación a 60 Hz, con jitter, a 30 Hz y a 144 Hz sobre los mismos inputs. Si falla, el despliegue se bloquea.

## Estado, pruebas y despliegue

El MVP se construyó con [Spec Kit](https://github.com/github/spec-kit), siguiendo el flujo constitución → especificación → clarificación → plan → tareas → implementación. Las tres rebanadas están terminadas:

- [x] **P1 — Control y sensación.** Movimiento, salto, cámara y colisiones estables.
- [x] **P2 — Circuito hasta la meta.** Plataformas, rampa, obstáculo móvil, cronómetro y victoria.
- [x] **P3 — Caída y reinicio.** Respawn y reinicio del intento sin recargar.

Cada push a `main` ejecuta en GitHub Actions:

```text
npm ci → npm test → npm run build → GitHub Pages
```

Un test o build fallido bloquea el despliegue. Vite usa `base: './'` para que el mismo artefacto funcione en desarrollo y bajo `/topadero/` en GitHub Pages.

El build actual incluye Rapier WASM embebido y genera un chunk principal grande (aprox. 2,76 MB sin comprimir). Es una mejora futura de carga, no un bloqueo funcional del MVP.

## Documentación

| Documento | Descripción |
|---|---|
| [Constitución](.specify/memory/constitution.md) | Principios y gobernanza |
| [Especificación](specs/001-obstacle-platformer/spec.md) | Historias, requisitos y criterios de éxito |
| [Plan](specs/001-obstacle-platformer/plan.md) | Arquitectura prevista y estado final |
| [Tareas](specs/001-obstacle-platformer/tasks.md) | Registro de implementación completado |
| [Quickstart](specs/001-obstacle-platformer/quickstart.md) | Ejecución y checklist de regresión |
| [Contratos](specs/001-obstacle-platformer/contracts/) | Fronteras actuales de simulación y controles |
