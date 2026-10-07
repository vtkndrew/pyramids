export type GameMode = 'classic' | 'hardcore';
export type Config = Readonly<{ rods: number; disks: number; mode: GameMode }>;
export type Board = ReadonlyArray<ReadonlyArray<number>>;
export type Game = Readonly<{
  config: Config;
  history: ReadonlyArray<Board>;
  cursor: number;
  selected: number | null;
  error: string | null;
  paused: boolean;
}>;
export type Action =
  | { type: 'select'; rod: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'restart' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'start'; config: Config };

export const DEFAULT_CONFIG: Config = { rods: 3, disks: 5, mode: 'classic' };

export function createGame(config: Config): Game {
  if (!Number.isInteger(config.rods) || config.rods < 3 || config.rods > 6
    || !Number.isInteger(config.disks) || config.disks < 3 || config.disks > 10) {
    throw new RangeError('Выберите 3–6 стержней и 3–10 дисков.');
  }
  if (config.mode !== 'classic' && config.mode !== 'hardcore') {
    throw new RangeError('Выберите обычный или хардкорный режим.');
  }
  const board: Board = Array.from({ length: config.rods }, (_, rod) =>
    rod === 0 ? Array.from({ length: config.disks }, (_, i) => config.disks - i) : [],
  );
  return { config: { ...config }, history: [board], cursor: 0, selected: null, error: null, paused: false };
}

export function currentBoard(game: Game): Board {
  return game.history[game.cursor];
}

export function isWon(game: Game): boolean {
  return currentBoard(game)[game.config.rods - 1].length === game.config.disks;
}

export function moveError(board: Board, from: number, to: number, mode: GameMode): string | null {
  if (!board[from] || !board[to]) return 'Выберите стержень на поле.';
  if (from === to) return 'Выберите другой стержень.';
  const disk = board[from].at(-1);
  if (disk === undefined) return 'На этом стержне нет дисков. Выберите другой.';
  if (mode === 'hardcore' && Math.abs(from - to) !== 1) {
    return 'В хардкоре диск можно перенести только на соседний стержень.';
  }
  const top = board[to].at(-1);
  if (top !== undefined && disk > top) return 'Большой диск нельзя положить на маленький. Выберите другой стержень.';
  return null;
}

export function gameReducer(game: Game, action: Action): Game {
  if (game.paused && (action.type === 'select' || action.type === 'undo' || action.type === 'redo')) return game;
  switch (action.type) {
    case 'start': return createGame(action.config);
    case 'restart': return createGame(game.config);
    case 'pause': return isWon(game) ? game : { ...game, paused: true, selected: null, error: null };
    case 'resume': return { ...game, paused: false };
    case 'undo': return { ...game, cursor: Math.max(0, game.cursor - 1), selected: null, error: null };
    case 'redo': return { ...game, cursor: Math.min(game.history.length - 1, game.cursor + 1), selected: null, error: null };
    case 'select': {
      if (isWon(game)) return game;
      const board = currentBoard(game);
      if (!board[action.rod]) return game;
      if (game.selected === action.rod) return { ...game, selected: null, error: null };
      if (game.selected === null) {
        return board[action.rod].length
          ? { ...game, selected: action.rod, error: null }
          : { ...game, error: 'На этом стержне нет дисков. Выберите другой.' };
      }
      const error = moveError(board, game.selected, action.rod, game.config.mode);
      if (error) return { ...game, error };
      const next = board.map(rod => [...rod]);
      next[action.rod].push(next[game.selected].pop()!);
      return {
        ...game,
        history: [...game.history.slice(0, game.cursor + 1), next],
        cursor: game.cursor + 1,
        selected: null,
        error: null,
      };
    }
  }
}
