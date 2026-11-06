// Game loop + state machine: menu | playing | quiz | paused | complete.
import { TILE, SPEED, PLAYER_SIZE, INTERACT_DIST } from '../config.js';
import { MAP, BOARDS, GATES, PLAYER_START, ZONE2_SPAWN, ZONES } from '../world/map-data.js';
import { moveWithCollision, tileAt } from '../world/collision.js';
import { draw } from '../render/renderer.js';
import { newState, applyResult, isZoneUnlocked, isCompleted } from '../systems/progress.js';
import { createSession } from '../systems/challenge.js';

export class Game {
  constructor(deps) {
    Object.assign(this, deps); // canvas, input, ui, quizUI, store, challenges, touch, reduceMotion
    this.ctx = deps.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.mode = 'menu'; this.state = newState();
    this.player = { ...PLAYER_START }; this.facing = 'down';
    this.near = null; this.t = 0; this.last = 0; this.unlockedZone = null; this.warned = false;
  }

  // ---------- loop ----------
  start() { requestAnimationFrame(this.frame); }
  frame = (ts) => {
    const dt = Math.min((ts - this.last) / 1000 || 0, 0.05); // batasi dt agar tidak menembus tembok
    this.last = ts;
    try { this.update(dt); this.render(); } catch (err) { console.error(err); }
    requestAnimationFrame(this.frame);
  };
  render() {
    draw(this.ctx, { map: MAP, player: this.player, facing: this.facing, moving: this.mode === 'playing' && this.moving, entities: this.entities(),
      near: this.mode === 'playing' ? this.near : null, t: this.t, gateOpen: isZoneUnlocked(this.state, 2),
      touch: this.touch, reduceMotion: this.reduceMotion });
  }
  update(dt) {
    this.t += dt;
    if (this.mode === 'paused') { if (this.input.consumePause()) this.resume(); return; }
    if (this.mode !== 'playing') return;
    if (this.input.consumePause()) { this.pause(); return; }
    const v = this.input.vector();
    this.moving = !!(v.x || v.y);
    if (v.x || v.y) {
      const d = SPEED * dt;
      this.player = { ...this.player, ...moveWithCollision(MAP, this.player, v.x * d, v.y * d, PLAYER_SIZE, isZoneUnlocked(this.state, 2)) };
      this.facing = Math.abs(v.x) > Math.abs(v.y) ? (v.x < 0 ? 'left' : 'right') : (v.y < 0 ? 'up' : 'down');
    }
    this.near = this.findNear();
    if (this.input.consumeInteract() && this.near) this.interact(this.near);
    const tx = Math.floor((this.player.x + PLAYER_SIZE / 2) / TILE), ty = Math.floor((this.player.y + PLAYER_SIZE / 2) / TILE);
    if (tileAt(MAP, tx, ty) === 'F') this.complete();
  }

  // ---------- dunia ----------
  entities() {
    const out = BOARDS.map((b) => ({ kind: 'board', label: b.label, challengeId: b.challengeId,
      x: b.tx * TILE + TILE / 2, y: b.ty * TILE + TILE / 2, done: isCompleted(this.state, b.challengeId) }));
    for (const g of GATES) if (!isZoneUnlocked(this.state, g.zone))
      out.push({ kind: 'gate', label: 'Gerbang terkunci', x: g.tx * TILE + TILE / 2, y: g.ty * TILE + TILE / 2 });
    return out;
  }
  findNear() {
    const px = this.player.x + PLAYER_SIZE / 2, py = this.player.y + PLAYER_SIZE / 2;
    let best = null, bd = INTERACT_DIST;
    for (const e of this.entities()) { const d = Math.hypot(e.x - px, e.y - py); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  interact(e) {
    if (e.kind === 'board') this.startChallenge(e.challengeId);
    else this.ui.toast('Gerbang terkunci. Temukan Papan Tantangan dan selesaikan soalnya!');
  }

  // ---------- tantangan ----------
  startChallenge(id) {
    const ch = this.challenges.find((c) => c.id === id);
    if (!ch) { this.ui.toast('Tantangan tidak ditemukan.'); return; }
    const session = createSession(ch, { attempt: (this.state.attempts[id] || 0) + 1,
      earned: new Set(this.state.earnedQuestions), completed: isCompleted(this.state, id) });
    this.setMode('quiz');
    this.quizUI.open(session, { onResult: (r) => this.commit(ch, r), onClose: (retry) => (retry ? this.startChallenge(id) : this.closeQuiz()) });
  }
  commit(ch, result) {
    const { state, newlyUnlocked } = applyResult(this.state, ch, result);
    this.state = state; this.unlockedZone = newlyUnlocked;
    this.persist(); this.refreshHud();
  }
  closeQuiz() {
    this.ui.hideAll(); this.setMode('playing');
    if (this.unlockedZone) { this.ui.toast(`Area baru terbuka: ${ZONES[this.unlockedZone]}! Gerbang telah terbuka.`, 4500); this.unlockedZone = null; }
  }

  // ---------- state machine ----------
  setMode(m) { this.mode = m; this.input.reset(); this.input.enabled = m === 'playing'; this.ui.setMode(m); }
  hasSave() { return this.store.load().state !== null; }
  persist() {
    if (!this.store.save(this.state) && !this.warned) {
      this.warned = true; this.ui.toast('Penyimpanan browser tidak tersedia; progres hilang jika halaman ditutup.', 5000);
    }
  }
  refreshHud() { this.ui.setHud(this.state.score, this.state.completedChallenges.length, this.challenges.length); }
  enterWorld(spawn) {
    this.player = { ...spawn }; this.facing = 'down'; this.near = null;
    this.ui.hideAll(); this.setMode('playing'); this.refreshHud();
  }
  newGame() { this.store.clear(); this.state = newState(); this.persist(); this.enterWorld(PLAYER_START); this.ui.toast('Temukan Papan Tantangan (!) untuk membuka gerbang.', 4500); }
  continueGame() {
    const { state } = this.store.load();
    if (!state) { this.toMenu(); return; }
    this.state = state; this.enterWorld(isZoneUnlocked(state, 2) ? ZONE2_SPAWN : PLAYER_START);
  }
  toMenu() {
    this.setMode('menu');
    const { state, corrupt } = this.store.load();
    this.ui.setMenu({ canContinue: !!state, corrupt, persistent: this.store.persistent });
    this.ui.show('menu');
  }
  pause() { this.setMode('paused'); this.ui.show('pause'); }
  resume() { this.ui.hideAll(); this.setMode('playing'); }
  complete() { this.persist(); this.setMode('complete'); this.ui.showComplete(this.state); this.ui.show('complete'); }
}
