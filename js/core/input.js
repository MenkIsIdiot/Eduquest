// Input keyboard + sentuh -> aksi abstrak (vector, interact, pause). Game tidak peduli perangkatnya.
const DIR = { arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r', arrowup: 'u', w: 'u', arrowdown: 'd', s: 'd' };
const $ = (id) => document.getElementById(id);

export function createInput() {
  const keys = new Set();
  let joy = { x: 0, y: 0 }, interact = false, pause = false;
  const api = {
    enabled: false, // true hanya saat mode 'playing'
    vector() {
      let x = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0) + joy.x;
      let y = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0) + joy.y;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return { x, y };
    },
    consumeInteract() { const v = interact; interact = false; return v; },
    consumePause() { const v = pause; pause = false; return v; },
    reset() { keys.clear(); joy = { x: 0, y: 0 }; interact = false; pause = false; }
  };

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape' || k === 'p') { if (!e.repeat) pause = true; if (api.enabled) e.preventDefault(); return; }
    if (!api.enabled) return;
    if (DIR[k]) { keys.add(DIR[k]); e.preventDefault(); }
    else if (k === 'e' || k === ' ' || k === 'enter') { if (!e.repeat) interact = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(DIR[e.key.toLowerCase()]));
  window.addEventListener('blur', () => { keys.clear(); joy = { x: 0, y: 0 }; });

  // Joystick virtual (Pointer Events + pointer capture)
  const base = $('joystick'), stick = $('stick'), act = $('btn-act');
  let pid = null;
  const setJoy = (e) => {
    const r = base.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const len = Math.hypot(dx, dy), k = len > R ? R / len : 1;
    dx *= k; dy *= k;
    stick.style.transform = `translate(${dx}px,${dy}px)`;
    joy = Math.hypot(dx, dy) / R < 0.2 ? { x: 0, y: 0 } : { x: dx / R, y: dy / R };
  };
  const end = (e) => { if (e.pointerId === pid) { pid = null; joy = { x: 0, y: 0 }; stick.style.transform = ''; } };
  base.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; base.setPointerCapture(pid); setJoy(e); });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === pid) setJoy(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => base.addEventListener(t, end));
  act.addEventListener('pointerdown', (e) => { e.preventDefault(); if (api.enabled) interact = true; });
  return api;
}
