// Layar (menu, jeda, tamat), HUD, dan toast. Semua teks lewat textContent.
const $ = (id) => document.getElementById(id);

export function createUI() {
  const screens = {};
  for (const n of ['menu', 'pause', 'quiz', 'complete', 'confirm']) screens[n] = $('screen-' + n);
  let timer = null;
  const setBg = (off) => ['hud', 'stage', 'help', 'controls'].forEach((id) => { $(id).inert = off; }); // jebak fokus di dialog
  const ui = {
    show(name) {
      for (const [n, el] of Object.entries(screens)) el.hidden = n !== name;
      setBg(true);
      if (name !== 'quiz') screens[name].querySelector('button:not([disabled])')?.focus();
    },
    hideAll() { for (const el of Object.values(screens)) el.hidden = true; setBg(false); document.activeElement?.blur?.(); },
    /** Dialog Ya/Batal. Batal/Esc kembali ke layar `backTo`. Menyelesaikan Promise<boolean>. */
    confirm(message, okLabel, backTo) {
      return new Promise((resolve) => {
        const ok = $('confirm-ok'), cancel = $('confirm-cancel'), el = screens.confirm;
        $('confirm-text').textContent = message; ok.textContent = okLabel;
        const done = (v) => { ok.onclick = cancel.onclick = el.onkeydown = null; if (!v) ui.show(backTo); resolve(v); };
        ok.onclick = () => done(true); cancel.onclick = () => done(false);
        el.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Escape') done(false); }; // Esc tidak boleh menjeda/melanjutkan game
        ui.show('confirm');
      });
    },
    setMode(m) { document.body.dataset.mode = m; },
    setHud(score, done, total) {
      const s = $('hud-score'), changed = s.textContent !== String(score);
      s.textContent = score; $('hud-progress').textContent = `${done}/${total}`;
      $('hud-bar').style.width = (total ? (done / total) * 100 : 0) + '%';
      if (changed) { s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); } // animasi skor naik
    },
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
      const n = pct >= 90 ? 3 : pct >= 60 ? 2 : 1; // peringkat bintang (hanya tampilan)
      $('complete-stars').textContent = '★'.repeat(n) + '☆'.repeat(3 - n); $('complete-stars').setAttribute('aria-label', `${n} dari 3 bintang`);
    }
  };
  return ui;
}
