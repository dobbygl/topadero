# Quickstart — Validación manual (Entrada, accesibilidad y PWA)

Puerta principal (Principio I): prueba de juego manual contra los Acceptance Scenarios. Puerta
automática (Principio II): el test de determinismo en verde. Validar en el orden de las historias
(US1 → US4 → US2 → US3); cada una es un punto de parar y comprobar.

## Arranque

```bash
npm install
npm run dev            # servidor de desarrollo (escritorio)
npm run build && npm run preview   # build de producción servible (necesario para probar la PWA)
```

Para móvil: abrir el `preview` desde el móvil en la misma red, o emular táctil en las DevTools de
Chrome (Device Toolbar). La PWA requiere servir el build (`preview`), no solo `dev`.

## US1 — Jugar con mando o con los dedos (P1)

Mando (conecta un gamepad y pulsa un botón para que el navegador lo detecte):
1. Stick izquierdo → el personaje se mueve relativo a la cámara (como WASD). [AS1]
2. Botón de salto, apoyado → salta; en el aire → no salta (solo apoyado). [AS2]
3. Stick derecho → la cámara orbita. [AS3]
4. Completa el circuito de principio a fin solo con el mando. [SC-001]

Táctil (móvil o emulación táctil):
5. Arrastra el joystick (mitad izquierda) → el personaje se mueve con intensidad proporcional. [AS4]
6. Botón de salto (abajo-derecha), apoyado → salta; en el aire → nada. [AS5]
7. Arrastra en la mitad derecha → la cámara orbita, sin disparar salto ni movimiento. [AS6]
8. Mueve con el joystick y salta con la otra mano a la vez (multi-touch) → ambos responden.
9. Completa el circuito de principio a fin solo con táctil. [SC-002]

Cambio de esquema:
10. Con una partida en curso, conecta/usa el mando (o toca la pantalla) → el esquema cambia sin
    recargar ni perder el control; el overlay táctil aparece solo en táctil. [AS7, SC-003]
11. Desconecta el mando a mitad de movimiento → el personaje no se queda "pegado" avanzando.

## US4 — Instalar como app (PWA) (P2)  *requiere el build servido (`preview`)*

1. Abre la landing (raíz) en un móvil/navegador compatible → aparece una invitación a instalar no
   intrusiva y descartable. [AS1]
2. En iOS Safari (sin prompt) → se muestran instrucciones equivalentes ("Compartir → Añadir a
   pantalla de inicio"). [AS2]
3. Descarta la invitación → la navegación sigue normal y no reaparece de forma molesta. [AS3]
4. Instala → queda un icono de Topadero; ábrelo → arranca el juego (`/play`) a pantalla completa,
   sin barra del navegador y sin pasar por la landing. [AS4, FR-018]
5. Tras una carga, activa el modo avión y abre la app → el juego arranca y se juega sin conexión.
   [AS5, FR-019]
6. Compara la física instalado vs en pestaña → idéntica (instalar no cambia trayectoria ni salto).
   [AS6, FR-020]
7. Con una versión nueva desplegada → al reabrir, la app no se queda atascada en la vieja
   indefinidamente. [edge case "actualización"]

## US2 — Sensibilidad y reasignación (P2)

Mientras la UI de ajustes llega con la spec del shell, validar a nivel de comportamiento tocando los
valores en `config.ts`:
1. Cambia la asignación de salto a otra tecla/botón → salta con el nuevo control; el anterior ya no
   dispara salto. [AS1]
2. Sube la sensibilidad de cámara → gira más con el mismo movimiento físico. [AS2]
3. Activa la inversión del eje vertical → la cámara responde en sentido contrario. [AS3]

## US3 — Accesibilidad (P3)

1. Activa `reducedMotion` → el movimiento/sacudida de cámara se atenúa de forma perceptible, sin que
   cambie la trayectoria del personaje ni la física. [AS1]
2. En táctil → joystick y botón son cómodos de acertar y no ocultan al personaje ni la meta. [AS2]
3. Activa mayor contraste/tamaño de HUD → el cronómetro y los textos se leen con claridad. [AS3]

## Puerta automática — determinismo (Principio II, NO NEGOCIABLE)

```bash
npm test                                  # toda la suite, incluida la puerta de determinismo
npx vitest run tests/determinism.test.ts  # solo la puerta
```

Debe estar en verde, incluidos los casos nuevos: `moveAxis` analógico parcial y flancos de salto
de fuente mando/táctil, idénticos a 30 / 60 / jitter / 144 Hz. Si falla, la feature no está
terminada.

## Comprobación de frontera

- `src/sim/` no importa `src/input`, `src/ui`, la capa PWA ni carga assets.
- Mando y táctil solo rellenan `FrameInput`; los flancos los consume el bucle por ventana de
  timestamp (no por fotograma).
- El service worker y el manifest viven en el scope del juego (`/play`) y no tocan el paso fijo.
