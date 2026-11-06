import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP, BOARDS, PLAYER_START, ZONE2_SPAWN, ZONES } from '../js/world/map-data.js';
import { isSolid, tileAt, boxHitsSolid, moveWithCollision } from '../js/world/collision.js';
import { CHALLENGES } from '../data/questions.js';
import * as C from '../js/systems/challenge.js';
import { newState, applyResult, isZoneUnlocked } from '../js/systems/progress.js';
import { sanitize, createSaveStore } from '../js/storage/save.js';
import { PLAYER_SIZE, TILE } from '../js/config.js';

const ch = CHALLENGES[0];
// rng deterministik
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// jawab semua soal: pola[i] = true benar / false salah
function play(session, pattern) {
  let i = 0;
  for (;;) {
    const item = C.currentQuestion(session);
    const right = item.options.findIndex((o) => o.orig === item.q.correctIndex);
    C.answer(session, pattern[i++] ? right : (right + 1) % 4);
    if (C.isLast(session)) return C.finish(session);
    C.next(session);
  }
}

test('peta: baris sama panjang, titik penting valid', () => {
  const w = MAP.grid[0].length;
  assert.ok(MAP.grid.every((r) => r.length === w));
  assert.equal(tileAt(MAP, 14, 6), 'G'); assert.equal(tileAt(MAP, 25, 6), 'F');
  assert.ok(!boxHitsSolid(MAP, PLAYER_START.x, PLAYER_START.y, PLAYER_SIZE, false));
  assert.ok(!boxHitsSolid(MAP, ZONE2_SPAWN.x, ZONE2_SPAWN.y, PLAYER_SIZE, true));
  for (const b of BOARDS) assert.ok(!isSolid(MAP, b.tx, b.ty, false));
});
test('peta: tujuan hanya terjangkau jika gerbang terbuka (BFS)', () => {
  const reach = (open) => {
    const seen = new Set(['2,6']), q = [[2, 6]];
    while (q.length) { const [x, y] = q.shift();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const k = `${x+dx},${y+dy}`;
        if (!seen.has(k) && !isSolid(MAP, x+dx, y+dy, open)) { seen.add(k); q.push([x+dx, y+dy]); } } }
    return seen.has('25,6');
  };
  assert.equal(reach(false), false); assert.equal(reach(true), true);
});
test('tabrakan: tembok memblokir, gerbang bergantung status, bisa menyusuri dinding', () => {
  assert.deepEqual(moveWithCollision(MAP, { x: TILE + 1, y: 100 }, -10, 0, PLAYER_SIZE, false), { x: TILE, y: 100 }); // dinding kiri: merapat ke tepi (x=32)
  const nearGate = { x: 14 * TILE - PLAYER_SIZE, y: 6 * TILE + 6 };
  assert.equal(moveWithCollision(MAP, nearGate, 8, 0, PLAYER_SIZE, false).x, nearGate.x);
  assert.equal(moveWithCollision(MAP, nearGate, 8, 0, PLAYER_SIZE, true).x, nearGate.x + 8);
  const slide = moveWithCollision(MAP, { x: TILE, y: 100 }, -5, 5, PLAYER_SIZE, false);
  assert.equal(slide.x, TILE); assert.equal(slide.y, 105);
});
test('data soal valid dan validator menangkap kesalahan', () => {
  assert.deepEqual(C.validateChallenges(CHALLENGES, Object.keys(ZONES).map(Number)), []);
  const bad = structuredClone(CHALLENGES); bad[0].questions[0].options.pop(); bad[0].questions[1].correctIndex = 7; bad[0].unlocks = 9; bad[0].questions[2].id = 'math-1-q1';
  assert.ok(C.validateChallenges(bad, [1, 2]).length >= 4);
  assert.ok(C.validateChallenges([], [1]).length);
});
test('kuis: jawaban benar dilacak walau opsi diacak', () => {
  for (let seed = 1; seed < 30; seed++) {
    const s = C.createSession(ch, { rng: seeded(seed) });
    const r = play(s, [true, true, true]);
    assert.equal(r.correct, 3); assert.equal(r.points, 30 + 20);
  }
  const s = C.createSession(ch, { rng: seeded(3) });
  const item = C.currentQuestion(s), right = item.options.findIndex((o) => o.orig === item.q.correctIndex);
  const res = C.answer(s, (right + 1) % 4);
  assert.equal(res.correct, false); assert.equal(res.correctShown, right); assert.ok(res.explanation);
  assert.equal(C.answer(s, right).correct, false, 'jawaban kedua pada soal yang sama diabaikan');
});
test('skor: 2 benar lulus tanpa bonus; 1 benar gagal; retry bernilai 5; tanpa farming', () => {
  const s1 = C.createSession(ch, { rng: seeded(2) });
  const r1 = play(s1, [true, true, false]);
  assert.deepEqual([r1.passed, r1.points, r1.bonus], [true, 20, 0]);
  const s2 = C.createSession(ch, { rng: seeded(2) });
  const r2 = play(s2, [true, false, false]);
  assert.deepEqual([r2.passed, r2.points], [false, 10]);
  let st = applyResult(newState(), ch, r2).state;
  assert.equal(st.score, 10); assert.ok(!isZoneUnlocked(st, 2));
  // percobaan ulang: soal yang sudah dihargai tidak memberi poin lagi
  const s3 = C.createSession(ch, { attempt: 2, earned: new Set(st.earnedQuestions), rng: seeded(5) });
  const r3 = play(s3, [true, true, true]);
  assert.equal(r3.points, 5 * 2 + 20);
  st = applyResult(st, ch, r3).state;
  assert.equal(st.score, 40); assert.ok(isZoneUnlocked(st, 2));
  // sudah selesai: mengulang tidak menambah skor
  const s4 = C.createSession(ch, { attempt: 3, completed: true, earned: new Set(st.earnedQuestions) });
  const r4 = play(s4, [true, true, true]);
  assert.equal(r4.points, 0);
  assert.equal(applyResult(st, ch, r4).state.score, 40);
});
test('progress: lulus membuka zona sekali; gagal tidak', () => {
  const pass = applyResult(newState(), ch, { passed: true, correct: 3, total: 3, answered: 3, points: 50, newlyEarned: [] });
  assert.equal(pass.newlyUnlocked, 2); assert.deepEqual(pass.state.completedChallenges, ['math-1']);
  assert.equal(applyResult(pass.state, ch, { passed: true, correct: 3, total: 3, answered: 3, points: 0, newlyEarned: [] }).newlyUnlocked, null);
  assert.equal(applyResult(newState(), ch, { passed: false, correct: 1, total: 3, answered: 3, points: 10, newlyEarned: [] }).newlyUnlocked, null);
});
test('save: sanitize menolak data rusak; store tahan terhadap storage bermasalah', () => {
  const good = newState();
  assert.ok(sanitize(good));
  for (const bad of [null, 5, {}, { ...good, version: 2 }, { ...good, score: -1 }, { ...good, score: 'x' },
    { ...good, unlockedZones: [2] }, { ...good, attempts: [] }, { ...good, stats: null }]) assert.equal(sanitize(bad), null);
  const mk = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m }; };
  const fake = mk(), store = createSaveStore(fake);
  assert.deepEqual(store.load(), { state: null, corrupt: false });
  assert.equal(store.save({ ...good, score: 30 }), true);
  assert.equal(store.load().state.score, 30);
  fake.setItem('eduquest.save.v1', '{rusak'); assert.equal(store.load().corrupt, true);
  fake.setItem('eduquest.save.v1', JSON.stringify({ ...good, score: -5 })); assert.equal(store.load().corrupt, true);
  store.clear(); assert.equal(store.load().state, null);
  const boom = { getItem() { throw new Error('x'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('x'); } };
  const s2 = createSaveStore(boom);
  assert.equal(s2.load().state, null);
  assert.equal(s2.save({ ...good, score: 7 }), false); assert.equal(s2.persistent, false);
  assert.equal(s2.load().state.score, 7, 'fallback ke memori');
  const s3 = createSaveStore(null); assert.equal(s3.persistent, false); assert.equal(s3.load().state, null);
});
