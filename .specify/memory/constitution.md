<!--
SYNC IMPACT REPORT
==================
Version change: plantilla sin versionar -> 1.0.0
Ratification: 2026-06-24 (primera ratificación)
Bump rationale: Primera materialización de la plantilla en una constitución concreta (MAJOR / establecimiento inicial).

Principios definidos:
  I.   La sensación de juego manda
  II.  Física determinista e independiente de la tasa de refresco (NO NEGOCIABLE)
  III. Disciplina de alcance del prototipo (YAGNI)
  IV.  Rebanadas verticales jugables
  V.   Comportamiento sobre cifras: simplicidad y ajuste fácil

Secciones añadidas:
  - Restricciones técnicas y de plataforma (Sección 2)
  - Flujo de desarrollo y puertas de calidad (Sección 3)

Secciones eliminadas: ninguna (se rellenaron los marcadores de la plantilla).

Estado de plantillas dependientes:
  ✅ .specify/templates/plan-template.md  (Constitution Check genérico que apunta a este archivo; alineado, sin cambios)
  ✅ .specify/templates/spec-template.md  (user stories priorizadas e independientemente testables; alineado con Principio IV, sin cambios)
  ✅ .specify/templates/tasks-template.md (tests OPCIONALES; coherente con Principios II y V, sin cambios)
  ➖ .specify/templates/commands/*.md      (no existe en el repositorio)
  ➖ README.md / docs/quickstart.md        (no existen en el repositorio)

Follow-up TODOs: ninguno.
-->

# Constitución de Topadero

Topadero es un prototipo (MVP) de juego de plataformas de obstáculos en navegador,
para un solo jugador en local, al estilo Fall Guys. Su única razón de existir es validar
una hipótesis: que controlar un personaje cápsula sobre un motor de físicas resulta
divertido y responde bien. Esta constitución fija las reglas no negociables que protegen
esa hipótesis y mantienen el prototipo barato, enfocado y honesto.

## Core Principles

### I. La sensación de juego manda

El control del personaje es la hipótesis bajo prueba; todo lo demás existe para servirla.
Ninguna funcionalidad nueva DEBE degradar la respuesta o la sensación del control validado
en la User Story 1, aunque sea "técnicamente correcta": eso cuenta como regresión.

Para que esto sea verificable y no una opinión, la puerta de aceptación de cada historia
es la prueba manual contra sus *Acceptance Scenarios* y los *Success Criteria* de la spec,
no la mera ausencia de errores de compilación. En concreto, una entrega del control DEBE
cumplir como mínimo: la cámara sigue al personaje sin saltos bruscos, el personaje no
atraviesa la geometría y desliza de forma continua al rozar paredes y rampas (US1), el
salto solo ocurre con el personaje apoyado y nunca en el aire (SC-002), y el prototipo se
ejecuta de forma fluida (objetivo SC-008: >= 60 FPS, sin caídas por debajo de un nivel
jugable).

**Razón**: es un MVP cuyo propósito es validar diversión y respuesta; medir contra
escenarios concretos convierte "se siente bien" en algo que se puede aprobar o rechazar.

### II. Física determinista e independiente de la tasa de refresco (NO NEGOCIABLE)

La simulación física DEBE correr con un paso de tiempo fijo, desacoplado de la tasa de
render. El mismo input DEBE producir la misma trayectoria (misma distancia y arco de salto,
misma velocidad de avance) con independencia de los FPS; la diferencia de comportamiento
entre ~30 FPS y ~144 FPS DEBE ser imperceptible para el jugador (FR-013, SC-004). La lógica
de movimiento y físicas NO DEBE escalar por el delta de fotograma crudo de forma que altere
la trayectoria según los FPS.

Esta invariante DEBE verificarse de forma automática. El mecanismo concreto (test de
determinismo, simulación a pasos forzados, etc.) lo decide el plan; lo que esta constitución
exige es que la verificación exista y se ejecute, no que sea manual.

**Razón**: es la única propiedad de corrección a la vez esencial para el prototipo y
objetivamente comprobable; dejarla a la inspección visual la convierte en una promesa rota
en silencio.

### III. Disciplina de alcance del prototipo (YAGNI)

El trabajo DEBE respetar el alcance declarado en la spec acordada. Para este MVP, el
*Out of Scope* es vinculante: NADA de multijugador o red, modelos 3D o animaciones, audio,
menús, progresión o desbloqueos, ni varios niveles (es un único circuito corto). La escena
se construye ÚNICAMENTE con primitivas (cápsulas, cajas, cilindros) y el personaje usa un
collider cápsula con un controlador de personaje cinemático.

Cualquier trabajo fuera de ese alcance DEBE bloquearse hasta enmendar primero la spec y, si
toca un principio, esta constitución. No se añade infraestructura "por si acaso".

**Razón**: la disciplina de alcance es lo que mantiene el prototipo barato y centrado en la
hipótesis; cada extra no pedido retrasa la respuesta a la única pregunta que importa.

### IV. Rebanadas verticales jugables

La construcción DEBE seguir el orden de prioridad de las historias: P1 (control y sensación)
antes que P2 (circuito con meta y cronómetro) antes que P3 (caída/respawn y reinicio). Cada
historia DEBE ser jugable y testable de forma independiente y entregar valor por sí sola.

No DEBE iniciarse una historia de menor prioridad antes de validar la superior contra sus
*Acceptance Scenarios*. Cada checkpoint es un punto de PARAR y validar.

**Razón**: replica las user stories priorizadas e independientes de la spec y la estrategia
de entrega incremental; valida la base (el control) antes de apoyar nada encima.

### V. Comportamiento sobre cifras: simplicidad y ajuste fácil

La spec fija el comportamiento cualitativo, no las cifras. Los valores de ajuste (velocidad
de movimiento, altura de salto, umbral de caída, retardo de respawn, suavizado de cámara,
etc.) DEBEN vivir como parámetros con nombre y reunidos en un solo lugar, no como números
mágicos dispersos por el código. Iterar sobre la sensación significa cambiar esas cifras a
menudo: tienen que ser triviales de encontrar y modificar.

Se DEBE preferir el enfoque más simple que pase la prueba de juego; se DEBE evitar la
abstracción prematura. La estabilidad de colisiones es un suelo de corrección duro: sin
atravesar geometría (tunneling) y con deslizamiento razonable, incluso cuando un obstáculo
en movimiento empuja al personaje contra una pared.

**Razón**: un prototipo de "feel" se afina cambiando números constantemente; centralizarlos
y mantener el código simple es lo que hace rápida esa iteración.

## Restricciones técnicas y de plataforma

- **Plataforma**: navegador de escritorio, un solo jugador, en local. Sin backend, sin red y
  sin persistencia más allá de la sesión en curso.
- **Construcción de escena**: solo primitivas (cápsulas, cajas, cilindros); sin modelos 3D ni
  audio. Personaje con collider cápsula y controlador de personaje cinemático.
- **Físicas**: paso de tiempo fijo y desacoplado del render (ver Principio II).
- **Rendimiento**: objetivo >= 60 FPS en un navegador de escritorio típico, sin caer por
  debajo de un nivel jugable (SC-008).
- **Recuperación**: tras caer por debajo del umbral, el jugador recupera el control en una
  posición jugable en pocos segundos (objetivo <= 3 s, SC-005), sin recargar la página.
- **Stack concreto**: el motor de render y la biblioteca de físicas se eligen en el plan
  (`/speckit-plan`). La elección DEBE ser ejecutable en navegador y respetar estas
  restricciones; esta constitución no fija librerías concretas.

## Flujo de desarrollo y puertas de calidad

- **Orientado a la spec**: el flujo es spec -> (clarify) -> plan -> tasks -> implement.
  Todo `[NEEDS CLARIFICATION]` que afecte a un comportamiento DEBE resolverse antes de
  implementar ese comportamiento.
- **Puerta principal (manual)**: prueba de juego de la historia entregada contra sus
  *Acceptance Scenarios* y los *Success Criteria* aplicables.
- **Puerta automática (mínima)**: verificación de determinismo e independencia de FPS de las
  físicas (Principio II). Más allá de eso, los tests automáticos son OPCIONALES y se añaden
  donde compensen; no se exigen por cada funcionalidad.
- **Estabilidad de colisiones**: antes de dar por terminada una historia con circuito, se
  DEBE comprobar la ausencia de tunneling y el deslizamiento estable.
- **Cadencia**: cada tarea se valida en su checkpoint antes de avanzar; se hace commit tras
  cada grupo lógico de cambios.

## Governance

Esta constitución prevalece sobre las prácticas ad hoc durante el desarrollo del prototipo.

- **Enmiendas**: se documentan en este archivo, se versionan según la política de abajo y se
  propagan a las plantillas dependientes (plan, spec, tasks) y a cualquier guía de ejecución
  que exista en su momento.
- **Política de versionado (SemVer)**: MAJOR cuando se elimina o redefine de forma
  incompatible un principio o una regla de gobernanza; MINOR cuando se añade un principio o
  sección, o se amplía materialmente una guía; PATCH para aclaraciones, redacción y arreglos
  no semánticos.
- **Cumplimiento**: el *Constitution Check* de cada plan DEBE confirmar que el trabajo respeta
  estos principios. Las violaciones se justifican en *Complexity Tracking* con una alternativa
  más simple razonada, o el trabajo se rechaza.
- **Cambios de alcance**: cualquier cosa listada en *Out of Scope* requiere enmendar primero
  la spec (y esta constitución si toca un principio) antes de implementarse.

**Version**: 1.0.0 | **Ratified**: 2026-06-24 | **Last Amended**: 2026-06-24
