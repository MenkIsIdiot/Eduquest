// Entry point: merakit modul, memvalidasi data, dan menghubungkan tombol.
import { CHALLENGES } from '../data/questions.js';
import { ZONES, BOARDS } from './world/map-data.js';
import { validateChallenges } from './systems/challenge.js';
import { createSaveStore } from './storage/save.js';
import { createInput } from './core/input.js';
import { Game } from './core/game.js';
import { createUI } from './ui/ui.js';
import { createQuizUI } from './ui/quiz-ui.js';

const $ = (id) => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
document.body.classList.toggle('touch', touch);

function getStorage() { // null jika diblokir (mis. private mode)
  try { const s = window.localStorage, k = '__eq_test'; s.setItem(k, '1'); s.removeItem(k); return s; } catch { return null; }
}

const ui = createUI();
const game = new Game({ canvas: $('game'), input: createInput(), ui, quizUI: createQuizUI(ui),
  store: createSaveStore(getStorage()), challenges: CHALLENGES, touch,
  reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });

const errors = [...validateChallenges(CHALLENGES, Object.keys(ZONES).map(Number)),
  ...BOARDS.filter((b) => !CHALLENGES.some((c) => c.id === b.challengeId)).map((b) => `Papan ${b.id}: challengeId tidak ditemukan`)];

const confirmRestart = () => confirm('Memulai ulang akan menghapus progres tersimpan. Lanjutkan?');
$('btn-start').addEventListener('click', () => { if (!game.hasSave() || confirmRestart()) game.newGame(); });
$('btn-continue').addEventListener('click', () => game.continueGame());
$('btn-pause').addEventListener('click', () => { if (game.mode === 'playing') game.pause(); });
$('btn-resume').addEventListener('click', () => game.resume());
$('btn-restart').addEventListener('click', () => { if (confirmRestart()) game.newGame(); });
$('btn-menu').addEventListener('click', () => game.toMenu());
$('btn-again').addEventListener('click', () => game.newGame());
$('btn-complete-menu').addEventListener('click', () => game.toMenu());
document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'playing') game.pause(); });

if (errors.length) ui.fatal(errors); else game.toMenu();
game.start();
