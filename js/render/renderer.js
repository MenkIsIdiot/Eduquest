// Menggambar dunia di Canvas. Semua grafis dibuat dengan kode (tanpa aset eksternal).
import { TILE, VIEW_W, VIEW_H, PLAYER_SIZE } from '../config.js';
import { tileAt } from '../world/collision.js';

function drawTile(ctx, ch, tx, ty, gateOpen, t) {
  const x = tx * TILE, y = ty * TILE, zone2 = tx > 14;
  ctx.fillStyle = zone2 ? ((tx + ty) % 2 ? '#2f6b57' : '#34725c') : ((tx + ty) % 2 ? '#4f8f45' : '#478540');
  ctx.fillRect(x, y, TILE, TILE);
  if (ch === '#') { ctx.fillStyle = '#1d3328'; ctx.fillRect(x, y, TILE, TILE); ctx.fillStyle = '#26443a'; ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8); }
  else if (ch === 'T') {
    ctx.fillStyle = '#5b3a1e'; ctx.fillRect(x + 13, y + 18, 6, 12);
    ctx.fillStyle = zone2 ? '#4aa88a' : '#2e6b2c'; ctx.beginPath(); ctx.arc(x + 16, y + 14, 13, 0, 7); ctx.fill();
  } else if (ch === 'R') { ctx.fillStyle = '#8a8f98'; ctx.beginPath(); ctx.ellipse(x + 16, y + 19, 13, 10, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#a9aeb7'; ctx.fillRect(x + 11, y + 13, 7, 3); }
  else if (ch === 'G') {
    if (gateOpen) { ctx.fillStyle = '#9a9488'; ctx.fillRect(x + 2, y, 6, TILE); ctx.fillRect(x + 24, y, 6, TILE); }
    else {
      ctx.fillStyle = '#7d776c'; ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = '#4b463f'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = '#f2c14e'; ctx.fillRect(x + 10, y + 15, 12, 10);          // gembok
      ctx.strokeStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(x + 16, y + 15, 5, Math.PI, 0); ctx.stroke();
    }
  } else if (ch === 'F') {
    ctx.fillStyle = `rgba(242,193,78,${0.65 + 0.3 * Math.sin(t * 3)})`;
    ctx.beginPath(); ctx.moveTo(x + 16, y + 4); ctx.lineTo(x + 28, y + 16); ctx.lineTo(x + 16, y + 28); ctx.lineTo(x + 4, y + 16); ctx.fill();
  }
}

function drawBoard(ctx, e, t, pulse) {
  const x = e.x, y = e.y;
  if (!e.done) { // cahaya berdenyut sebagai petunjuk objek interaktif
    ctx.fillStyle = `rgba(242,193,78,${pulse ? 0.18 + 0.12 * Math.sin(t * 4) : 0.22})`;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#5b3a1e'; ctx.fillRect(x - 2, y + 2, 4, 12);
  ctx.fillStyle = '#b07a3c'; ctx.fillRect(x - 12, y - 14, 24, 18);
  ctx.strokeStyle = '#3d2610'; ctx.lineWidth = 2; ctx.strokeRect(x - 12, y - 14, 24, 18);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(e.done ? '✔' : '!', x, y);
}

function drawPlayer(ctx, p, facing) {
  const { x, y } = p, cx = x + PLAYER_SIZE / 2;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(cx, y + 19, 9, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a6fd8'; ctx.fillRect(x + 4, y + 8, 12, 11);
  ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(cx, y + 7, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#6b3fb0'; ctx.beginPath(); ctx.moveTo(cx - 8, y + 5); ctx.lineTo(cx, y - 8); ctx.lineTo(cx + 8, y + 5); ctx.fill();
  const ox = facing === 'left' ? -2 : facing === 'right' ? 2 : 0, oy = facing === 'up' ? -1 : 1;
  ctx.fillStyle = '#222'; ctx.fillRect(cx - 3 + ox, y + 6 + oy, 2, 2); ctx.fillRect(cx + 1 + ox, y + 6 + oy, 2, 2);
}

/** v: {map, player, facing, entities, near, t, gateOpen, touch, reduceMotion} */
export function draw(ctx, v) {
  const cols = v.map.grid[0].length, rows = v.map.grid.length;
  const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), Math.max(hi, lo));
  const cx = Math.round(clamp(v.player.x + PLAYER_SIZE / 2 - VIEW_W / 2, 0, cols * TILE - VIEW_W));
  const cy = Math.round(clamp(v.player.y + PLAYER_SIZE / 2 - VIEW_H / 2, 0, rows * TILE - VIEW_H));
  const t = v.reduceMotion ? 0 : v.t;
  ctx.fillStyle = '#10201a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save(); ctx.translate(-cx, -cy);
  const x0 = Math.max(0, Math.floor(cx / TILE)), x1 = Math.min(cols - 1, Math.floor((cx + VIEW_W) / TILE));
  const y0 = Math.max(0, Math.floor(cy / TILE)), y1 = Math.min(rows - 1, Math.floor((cy + VIEW_H) / TILE));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) drawTile(ctx, tileAt(v.map, tx, ty), tx, ty, v.gateOpen, t);
  for (const e of v.entities) if (e.kind === 'board') drawBoard(ctx, e, t, !v.reduceMotion);
  drawPlayer(ctx, v.player, v.facing);
  ctx.restore();
  if (v.near) { // label petunjuk interaksi
    const text = v.near.kind === 'gate' ? 'Gerbang terkunci' : `${v.near.label} - ${v.touch ? 'ketuk Aksi' : 'tekan E'}`;
    ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 16;
    const bx = clamp(v.near.x - cx - w / 2, 4, VIEW_W - w - 4), by = Math.max(4, v.near.y - cy - 44);
    ctx.fillStyle = 'rgba(20,16,42,.92)'; ctx.fillRect(bx, by, w, 22);
    ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, w, 22);
    ctx.fillStyle = '#fff'; ctx.fillText(text, bx + w / 2, by + 15);
  }
}
