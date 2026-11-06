// Reproduksi QA (logika murni). Dijalankan SEBELUM perbaikan untuk membuktikan bug.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP, PLAYER_START } from '../js/world/map-data.js';
import { boxHitsSolid, moveWithCollision } from '../js/world/collision.js';
import { CHALLENGES } from '../data/questions.js';
import { newState, applyResult, isZoneUnlocked } from '../js/systems/progress.js';
import { sanitize } from '../js/storage/save.js';
import { PLAYER_SIZE } from '../js/config.js';

test('QA-G: fuzz tabrakan - pemain tidak pernah berakhir di dalam tile solid', () => {
  let seed = 42; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const gateOpen of [false, true]) {
    let pos = { ...PLAYER_START };
    for (let i = 0; i < 200000; i++) {
      const a = rnd() * 6.283, dt = [0.008, 0.016, 0.033, 0.05][Math.floor(rnd() * 4)], d = 110 * dt;
      pos = moveWithCollision(MAP, pos, Math.cos(a) * d, Math.sin(a) * d, PLAYER_SIZE, gateOpen);
      assert.ok(!boxHitsSolid(MAP, pos.x, pos.y, PLAYER_SIZE, gateOpen), `tembus di langkah ${i}`);
      if (!gateOpen) assert.ok(pos.x + PLAYER_SIZE <= 14 * 32, 'bocor lewat gerbang terkunci');
    }
  }
});
test('QA-H: save lama (tantangan selesai tapi zona belum terbuka) tidak boleh soft-lock', () => {
  const ch = CHALLENGES[0];
  const stale = { ...newState(), completedChallenges: ['math-1'], score: 50 }; // mis. save dari versi sebelum zona 2 ada
  assert.ok(sanitize(stale), 'save dianggap valid');
  const r = { passed: true, correct: 3, total: 3, answered: 3, points: 0, bonus: 0, newlyEarned: [] };
  const { state } = applyResult(stale, ch, r); // pemain mengulang tantangan dan lulus lagi
  assert.ok(isZoneUnlocked(state, 2), 'gerbang harus terbuka setelah lulus ulang');
});

test('QA-G2: terhalang dinding, pemain merapat tepat ke tepi (tidak bergantung fps)', () => {
  for (const dt of [0.008, 0.016, 0.05]) {
    let pos = { x: 100, y: 198 }; // baris 6: bebas rintangan
    for (let i = 0; i < 4000; i++) pos = moveWithCollision(MAP, pos, -110 * dt, 0, PLAYER_SIZE, false);
    assert.equal(pos.x, 32, `dt=${dt}`); // dinding kiri berakhir di x=32
    for (let i = 0; i < 4000; i++) pos = moveWithCollision(MAP, pos, 110 * dt, 0, PLAYER_SIZE, false);
    assert.equal(pos.x + PLAYER_SIZE, 14 * 32, `dt=${dt}`); // dinding gerbang di x=448
  }
});
