// Detección por contención AABB (geométrica, determinista) del jugador en salida/meta y
// del umbral de caída. Es la alternativa "AABB manual" que research R8 admite como
// equivalente; evita depender de queries de Rapier sensibles a ActiveCollisionTypes.

import type { Vec3 } from '../types'

export function inAABB(p: Vec3, center: Vec3, half: Vec3): boolean {
  return (
    Math.abs(p.x - center.x) <= half.x &&
    Math.abs(p.y - center.y) <= half.y &&
    Math.abs(p.z - center.z) <= half.z
  )
}
