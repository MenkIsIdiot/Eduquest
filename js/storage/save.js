// LocalStorage yang aman: gagal/rusak tidak menghentikan game (fallback ke memori).
import { SAVE_KEY } from '../config.js';

/** Validasi data save; null jika tidak valid. Data tidak pernah dipercaya begitu saja. */
export function sanitize(raw) {
  try {
    if (!raw || typeof raw !== 'object' || raw.version !== 1) return null;
    const ints = (a) => Array.isArray(a) && a.every(Number.isInteger);
    const strs = (a) => Array.isArray(a) && a.every((x) => typeof x === 'string');
    const nn = (n) => Number.isInteger(n) && n >= 0;
    const st = raw.stats, at = raw.attempts;
    if (!nn(raw.score) || !ints(raw.unlockedZones) || !raw.unlockedZones.includes(1)) return null;
    if (!strs(raw.completedChallenges) || !strs(raw.earnedQuestions)) return null;
    if (!st || !nn(st.correct) || !nn(st.answered)) return null;
    if (!at || typeof at !== 'object' || Array.isArray(at) || !Object.values(at).every(nn)) return null;
    return { version: 1, score: raw.score, unlockedZones: [...raw.unlockedZones],
      completedChallenges: [...raw.completedChallenges], earnedQuestions: [...raw.earnedQuestions],
      attempts: { ...at }, stats: { correct: st.correct, answered: st.answered } };
  } catch { return null; }
}

/** `storage` boleh null (tidak tersedia). */
export function createSaveStore(storage) {
  let mem = null, ok = !!storage;
  return {
    get persistent() { return ok; },
    load() {
      let text = null;
      try { text = ok ? storage.getItem(SAVE_KEY) : (mem ? JSON.stringify(mem) : null); } catch { ok = false; }
      if (text === null || text === undefined) return { state: null, corrupt: false };
      try { const st = sanitize(JSON.parse(text)); return st ? { state: st, corrupt: false } : { state: null, corrupt: true }; }
      catch { return { state: null, corrupt: true }; }
    },
    save(state) {
      mem = JSON.parse(JSON.stringify(state));
      if (!ok) return false;
      try { storage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch { ok = false; return false; }
    },
    clear() { mem = null; try { if (ok) storage.removeItem(SAVE_KEY); } catch { ok = false; } }
  };
}
