"""Tes browser QA (Playwright + Chromium). Jalankan: python3 -m http.server 8123 & python3 tests/e2e-browser.py
Set CHROME_PATH jika Chromium tidak ada di lokasi default."""
import asyncio, json, os
from playwright.async_api import async_playwright
URL = 'http://localhost:8123/index.html'
EXE = os.environ.get('CHROME_PATH', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
ANS = {'Berapakah hasil dari 12 × 8?': '96', 'Berapakah 3/4 dari 100?': '75', 'Sebuah persegi memiliki sisi 7 cm. Berapa kelilingnya?': '28 cm'}
R = {}; ERR = []; CTX = []

async def page(br, w=1280, h=720, touch=False):
    for c in CTX: await c.close()  # context lama dilepas agar headless tidak melambat
    CTX.clear()
    ctx = await br.new_context(viewport={'width': w, 'height': h}, is_mobile=touch, has_touch=touch)
    CTX.append(ctx); p = await ctx.new_page()
    p.on('pageerror', lambda e: ERR.append(str(e))); p.on('console', lambda m: ERR.append(m.text) if m.type == 'error' else None)
    await p.goto(URL); await p.wait_for_selector('#btn-start:not([disabled])'); return p
async def mode(p): return await p.evaluate("document.body.dataset.mode")
async def to_quiz(p):
    """Jalan ke kanan dalam potongan kecil sambil menekan E sampai kuis terbuka (tahan terhadap fps rendah)."""
    await p.click('#btn-start'); await p.wait_for_timeout(150)
    for _ in range(40):
        await p.keyboard.down('ArrowRight'); await p.wait_for_timeout(120); await p.keyboard.up('ArrowRight')
        await p.keyboard.press('e'); await p.wait_for_timeout(60)
        if await p.is_visible('#screen-quiz'): return True
    raise RuntimeError('kuis tidak terbuka (karakter tidak mencapai papan)')
async def answer(p):
    good = ANS[await p.inner_text('#quiz-text')]
    for b in await p.query_selector_all('#quiz-options button'):
        if (await b.inner_text()).split('. ', 1)[1] == good: await b.click(); return
async def metrics(p):
    return await p.evaluate("""()=>{document.querySelectorAll('.screen').forEach(e=>e.scrollTop=0);const r=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {t:Math.round(b.top),b:Math.round(b.bottom),l:Math.round(b.left),r:Math.round(b.right)}};
      return {W:innerWidth,H:innerHeight,xo:document.documentElement.scrollWidth>innerWidth+1,yo:document.documentElement.scrollHeight>innerHeight+1,hud:r('#hud'),canvas:r('#game'),controls:r('#controls'),start:r('#btn-start'),opt4:r('#quiz-options button:last-child'),panel:[...document.querySelectorAll('.screen')].filter(e=>!e.hidden).map(e=>{const b=e.querySelector('.panel').getBoundingClientRect();return {h:Math.round(b.height),w:Math.round(b.width),top:Math.round(b.top),cut:e.scrollWidth>e.clientWidth+1}})[0]}}""")

async def safe(name, coro):
    try: await coro
    except Exception as e: R[name + '_ERROR'] = repr(e)[:200]

async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(executable_path=EXE, args=['--no-sandbox'])
        try:
            # A: tombol Enter ditahan (key repeat) di kuis
            p = await page(br); await to_quiz(p)
            await p.keyboard.down('Enter')
            for _ in range(12): await p.wait_for_timeout(40); await p.keyboard.down('Enter')
            await p.keyboard.up('Enter')
            R['A_hold_enter'] = {'count': await p.inner_text('#quiz-count'), 'result_visible': await p.is_visible('#quiz-result'), 'mode': await mode(p)}
        except Exception as e: R['A_ERROR'] = repr(e)[:200]
        try:
            # B: fokus keyboard keluar dari dialog kuis
            p = await page(br); await to_quiz(p); ids = []
            for _ in range(9): await p.keyboard.press('Tab'); ids.append(await p.evaluate("document.activeElement.id||document.activeElement.tagName"))
            R['B_tab_ids'] = ids; R['B_focus_escapes_dialog'] = 'btn-pause' in ids
        except Exception as e: R['B_ERROR'] = repr(e)[:200]
        try:
            # C: joystick tertinggal saat mode berubah ketika jari masih menyentuh
            m = await page(br, 390, 844, True); await m.click('#btn-start'); await m.wait_for_timeout(200)
            bx = await (await m.query_selector('#joystick')).bounding_box(); cx, cy = bx['x'] + 66, bx['y'] + 66
            await m.mouse.move(cx, cy); await m.mouse.down(); await m.mouse.move(cx + 50, cy, steps=3)
            await m.keyboard.press('Escape'); await m.wait_for_timeout(150); await m.mouse.up()
            await m.keyboard.press('Escape'); await m.wait_for_timeout(200)
            R['C_joystick'] = await m.evaluate("({mode:document.body.dataset.mode,transform:document.getElementById('stick').style.transform,active:document.getElementById('joystick').classList.contains('active')})")
        except Exception as e: R['C_ERROR'] = repr(e)[:200]
        try:
            # D: konfirmasi mulai-ulang saat dialog native diblokir/ditolak (mis. iframe tanpa allow-modals)
            p = await page(br); await p.click('#btn-start'); await p.wait_for_timeout(150); await p.reload(); await p.wait_for_selector('#btn-start:not([disabled])')
            await p.click('#btn-start'); await p.wait_for_timeout(300)
            has_confirm = await p.query_selector('#screen-confirm') is not None
            R['D_start_with_save'] = {'mode': await mode(p), 'confirm_visible': await p.is_visible('#screen-confirm') if has_confirm else None}
            if has_confirm:
                await p.click('#confirm-cancel'); await p.wait_for_timeout(150)
                R['D_cancel'] = {'mode': await mode(p), 'menu_visible': await p.is_visible('#screen-menu')}
                await p.click('#btn-start'); await p.click('#confirm-ok'); await p.wait_for_timeout(200)
                R['D_ok'] = {'mode': await mode(p)}
                await p.keyboard.press('Escape'); await p.wait_for_timeout(150); await p.click('#btn-restart'); await p.wait_for_timeout(150)
                R['D_restart_from_pause'] = {'confirm_visible': await p.is_visible('#screen-confirm'), 'mode': await mode(p)}
                await p.keyboard.press('Escape'); await p.wait_for_timeout(150)  # Esc di dialog = Batal, game tetap dijeda
                R['D_esc_in_confirm'] = {'mode': await mode(p), 'confirm_visible': await p.is_visible('#screen-confirm'), 'pause_visible': await p.is_visible('#screen-pause')}
                await p.click('#btn-restart'); await p.click('#confirm-ok'); await p.wait_for_timeout(200)
                R['D_restart_done'] = {'mode': await mode(p), 'score': await p.inner_text('#hud-score')}
        except Exception as e: R['D_ERROR'] = repr(e)[:200]
        try:
            # E: klik ganda pada "Lihat hasil"
            p = await page(br); await to_quiz(p)
            for i in range(3):
                await answer(p); 
                if i < 2: await p.click('#quiz-next')
            await p.dblclick('#quiz-next'); await p.wait_for_timeout(200)
            R['E_dblclick_result'] = {'mode': await mode(p), 'result_visible': await p.is_visible('#quiz-result'), 'score': await p.inner_text('#hud-score')}
        except Exception as e: R['E_ERROR'] = repr(e)[:200]
        try:
            # F: ukuran layar
            R['F_layout'] = {}
            for (w, h, t) in [(320, 568, True), (360, 640, True), (568, 320, True), (844, 390, True), (768, 1024, True), (1024, 600, False), (1280, 500, False), (1920, 1080, False)]:
                q = await page(br, w, h, t); key = f'{w}x{h}{"T" if t else ""}'; out = {'menu': await metrics(q)}
                await to_quiz(q); out['quiz'] = await metrics(q); await q.keyboard.press('Escape')
                R['F_layout'][key] = out; await q.context.close()
        except Exception as e: R['F_ERROR'] = repr(e)[:200]
        R['console_errors'] = ERR
        await br.close()
    print(json.dumps(R, ensure_ascii=False))
asyncio.run(main())
