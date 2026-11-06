# EduQuest: The Lost Kingdom (prototipe 1)

## Menjalankan
Butuh server statis karena memakai ES Modules (tidak bisa dibuka lewat `file://`):
```
cd eduquest && python3 -m http.server 8000     # lalu buka http://localhost:8000
```
HP di jaringan yang sama: buka `http://<IP-komputer>:8000`.

## Kontrol
Komputer: panah/WASD bergerak, E/Spasi/Enter interaksi, Esc/P jeda. Kuis: angka 1-4 atau Tab/panah + Enter.
HP: joystick kiri bawah, tombol Aksi kanan bawah, tombol Jeda di atas.

## Mengedit soal
Edit `data/questions.js` (tepat 4 opsi, `correctIndex` 0-3, `explanation` wajib). Data divalidasi saat game dimuat; kesalahan ditampilkan di menu.

## Pengujian
`node --test "tests/*.test.js"` menjalankan uji logika murni + simulasi alur game tanpa browser.
Tes browser (butuh Playwright + Chromium): `python3 -m http.server 8123 &` lalu `python3 tests/e2e-browser.py` (set `CHROME_PATH` bila perlu). Mencakup key-repeat, fokus dialog, konfirmasi restart, dan ukuran layar.
Checklist manual (belum otomatis): gerakan terasa wajar, layout portrait/landscape HP, joystick, fokus keyboard, tampilan kuis.

## Menerbitkan
Unggah seluruh folder ke hosting statis (GitHub Pages, Netlify, dll). Tanpa build step.
