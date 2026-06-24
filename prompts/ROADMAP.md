# Hoja de ruta a producto publicable

Camino desde el prototipo de feel (specs 001-003) hasta un juego publicable, bajo la constitución
v2.0.0 (pivote prototipo -> producto). Cada fila tiene su `.prompt` listo para `/speckit-specify`.

## Cómo leer los números

- El número es el **orden por defecto**, no una cadena rígida: reordena por dependencia, no por
  superstición secuencial (ver grafo).
- El **número real lo asigna `/speckit-specify`** al crear la rama, por orden de creación. Si
  desarrollas los prompts en otro orden, los números de rama cambiarán; lo que vale es el contenido
  del `.prompt`, no el número del nombre de archivo.
- Regla de la constitución (Principio IV): dentro de una spec, P1 -> P2 -> P3 y validar antes de
  seguir es no negociable; entre specs, "lo que sostiene va antes de lo que se apoya encima".

## Specs

| # | Tema | Prompt | Bloque | Estado constitución |
|---|------|--------|--------|---------------------|
| 003 | Pase de feel del control | `specs/003-control-feel-pass/` | En curso | En alcance (v2.0.0) |
| 004 | Entrada y accesibilidad (gamepad + táctil/móvil) | `spec004-input-accessibility.prompt` | Mínimo publicable | ⚠ Requiere enmienda v2.1.0 (ampliar plataforma a móvil/táctil) |
| 005 | Audio (SFX + música + volumen) | `spec005-audio.prompt` · `audio-sfx.prompt` | Mínimo publicable | En alcance (v2.0.0) |
| 006 | Shell de juego (título/pausa/resultados/ajustes) | `spec006-shell.prompt` | Mínimo publicable | En alcance (v2.0.0) |
| 007 | Persistencia local (mejor marca + preferencias) | `spec007-persistence.prompt` | Mínimo publicable | En alcance (v2.0.0) |
| 008 | Robustez y publicación (carga/errores/perf/build) | `spec008-release.prompt` | Mínimo publicable | En alcance (v2.0.0) |
| 009 | Más circuitos + progresión básica | `spec009-content.prompt` | Hacia "completo" | En alcance (v2.0.0) |

## Grafo de dependencias

```
003 (feel, en curso)
  │
  ▼
004 (entrada: gamepad + táctil/móvil)   ← abre la plataforma móvil; el shell nace responsive
  │   P1 (controles crudos) es independiente
  │   P2 (reasignación en ajustes) depende de 006 + 007
  ├────────────► 006 (shell, responsive/táctil) ──► 007 (persistencia) ──► 009 (circuitos)
  │                                                       │
005 (audio) ── independiente de 004/006 ─────────────────┤  (P3 audio de UI/marca coordina con 006/007)
  │                                                       │
  └──────────────────────────────────────────────────────┴──► 008 (robustez/publicación: al final, mide con todo cargado)
```

Lectura corta:
- **004 (entrada) y 005 (audio)** son los más independientes: pueden ir en cualquier orden o en
  paralelo. 004 va marcado primero porque el táctil/móvil condiciona el diseño del shell.
- **006 (shell)** depende del bucle (ya existe) y debe ser táctil-amigable por culpa de 004.
- **007 (persistencia)** depende de 006 (sus preferencias se ajustan en el panel del shell).
- **008 (robustez/publicación)** va casi al final: endurece y mide el rendimiento con audio + UI +
  arte + móvil ya integrados.
- **009 (circuitos)** depende de 006 + 007, pero **no de 008**: se puede adelantar si prefieres más
  contenido antes de pulir el empaquetado.

## Avisos de paralelización

- `config.ts` es un único archivo compartido (Principio V): dos ramas tocándolo a la vez = conflictos
  de merge. Paraleliza solo pares claramente independientes (p. ej. 004 y 005) y reúne sus cambios de
  `config.ts` con cuidado.
- `.specify/feature.json` y el bloque SPECKIT de `CLAUDE.md` apuntan a una sola feature activa: el
  flujo está pensado para una spec en curso cada vez.

## Bloqueo de constitución pendiente

- **004 (táctil/móvil)** amplía la plataforma de "navegador de escritorio" a escritorio + móvil.
  Requiere enmienda MINOR (orientativa v2.1.0) antes de implementar, igual que las mallas de la 002
  esperaron a la v1.1.0. La spec puede redactarse y clarificarse antes; implementar, no.

## Pulido opcional, fuera del camino crítico (no perdido)

Diferidos a conveniencia (p. ej. 010+); no bloquean el corte mínimo publicable:

- Juice de cámara y feedback de movimiento (presentación, solo render).
- Checkpoints y tiempos por tramo (loop).
- Fantasma determinista de la mejor vuelta + telemetría (medición; el determinismo es el habilitador).
- Overlay de tuning en vivo de `config.ts` (herramienta de dev, no feature de producto).
