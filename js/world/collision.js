// Tabrakan AABB vs tile. Modul murni (tanpa DOM) agar bisa diuji di Node.
import { TILE } from '../config.js';

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
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + size - 1) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + size - 1) / TILE);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) if (isSolid(map, tx, ty, gateOpen)) return true;
  return false;
}
/** Gerak per sumbu terpisah agar pemain bisa menyusuri dinding. */
export function moveWithCollision(map, pos, dx, dy, size, gateOpen) {
  let { x, y } = pos;
  if (dx && !boxHitsSolid(map, x + dx, y, size, gateOpen)) x += dx;
  if (dy && !boxHitsSolid(map, x, y + dy, size, gateOpen)) y += dy;
  return { x, y };
}
