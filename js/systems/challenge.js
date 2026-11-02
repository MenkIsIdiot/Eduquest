// Alur kuis (murni): validasi data, sesi, jawaban, hasil.
import { answerPoints, bonusPoints } from './scoring.js';

/** Mengembalikan daftar pesan error; kosong berarti data valid. */
export function validateChallenges(list, zoneNumbers) {
  const errs = [], ids = new Set();
  if (!Array.isArray(list) || !list.length) return ['CHALLENGES kosong'];
  for (const c of list) {
    const p = `Tantangan "${c.id}"`;
    if (!c.id || ids.has(c.id)) errs.push(`${p}: id kosong/duplikat`);
    ids.add(c.id);
    if (!Array.isArray(c.questions) || !c.questions.length) { errs.push(`${p}: tidak ada soal`); continue; }
    if (!Number.isInteger(c.passScore) || c.passScore < 1 || c.passScore > c.questions.length) errs.push(`${p}: passScore tidak valid`);
    if (!zoneNumbers.includes(c.unlocks)) errs.push(`${p}: unlocks mengarah ke zona yang tidak ada`);
    for (const q of c.questions) {
      const qp = `${p}/${q.id}`;
      if (!q.id || ids.has(q.id)) errs.push(`${qp}: id kosong/duplikat`);
      ids.add(q.id);
      if (!q.text) errs.push(`${qp}: teks kosong`);
      if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`${qp}: harus tepat 4 opsi`);
      if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) errs.push(`${qp}: correctIndex harus 0-3`);
      if (!q.explanation) errs.push(`${qp}: explanation kosong`);
    }
  }
  return errs;
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Sesi satu percobaan tantangan. Opsi diacak; jawaban benar dilacak lewat `orig`, bukan posisi. */
export function createSession(challenge, { attempt = 1, earned = new Set(), completed = false, rng = Math.random } = {}) {
  return {
    challenge, attempt, completed, earned,
    index: 0, correct: 0, answered: 0, points: 0, newlyEarned: [], pending: null,
    questions: shuffle(challenge.questions, rng).map((q) => ({
      q, options: shuffle(q.options.map((text, orig) => ({ text, orig })), rng)
    }))
  };
}
export const currentQuestion = (s) => s.questions[s.index];
export const isLast = (s) => s.index >= s.questions.length - 1;

/** Jawab soal saat ini dengan indeks opsi yang TAMPIL. Poin hanya sekali per soal (anti-farming). */
export function answer(s, shownIndex) {
  if (s.pending) return s.pending;
  const item = currentQuestion(s), chosen = item.options[shownIndex];
  if (!chosen) throw new Error('Pilihan tidak valid');
  const correct = chosen.orig === item.q.correctIndex;
  const correctShown = item.options.findIndex((o) => o.orig === item.q.correctIndex);
  let points = 0;
  if (correct) {
    s.correct++;
    if (!s.completed && !s.earned.has(item.q.id)) { points = answerPoints(s.attempt); s.newlyEarned.push(item.q.id); }
  }
  s.points += points; s.answered++;
  s.pending = { correct, correctShown, chosenShown: shownIndex, points, explanation: item.q.explanation };
  return s.pending;
}
export function next(s) {
  if (!s.pending) throw new Error('Jawab dulu sebelum lanjut');
  s.pending = null; s.index++;
}
/** Hasil akhir; panggil setelah soal terakhir dijawab. */
export function finish(s) {
  const total = s.questions.length, passed = s.correct >= s.challenge.passScore;
  const bonus = passed && !s.completed ? bonusPoints(s.correct, total) : 0;
  return { challengeId: s.challenge.id, passed, correct: s.correct, total, answered: s.answered,
    passScore: s.challenge.passScore, bonus, points: s.points + bonus, newlyEarned: s.newlyEarned };
}
