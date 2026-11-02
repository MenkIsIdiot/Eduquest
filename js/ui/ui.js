// Layar (menu, jeda, tamat), HUD, dan toast. Semua teks lewat textContent.
const $ = (id) => document.getElementById(id);

export function createUI() {
  const screens = {};
  for (const n of ['menu', 'pause', 'quiz', 'complete']) screens[n] = $('screen-' + n);
  let timer = null;
  const ui = {
    show(name) {
      for (const [n, el] of Object.entries(screens)) el.hidden = n !== name;
      if (name !== 'quiz') screens[name].querySelector('button:not([disabled])')?.focus();
    },
    hideAll() { for (const el of Object.values(screens)) el.hidden = true; document.activeElement?.blur?.(); },
    setMode(m) { document.body.dataset.mode = m; },
    setHud(score, done, total) { $('hud-score').textContent = score; $('hud-progress').textContent = `${done}/${total}`; },
    toast(msg, ms = 3500) {
      const t = $('toast'); t.textContent = msg; t.hidden = false;
      clearTimeout(timer); timer = setTimeout(() => { t.hidden = true; }, ms);
    },
    setMenu({ canContinue, corrupt, persistent }) {
      $('boot-msg')?.remove();
      $('btn-start').disabled = false; $('btn-continue').disabled = !canContinue;
      $('menu-note').textContent = corrupt ? 'Data simpan rusak sehingga diabaikan. Mulai petualangan baru.'
        : !persistent ? 'Penyimpanan browser tidak tersedia; progres tidak akan tersimpan.' : '';
    },
    fatal(errors) {
      $('boot-msg')?.remove();
      $('btn-start').disabled = true; $('btn-continue').disabled = true;
      $('menu-note').textContent = 'Data soal tidak valid: ' + errors.join(' | ');
      console.error(errors);
    },
    showComplete(state) {
      const pct = state.stats.answered ? Math.round((state.stats.correct / state.stats.answered) * 100) : 0;
      $('complete-score').textContent = state.score; $('complete-acc').textContent = pct + '%';
    }
  };
  return ui;
}
