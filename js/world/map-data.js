// Peta 28x12 tile. Legenda: # dinding, T pohon, R batu, . rumput, G gerbang (terkunci), F tujuan.
export const ZONES = { 1: 'Desa Aldara', 2: 'Hutan Kristal' };
export const MAP = { grid: [
  '############################',
  '#..T.......R..#TTTT........#',
  '#.............#............#',
  '#.R...........#...T........#',
  '#......T......#............#',
  '#.............#............#',
  '#.............G..........F.#',
  '#.............#..T.........#',
  '#....R........#............#',
  '#..T..........#............#',
  '#.............#TT..........#',
  '############################'
] };
export const PLAYER_START = { x: 70, y: 198 };   // tile (2,6)
export const ZONE2_SPAWN = { x: 486, y: 198 };   // tile (15,6)
export const BOARDS = [{ id: 'board-1', challengeId: 'math-1', tx: 9, ty: 5, label: 'Papan Tantangan' }];
export const GATES = [{ zone: 2, tx: 14, ty: 6 }];
