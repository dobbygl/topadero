# Data Model — Audio (Fase 1)

Entidades a nivel de comportamiento. Todas viven en la capa de audio (`src/audio/`) y en el ajuste
(`config.ts`); ninguna está en `src/sim/` ni altera el estado de simulación.

## Efecto de sonido (SFX)
Sonido corto asociado a un evento del juego.
- `key`: identificador (jump, land, hit, finish, respawn; secundarios diferidos: ui_*, pause,
  new_best).
- `event`: el evento de audio que lo dispara (ver más abajo).
- `src`: rutas del asset (`.ogg`/`.webm` + `.mp3`), en `public/audio/` (servidas en `/play`).
- En esta iteración entran: `jump`, `land`, `hit`, `finish`, `respawn` (decisión de clarify).

## Pista de música
- `key`: `music_gameplay` (única en esta iteración; la de menú se difiere al shell).
- `src`: rutas del asset (CC0/royalty-free), loopable.
- `loop`: true.

## Preferencias de audio  *(seam para shell 006 y persistencia 007)*
- `musicVolume`: 0..1 (default en `config.ts`).
- `sfxVolume`: 0..1 (default en `config.ts`).
- `muted`: boolean (silencio global; lo conmuta la tecla de silencio).
- Viven en memoria con sus defaults; la UI de sliders (shell) y el guardado (persistencia) las
  consumen sin cambiar su forma.

## Evento de audio
Cambio observable del estado de la simulación que dispara un sonido. Lo deriva el detector PURO a
partir de dos snapshots de estado consecutivos (anterior y actual), en el tiempo de render.
- `jump`: flanco apoyado→aire con `verticalVelocity` por encima de un umbral (`config.ts`).
- `land`: `isGrounded` pasa de `false` a `true`.
- `hit`: la magnitud del knockback (`velocity.x/z`) cruza al alza un umbral desde ~0.
- `finish`: `RunStateView.phase` pasa de `running` a `won`.
- `respawn`: discontinuidad de posición entre fotogramas mayor que un umbral.

## Snapshot de estado (para la detección)
Copia ligera de solo lectura del fotograma anterior que el detector compara con el actual.
- De `PlayerStateView`: `position`, `isGrounded`, `verticalVelocity`, `velocity` (knockback).
- De `RunStateView`: `phase`.
- No se persiste; vive en la capa de audio entre fotogramas.

## Umbrales y ajuste (en `config.ts`)
- Volúmenes por defecto (música, SFX), silencio por defecto.
- Umbral de velocidad vertical para distinguir salto de caída.
- Umbral de knockback para el golpe.
- Umbral de discontinuidad de posición para la reaparición.
- Rutas de los assets de audio.
