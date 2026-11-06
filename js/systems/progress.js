// Status permainan & aturan buka area (murni, immutable: mengembalikan state baru).
export const newState = () => ({
  version: 1, score: 0, unlockedZones: [1], completedChallenges: [],
  earnedQuestions: [], attempts: {}, stats: { correct: 0, answered: 0 }
});
export const isZoneUnlocked = (s, zone) => s.unlockedZones.includes(zone);
export const isCompleted = (s, id) => s.completedChallenges.includes(id);

/** Terapkan hasil tantangan. Zona baru hanya terbuka jika lulus. */
export function applyResult(state, challenge, result) {
  const s = JSON.parse(JSON.stringify(state));
  s.score += result.points;
  s.stats.correct += result.correct;
  s.stats.answered += result.answered;
  s.earnedQuestions = [...new Set([...s.earnedQuestions, ...result.newlyEarned])];
  s.attempts[challenge.id] = (s.attempts[challenge.id] || 0) + 1;
  let newlyUnlocked = null;
  if (result.passed) { // idempoten: save lama/diedit (selesai tapi zona belum terbuka) tidak boleh soft-lock
    if (!isCompleted(s, challenge.id)) s.completedChallenges.push(challenge.id);
    if (!isZoneUnlocked(s, challenge.unlocks)) { s.unlockedZones.push(challenge.unlocks); newlyUnlocked = challenge.unlocks; }
  }
  return { state: s, newlyUnlocked };
}
