// Aturan skor (murni).
import { SCORE } from '../config.js';
/** Poin untuk satu jawaban benar yang belum pernah dihargai. attempt mulai dari 1. */
export const answerPoints = (attempt) => (attempt <= 1 ? SCORE.first : SCORE.retry);
/** Bonus bila semua soal benar. */
export const bonusPoints = (correct, total) => (total > 0 && correct === total ? SCORE.perfectBonus : 0);
