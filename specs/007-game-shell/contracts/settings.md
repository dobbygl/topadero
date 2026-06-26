# Contrato — Ajustes del jugador (`src/settings/settings.ts` + panel `src/ui/settingsPanel.ts`)

Contrato de los ajustes editables desde el panel. Defaults en `config.ts` (Principio V); valor actual
en un registro `PlayerSettings` persistido en `localStorage` (FR-019/FR-019a). Vista pura: no toca la
física (Principio II/III).

## Modelo

`PlayerSettings` (ver `data-model.md`): `musicVolume`, `sfxVolume`, `muted`, `mouseSensitivity`,
`touchLookSensitivity`, `gamepadLookSpeed`, `invertCameraY`, `inputBindings` (reuso 004). El toggle de
**debug de físicas** NO está en `PlayerSettings`: es estado de sesión, arranca apagado (FR-018).

## Operaciones

| Operación | Efecto |
|---|---|
| `load()` | Al arrancar: leer el registro de `localStorage`; si falta o falla, usar defaults de `config`. |
| `get()` | Devuelve el `PlayerSettings` vivo (lo leen los adaptadores de audio/cámara/entrada). |
| `set(k, v)` | Acota `v` a su rango, actualiza el registro vivo, **aplica en caliente** y persiste. |
| `apply()` | Empuja los valores vivos a los sistemas: `AudioManager.setMusicVolume/setSfxVolume/setMuted`; los de mirada quedan disponibles para cámara/entrada. |

## Hot-apply (FR-016, SC-005)

- Volúmenes: `set('musicVolume'|'sfxVolume', v)` → llama al setter del `AudioManager` ya existente; el
  cambio se oye antes del siguiente segundo, sin recargar.
- Sensibilidad / invertir Y: el valor vivo lo leen la cámara y los adaptadores de entrada en su
  siguiente fotograma (tiempo de render); efecto inmediato.
- Reasignación: delega en el mecanismo de la spec 004 (`src/input/preferences.ts`); no se reimplementa.

## Persistencia y degradación (FR-019a, FR-024, SC-008)

- Clave única de `localStorage` (default en `config.ts`). Guardar en cada `set`.
- Si `localStorage` no está disponible: el registro vive en memoria con los defaults; el juego arranca
  y funciona; los cambios se aplican en la sesión aunque no sobrevivan a la recarga. Nunca pantalla en
  blanco ni excepción (degradación con elegancia).
- Compatibilidad: si el JSON guardado es inválido o de una versión vieja, se cae a defaults sin fallar.

## Invariantes (verificables)

1. Tras cambiar volumen/sensibilidad y recargar, los valores se conservan (SC-008); con storage
   bloqueado, arranca con defaults sin fallar.
2. El panel es accesible desde el título y desde la pausa (FR-015) y se aplica en caliente (FR-016).
3. El debug de físicas arranca apagado en cada carga (FR-018) y no se persiste.
4. Ningún ajuste rompe el determinismo (Principio II). Ojo: la sensibilidad SÍ escala `cameraYaw`, que
   forma parte de `StepInput` (llega al paso fijo para el movimiento relativo a cámara). No es
   violación: es como un remapeo de control (cambia el input producido, no cómo la sim lo procesa); el
   determinismo es función de los inputs y el gate usa `StepInput` sintético, así que sigue intacto.
