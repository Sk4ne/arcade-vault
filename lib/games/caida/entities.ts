import {
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLS,
  GHOST_ALPHA,
  NEXT_SIZE,
  NEXT_X,
  NEXT_Y,
  PIECES,
  PIECE_TYPES,
  ROWS,
  type Shape,
} from "./constants";

/** ROWS × COLS; 0 = vacío, 1–8 = tipo de la pieza fijada. */
export type Board = number[][];

export type Piece = { type: number; shape: number[][]; x: number; y: number };

/** Colores ya resueltos desde las variables CSS. */
export type Palette = {
  pieces: string[]; // índice = tipo de pieza; [0] sin uso
  grid: string;
  frame: string;
  label: string;
  font: string; // familia para el rótulo SIGUIENTE
};

/** Glow neón: solo para la pieza activa. */
const GLOW = 14;

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

function copyShape(shape: Shape): number[][] {
  return shape.map((row) => [...row]);
}

/** Sorteo uniforme entre los 8 tipos, centrada arriba como en el original. */
export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_TYPES) + 1;
  const shape = copyShape(PIECES[type] as Shape);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

/** ¿La forma en (ox, oy) sale del tablero o se solapa con bloques fijados? */
export function collide(
  board: Board,
  shape: number[][],
  ox: number,
  oy: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

/** Rotación horaria: transpuesta + reverso de filas. */
export function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

/** Fila en la que aterrizaría la pieza si cayera recta. */
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}

/** Copia la pieza en el tablero. */
export function merge(board: Board, piece: Piece) {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        board[piece.y + r][piece.x + c] = piece.shape[r][c];
}

/** Elimina las filas completas (de abajo arriba) y devuelve cuántas. */
export function clearLines(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}

// ── Dibujo ────────────────────────────────────────────────────────────────────

/** Celda (x, y) de una rejilla cuyo origen está en (ox, oy). */
function drawBlock(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  x: number,
  y: number,
  type: number,
  palette: Palette,
  alpha = 1,
) {
  if (!type) return;
  const px = ox + x * BLOCK;
  const py = oy + y * BLOCK;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = palette.pieces[type];
  ctx.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
  // Brillo superior, como el original.
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(px + 1, py + 1, BLOCK - 2, 4);
  ctx.globalAlpha = 1;
}

/** Rejilla, marco y bloques fijados. */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  palette: Palette,
) {
  const bw = COLS * BLOCK;
  const bh = ROWS * BLOCK;

  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
    ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + bh);
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
    ctx.lineTo(BOARD_X + bw, BOARD_Y + r * BLOCK);
  }
  ctx.stroke();

  ctx.strokeStyle = palette.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(BOARD_X - 1, BOARD_Y - 1, bw + 2, bh + 2);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, BOARD_X, BOARD_Y, c, r, board[r][c], palette);
}

/** Pieza activa (con glow) o fantasma (translúcida, sin glow) en la fila y. */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  y: number,
  palette: Palette,
  ghost = false,
) {
  ctx.save();
  if (!ghost) {
    ctx.shadowColor = palette.pieces[piece.type];
  }
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!ghost) ctx.shadowBlur = GLOW; // drawBlock lo apaga para el brillo
      drawBlock(
        ctx,
        BOARD_X,
        BOARD_Y,
        piece.x + c,
        y + r,
        piece.shape[r][c],
        palette,
        ghost ? GHOST_ALPHA : 1,
      );
    }
  ctx.restore();
}

/** Rótulo SIGUIENTE, marco y la pieza siguiente centrada (o vacío). */
export function drawNext(
  ctx: CanvasRenderingContext2D,
  next: Piece | null,
  palette: Palette,
) {
  ctx.fillStyle = palette.label;
  ctx.font = `12px ${palette.font}`;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "left";
  ctx.fillText("SIGUIENTE", NEXT_X, NEXT_Y - 10);

  ctx.strokeStyle = palette.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(NEXT_X - 1, NEXT_Y - 1, NEXT_SIZE + 2, NEXT_SIZE + 2);

  if (!next) return;
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(ctx, NEXT_X, NEXT_Y, offX + c, offY + r, shape[r][c], palette);
}
