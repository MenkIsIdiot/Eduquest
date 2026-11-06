// Tampilan kuis (DOM). Logika ada di systems/challenge.js.
import * as C from '../systems/challenge.js';
const $ = (id) => document.getElementById(id);

export function createQuizUI(ui) {
  const el = { topic: $('quiz-topic'), title: $('quiz-title'), count: $('quiz-count'), text: $('quiz-text'),
    opts: $('quiz-options'), fb: $('quiz-feedback'), next: $('quiz-next'), box: $('quiz-question'),
    res: $('quiz-result'), resText: $('quiz-result-text'), retry: $('quiz-retry'), close: $('quiz-close') };
  let s = null, h = null;

  function renderQuestion() {
    const item = C.currentQuestion(s);
    el.count.textContent = `Soal ${s.index + 1} dari ${s.questions.length}`;
    $('quiz-steps').replaceChildren(...s.questions.map((_, i) => { // penanda langkah: terisi = selesai, cincin = sekarang
      const d = document.createElement('span'); d.className = 'step' + (i < s.index ? ' done' : i === s.index ? ' now' : ''); return d; }));
    el.text.textContent = item.q.text;
    el.opts.replaceChildren(...item.options.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn option'; b.textContent = `${i + 1}. ${o.text}`;
      b.addEventListener('click', () => choose(i));
      return b;
    }));
    el.fb.hidden = true; el.next.hidden = true; el.box.hidden = false; el.res.hidden = true;
    el.opts.firstElementChild.focus();
  }
  function choose(i) {
    const r = C.answer(s, i);
    [...el.opts.children].forEach((b, j) => {
      b.disabled = true;
      b.classList.toggle('correct', j === r.correctShown);
      b.classList.toggle('wrong', !r.correct && j === i);
      if (j === r.correctShown) b.textContent = '✔ ' + b.textContent;       // ikon + garis, bukan hanya warna
      else if (j === i) b.textContent = '✘ ' + b.textContent;
    });
    el.fb.hidden = false; el.fb.className = 'feedback ' + (r.correct ? 'ok' : 'bad');
    el.fb.textContent = `${r.correct ? '✔ Benar!' : '✘ Kurang tepat.'}${r.points ? ` +${r.points} poin.` : ''} ${r.explanation}`;
    el.next.hidden = false; el.next.textContent = C.isLast(s) ? 'Lihat hasil' : 'Lanjut'; el.next.focus();
  }
  el.next.addEventListener('click', () => {
    if (!s) return;
    if (!C.isLast(s)) { C.next(s); renderQuestion(); return; }
    const r = C.finish(s);
    h.onResult(r);
    el.box.hidden = true; el.res.hidden = false;
    el.resText.textContent = `${r.passed ? 'Lulus!' : 'Belum lulus.'} Benar ${r.correct} dari ${r.total}. +${r.points} poin` +
      `${r.bonus ? ` (termasuk bonus sempurna +${r.bonus})` : ''}.${r.passed ? '' : ` Butuh minimal ${r.passScore} benar.`}`;
    el.retry.hidden = r.passed;
    el.close.textContent = r.passed ? 'Lanjutkan petualangan' : 'Kembali ke peta';
    (r.passed ? el.close : el.retry).focus();
  });
  el.retry.addEventListener('click', () => { s = null; h.onClose(true); });
  el.close.addEventListener('click', () => { s = null; h.onClose(false); });

  // Pintasan keyboard: angka 1-4 memilih jawaban, panah atas/bawah memindah fokus.
  $('screen-quiz').addEventListener('keydown', (e) => {
    const bs = [...el.opts.children].filter((b) => !b.disabled);
    if (/^[1-4]$/.test(e.key) && bs.length && !el.box.hidden) { el.opts.children[+e.key - 1]?.click(); e.preventDefault(); }
    else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && bs.length) {
      const i = bs.indexOf(document.activeElement);
      bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus(); e.preventDefault();
    }
  });

  return { open(session, handlers) {
    s = session; h = handlers;
    el.topic.textContent = s.challenge.topic; el.title.textContent = s.challenge.title;
    renderQuestion(); ui.show('quiz');
    el.opts.firstElementChild.focus();
  } };
}
