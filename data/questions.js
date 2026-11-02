// Data soal. Edit file ini saja untuk mengganti soal; tidak perlu menyentuh logika game.
// Aturan: tepat 4 opsi, correctIndex 0-3, id unik, explanation wajib, unlocks = nomor zona.
export const CHALLENGES = [
  {
    id: 'math-1',
    title: 'Teka-teki Gerbang Batu',
    topic: 'Matematika',
    zone: 1,
    unlocks: 2,
    passScore: 2, // minimal jawaban benar untuk lulus
    questions: [
      { id: 'math-1-q1', text: 'Berapakah hasil dari 12 × 8?',
        options: ['86', '96', '106', '88'], correctIndex: 1,
        explanation: '12 × 8 = 96. Cara cepat: (10 × 8) + (2 × 8) = 80 + 16.' },
      { id: 'math-1-q2', text: 'Berapakah 3/4 dari 100?',
        options: ['25', '50', '75', '80'], correctIndex: 2,
        explanation: '100 ÷ 4 = 25, lalu 25 × 3 = 75.' },
      { id: 'math-1-q3', text: 'Sebuah persegi memiliki sisi 7 cm. Berapa kelilingnya?',
        options: ['14 cm', '28 cm', '49 cm', '21 cm'], correctIndex: 1,
        explanation: 'Keliling persegi = 4 × sisi = 4 × 7 = 28 cm. (49 adalah luasnya.)' }
    ]
  }
];
