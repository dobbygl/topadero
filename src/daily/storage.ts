// Persistencia local del circuito diario y la mejor marca (006). Estrictamente local (localStorage),
// sin datos personales, degradando con elegancia: si no está disponible o lanza, no rompe el juego
// (FR-008/FR-015). Genérico (JSON); las claves las componen los llamantes (daily.ts).

function store(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const probe = '__topadero_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return localStorage
  } catch {
    return null // modo privado / deshabilitado → degradar en silencio
  }
}

export function readJSON<T>(key: string): T | null {
  const s = store()
  if (!s) return null
  try {
    const raw = s.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJSON(key: string, value: unknown): void {
  const s = store()
  if (!s) return
  try {
    s.setItem(key, JSON.stringify(value))
  } catch {
    // cuota llena / deshabilitado → se pierde el guardado, el juego sigue
  }
}
