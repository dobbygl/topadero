# Anuncios animados de Topadero

Dos animaciones publicitarias en bucle (15 s), descargadas de claude.ai/design.
Son animaciones por código (React + un motor de timeline propio), no vídeos.

| Carpeta | Formato | Uso | Editar en claude.ai/design |
|---|---|---|---|
| `topadero-ad-16x9/` | 1920×1080 (16:9) | YouTube / landing | https://claude.ai/design/p/1f08ae6e-b99f-4ff7-9ece-d4b89024037a |
| `topadero-ad-9x16/` | 1080×1920 (9:16) | Reels / TikTok / Shorts | https://claude.ai/design/p/437323e4-f505-4e24-88d2-67a7308e6c8f |

## Estructura de cada carpeta

- `*.dc.html` — documento Claude Design (contenedor). Monta el componente vía `<x-import>`.
- `*.jsx` — el anuncio: motor de timeline + las 6 escenas (S1 logo, S2 mascota, S3 carrera,
  S4 péndulo, S5 victoria, S6 CTA). Pese a la extensión, es JS puro (`React.createElement`,
  sin sintaxis JSX).
- `support.js` — runtime de Claude Design (resuelve `<x-dc>` / `<x-import>`).
- `uploads/...` — los PNG que usa la animación (mismos assets que `marketing/assets/`).
- `covers/` (solo 16:9) — stills renderizados: frame del logo (S1) y de victoria (S5).

## Verlas

Lo más fácil es abrir el proyecto en claude.ai/design (enlaces de la tabla): allí se
reproducen con su runtime. El `.dc.html` por sí solo necesita ese entorno (inyecta React),
así que no se abre tal cual en un navegador.

## Exportar a vídeo (MP4)

`render-videos.mjs` rasteriza cada animación a MP4 con Chrome headless + ffmpeg, sin depender
del runtime de Claude Design (carga el `.jsx` con un React de CDN y captura fotograma a
fotograma con tiempo determinista).

```bash
cd marketing/animations
npm install          # instala puppeteer-core (usa el Chrome del sistema)
node render-videos.mjs            # ambos anuncios -> renders/*.mp4
node render-videos.mjs 16x9       # solo uno (16x9 | 9x16)
```

Los MP4 salen en `renders/` (ignorado por git, no se versiona). Requisitos: `ffmpeg`,
`google-chrome` y conexión (para React de CDN y las fuentes).
