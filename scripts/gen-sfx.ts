// Script de DEV (no entra en el runtime ni en el build): genera los efectos de sonido de Topadero
// con la API de ElevenLabs (text-to-sound-effects) y los deja en public/audio/ como .mp3 + .ogg.
// Licencia comercial: requiere una cuenta de pago (Starter+). La clave se lee de la variable de
// entorno ELEVENLABS_API_KEY (p. ej. desde .env); NUNCA se incrusta en el código ni en el build.
//
// Uso:  set -a; . ./.env; set +a;  node --experimental-strip-types scripts/gen-sfx.ts
// Requiere ffmpeg en el PATH para la conversión a .ogg (si falta, deja solo .mp3).

import { mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const API = 'https://api.elevenlabs.io/v1/sound-generation'
const OUT_DIR = 'public/audio'

// Prompts de los SFX en alcance (005): núcleo + reaparición. Estética candy/Fall Guys: alegre,
// mullido, caricaturesco; ver prompts/audio-sfx.prompt para la lista completa.
const SFX: { key: string; prompt: string; seconds: number }[] = [
  { key: 'sfx_jump', seconds: 0.5, prompt: 'Playful cartoon jump, soft springy boing with a light whoosh upward, bouncy and friendly, very short, clean, no reverb tail' },
  { key: 'sfx_land', seconds: 0.5, prompt: 'Soft cartoon landing, gentle cushioned thud with a tiny squish, playful, short, light low-end, no harshness' },
  { key: 'sfx_hit', seconds: 0.5, prompt: 'Comedic cartoon bonk, soft rubbery boing-thump as a character gets bumped away, springy, harmless and funny, short, bouncy' },
  // sfx_finish: NO se genera aquí. La meta usa un jingle CC0 de Kenney (Music Jingles, STEEL07);
  // ver CREDITS.md. No regenerar para no pisar el asset CC0.
  { key: 'sfx_respawn', seconds: 0.6, prompt: 'Soft pop and gentle ascending whoosh, friendly reappear sound with a light magical shimmer, short' },
]

async function main(): Promise<void> {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) {
    console.error('Falta ELEVENLABS_API_KEY (carga .env: set -a; . ./.env; set +a).')
    process.exit(1)
  }
  await mkdir(OUT_DIR, { recursive: true })
  const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
  if (!hasFfmpeg) console.warn('ffmpeg no encontrado: se dejará solo .mp3 (sin .ogg).')

  for (const s of SFX) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: s.prompt, duration_seconds: s.seconds }),
    })
    if (!res.ok) {
      console.error(`FALLO ${s.key}: HTTP ${res.status} ${await res.text()}`)
      process.exit(1)
    }
    const mp3 = `${OUT_DIR}/${s.key}.mp3`
    await writeFile(mp3, Buffer.from(await res.arrayBuffer()))
    let line = `OK ${s.key}.mp3`
    if (hasFfmpeg) {
      const r = spawnSync('ffmpeg', ['-y', '-i', mp3, '-c:a', 'libvorbis', '-q:a', '4', `${OUT_DIR}/${s.key}.ogg`], { stdio: 'ignore' })
      if (r.status === 0) line += ` + ${s.key}.ogg`
    }
    console.log(line)
  }
  console.log('SFX generados en', OUT_DIR)
}

void main()
