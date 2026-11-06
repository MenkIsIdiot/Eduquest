// Tabrakan AABB vs tile. Modul murni (tanpa DOM) agar bisa diuji di Node.
import { TILE } from '../config.js';
const EPS = 1e-6; // posisi bertipe desimal: tepi kanan/bawah kotak ada di x+size, bukan x+size-1

export function tileAt(map, tx, ty) {
  if (ty < 0 || tx < 0 || ty >= map.grid.length || tx >= map.grid[0].length) return '#';
  return map.grid[ty][tx];
}
export function isSolid(map, tx, ty, gateOpen) {
  const c = tileAt(map, tx, ty);
  return c === '#' || c === 'T' || c === 'R' || (c === 'G' && !gateOpen);
}
/** Apakah kotak (x,y,size) menyentuh tile solid? */
export function boxHitsSolid(map, x, y, size, gateOpen) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + size - EPS) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + size - EPS) / TILE);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) if (isSolid(map, tx, ty, gateOpen)) return true;
  return false;
}
/** Gerak per sumbu terpisah agar pemain bisa menyusuri dinding. */
export function moveWithCollision(map, pos, dx, dy, size, gateOpen) {
  let { x, y } = pos;
  // Jika terhalang, rapatkan ke tepi tile (bukan berhenti beberapa piksel sebelumnya).
  if (dx) { const nx = x + dx;
    x = !boxHitsSolid(map, nx, y, size, gateOpen) ? nx : dx > 0 ? Math.floor((nx + size - EPS) / TILE) * TILE - size : (Math.floor(nx / TILE) + 1) * TILE; }
  if (dy) { const ny = y + dy;
    y = !boxHitsSolid(map, x, ny, size, gateOpen) ? ny : dy > 0 ? Math.floor((ny + size - EPS) / TILE) * TILE - size : (Math.floor(ny / TILE) + 1) * TILE; }
  return { x, y };
}
