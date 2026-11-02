// Simulasi alur game lengkap tanpa browser: DOM/Canvas diganti stub. Menguji integrasi Game + sistem.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/core/game.js';
import { createSaveStore } from '../js/storage/save.js';
import { CHALLENGES } from '../data/questions.js';
import * as C from '../js/systems/challenge.js';

const ctx = new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 50 }) : () => ctx), set: () => true });
function setup() {
  const input = { enabled: false, vec: { x: 0, y: 0 }, i: false, p: false,
    vector() { return this.vec; }, consumeInteract() { const v = this.i; this.i = false; return v; },
    consumePause() { const v = this.p; this.p = false; return v; }, reset() { this.i = this.p = false; } };
  const ui = { toasts: [], modes: [], show() {}, hideAll() {}, setMode(m) { this.modes.push(m); }, setHud(s) { this.score = s; },
    toast(m) { this.toasts.push(m); }, setMenu() {}, showComplete() { this.done = true; } };
  const quizUI = { open(session, h) { this.session = session; this.h = h; } };
  const mem = new Map();
  const store = createSaveStore({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) });
  const game = new Game({ canvas: { getContext: () => ctx }, input, ui, quizUI, store, challenges: CHALLENGES, touch: false, reduceMotion: false });
  return { game, input, ui, quizUI, store };
}
const walk = (g, input, x, y, steps, stopWhen = () => false) => { input.vec = { x, y }; for (let i = 0; i < steps && !stopWhen(); i++) g.update(0.016); input.vec = { x: 0, y: 0 }; };

test('alur penuh: gerak -> gerbang terkunci -> kuis -> skor -> gerbang terbuka -> tamat -> mulai ulang', () => {
  const { game: g, input, ui, quizUI, store } = setup();
  g.newGame(); assert.equal(g.mode, 'playing');
  const x0 = g.player.x; walk(g, input, 1, 0, 10); assert.ok(g.player.x > x0, 'karakter bergerak');
  g.render(); // renderer tidak melempar error

  walk(g, input, 1, 0, 400, () => g.near?.kind === 'board'); // dekati papan
  assert.equal(g.near?.kind, 'board');
  walk(g, input, 1, 0, 400); assert.ok(g.player.x < 14 * 32, 'gerbang terkunci menghalangi');

  g.player = { x: 14 * 32 - 22, y: 198 }; g.near = g.findNear(); assert.equal(g.near.kind, 'gate');
  input.i = true; g.update(0.016); assert.match(ui.toasts.at(-1), /terkunci/);

  g.player = { x: 9 * 32, y: 5 * 32 + 12 }; g.near = g.findNear();
  input.i = true; g.update(0.016); assert.equal(g.mode, 'quiz'); assert.equal(input.enabled, false);
  const s = quizUI.session; // jawab: benar, salah, benar
  [true, false, true].forEach((ok, i) => {
    const it = C.currentQuestion(s), right = it.options.findIndex((o) => o.orig === it.q.correctIndex);
    C.answer(s, ok ? right : (right + 1) % 4); if (i < 2) C.next(s);
  });
  quizUI.h.onResult(C.finish(s)); assert.equal(g.state.score, 20); assert.deepEqual(g.state.unlockedZones, [1, 2]);
  quizUI.h.onClose(false); assert.equal(g.mode, 'playing'); assert.match(ui.toasts.at(-1), /Hutan Kristal/);
  assert.equal(store.load().state.score, 20, 'progres tersimpan');

  g.player = { x: 14 * 32 - 22, y: 198 };
  walk(g, input, 1, 0, 800, () => g.mode === 'complete');
  assert.equal(g.mode, 'complete'); assert.ok(ui.done);

  g.newGame(); assert.equal(g.state.score, 0); assert.deepEqual(g.state.unlockedZones, [1]); assert.equal(g.mode, 'playing');
});
test('lanjutkan memuat progres; jeda/lanjut bekerja; kuis gagal mengizinkan coba lagi', () => {
  const { game: g, input, quizUI, store } = setup();
  g.newGame(); input.p = true; g.update(0.016); assert.equal(g.mode, 'paused');
  input.p = true; g.update(0.016); assert.equal(g.mode, 'playing');
  g.startChallenge('math-1'); const s1 = quizUI.session;
  for (let i = 0; i < 3; i++) { const it = C.currentQuestion(s1); C.answer(s1, it.options.findIndex((o) => o.orig !== it.q.correctIndex)); if (i < 2) C.next(s1); }
  const r = C.finish(s1); quizUI.h.onResult(r); assert.equal(r.passed, false); assert.deepEqual(g.state.unlockedZones, [1]);
  quizUI.h.onClose(true); assert.equal(g.mode, 'quiz'); assert.equal(quizUI.session.attempt, 2);
  const g2 = setup().game; g2.store = store; g2.continueGame(); assert.equal(g2.state.attempts['math-1'], 1);
});
