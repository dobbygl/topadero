# Quickstart — Validación manual (Audio)

Puerta principal (Principio I): prueba de juego contra los Acceptance Scenarios. Puerta automática
(Principio II): el test de determinismo sigue en verde **sin cambios** (el audio no toca `src/sim/`).

## Arranque

```bash
npm install
npm run dev            # servidor de desarrollo
npm run build && npm run preview   # build de producción servible
```

El audio requiere una primera interacción (clic/tecla/toque) por las políticas de autoplay.

## Generar / colocar los assets (una vez)

```bash
# SFX con licencia comercial (ElevenLabs Starter); lee ELEVENLABS_API_KEY de .env. Script de DEV.
npx tsx scripts/gen-sfx.ts        # genera public/audio/sfx_*.{ogg,mp3} desde prompts/audio-sfx.prompt
# Música: colocar a mano un loop CC0/royalty-free en public/audio/music_gameplay.{ogg,mp3} + créditos
```

## US1 — Oír las acciones núcleo y silenciar (P1)

1. Tras la primera interacción, **salta** y oye el efecto de salto. [AS1]
2. **Aterriza** tras un salto o caída y oye el aterrizaje. [AS2]
3. Deja que un **obstáculo te empuje** y oye el golpe. [AS3]
4. **Cruza la meta** y oye el efecto de victoria. [AS4]
5. Pulsa la **tecla de silencio**: el audio se silencia al instante; vuelve a pulsarla y se oye otra
   vez. Ajusta volúmenes (por ahora vía `config.ts`). [AS5, SC-002]
6. Antes de interactuar, comprueba que **no suena nada ni hay error** (autoplay). [AS6]

## US2 — Música de fondo (P2)

1. Al jugar, suena una **música de fondo en bucle** sin corte perceptible al empalmar. [AS1, SC-003]
2. Baja solo el **volumen de la música**: los efectos siguen al volumen anterior (y viceversa).
   [AS2, SC-002]
3. Con música + efectos a la vez, la mezcla **no satura** a volúmenes por defecto. [AS3, SC-006]

## US3 — Efectos secundarios (P3, alcance reducido)

1. **Cáete por un borde** y oye el efecto de reaparición. [AS1]
2. Menú/pausa/"nueva marca": se validan al aterrizar el shell (006) y la persistencia (007); en esta
   feature quedan definidos y conectados, no se disparan todavía.

## Degradación

- En **modo avión / sin assets de audio**: el juego se completa igualmente en silencio, sin pantalla
  en blanco ni errores. [SC-005]

## Puerta automática — determinismo (Principio II)

```bash
npx vitest run tests/determinism.test.ts   # debe seguir en verde, SIN cambios (src/sim no se toca)
npx vitest run tests/audio                 # (opcional) unit del detector de eventos
```

## Comprobación de frontera

- `src/sim/` no importa `src/audio/` ni carga assets; el audio lee el estado de solo lectura.
- El audio se reproduce fuera del paso fijo; no altera trayectorias.
- El control y la sensación de juego se perciben igual que antes del audio (SC-007).
