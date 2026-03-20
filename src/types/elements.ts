// Element types matching the protobuf schema and Kotlin sealed classes

import type { Matrix, Offset, Quad, BoundingBox } from './primitives';
import { IDENTITY_MATRIX } from './primitives';
import type { Stroke } from './brush';

// Base element properties shared by transformed elements
export interface TransformableElement {
  id: string;
  transform: Matrix;
}

// StrokeElement: Raw ink strokes (no transform, strokes are in absolute coordinates)
export interface StrokeElement {
  type: 'stroke';
  id: string;
  strokes: Stroke[];
}

// ShapeElement: Vector shapes with transform
export interface ShapePathCommand {
  type: 'moveTo' | 'lineTo' | 'quadTo' | 'cubicTo' | 'close';
  points?: Offset[];
}

export interface ShapePath {
  commands: ShapePathCommand[];
  fillColor?: number;
  strokeColor?: number;
  strokeWidth?: number;
}

export interface ShapeElement extends TransformableElement {
  type: 'shape';
  paths: ShapePath[];
  sourceStrokes?: Stroke[]; // Original strokes that were beautified into this shape
}

// GlyphElement: Text glyphs with transform
export interface GlyphElement extends TransformableElement {
  type: 'glyph';
  text: string;
  fontFamily?: string;
  fontSize: number;
  fontWeight?: number;
  color: number;
}

// InkTextElement: Recognized handwriting with tokens
export interface InkTextToken {
  text: string;
  quad: Quad; // Bounding quad for this token
  strokeIndices: number[]; // Indices into sourceStrokes
  baseline?: number; // Y position of text baseline
  confidence?: number;
}

export interface InkTextLine {
  tokens: InkTextToken[];
  baseline: number;
}

export interface InkTextElement extends TransformableElement {
  type: 'inkText';
  lines: InkTextLine[];
  sourceStrokes: Stroke[];
  layoutWidth?: number; // Width for text wrapping
  writingAngle?: number; // Estimated writing angle in radians
}

// CoordinatePlaneElement: Interactive coordinate plane
//
// Coordinate system:
// - transform.values[6,7] positions the top-left corner of the bounding box in canvas coords
// - All internal coordinates (origin, points, strokes) are in LOCAL space relative to transform
// - Local (0,0) is at the top-left corner of the element's bounding box
// - To convert local to canvas: canvasX = localX + transform.values[6]

export interface PlottedPoint {
  x: number;                // Grid coordinate (-5, -4, ..., 4, 5)
  y: number;                // Grid coordinate (-5, -4, ..., 4, 5)
  position: Offset;         // Position in LOCAL coordinates (relative to element's top-left)
}

// Ink stroke stored in the coordinate plane's local coordinate system
export interface RelativeStroke {
  stroke: Stroke;           // Stroke with inputs in LOCAL coordinates
  originOffset: Offset;     // Offset from plane origin when stroke was drawn (for reference)
}

export interface CoordinatePlaneElement extends TransformableElement {
  type: 'coordinatePlane';
  origin: Offset;           // Where axes intersect in LOCAL coordinates (relative to top-left)

  // Axis lengths in each direction from origin
  xAxisPositive: number;    // Length extending right (+X)
  xAxisNegative: number;    // Length extending left (-X)
  yAxisPositive: number;    // Length extending up (+Y)
  yAxisNegative: number;    // Length extending down (-Y)

  gridSpacing: number;      // Distance between grid lines
  gridCount: number;        // Number of grid divisions per direction (default 5)
  points: PlottedPoint[];   // User-plotted points (in LOCAL coordinates)
  sourceStrokes: Stroke[];  // Original arrow strokes (in LOCAL coordinates)
  inkStrokes: RelativeStroke[];  // User-drawn ink (in LOCAL coordinates)
}

// TicTacToeElement: Interactive game
export const TicTacToePiece = {
  EMPTY: 'EMPTY',
  X: 'X',
  O: 'O',
} as const;
export type TicTacToePiece = (typeof TicTacToePiece)[keyof typeof TicTacToePiece];

export const TicTacToeGameState = {
  PLAYING: 'PLAYING',
  X_WINS: 'X_WINS',
  O_WINS: 'O_WINS',
  TIE: 'TIE',
} as const;
export type TicTacToeGameState = (typeof TicTacToeGameState)[keyof typeof TicTacToeGameState];

export interface TicTacToeCell {
  quad: Quad;
  piece: TicTacToePiece;
  pieceStrokes?: Stroke[]; // Strokes that form the X piece (if any)
}

export interface TicTacToeElement extends TransformableElement {
  type: 'tictactoe';
  cells: TicTacToeCell[]; // 9 cells, row-major order (0-2: top row, 3-5: middle, 6-8: bottom)
  gameState: TicTacToeGameState;
  gridStrokes: Stroke[]; // The 4 strokes that form the # grid
  intersections: [Offset, Offset, Offset, Offset]; // 4 intersection points of grid lines
  humanPiece?: TicTacToePiece; // The piece the human player uses (X or O), determined by first move
  cpuMoveTimestamp?: number; // performance.now() when CPU drawing animation should start (includes random delay)
  cpuMoveCellIndex?: number; // Cell index of the most recent CPU move (for animation)
}

/*
 * SketchableImageElement: AI-assisted sketch canvas.
 *
 * TODO: bitmapDataUrl stores the full base64 PNG inline, which means every
 * undo/redo snapshot carries a copy (~300KB–1MB each). Consider a content-
 * addressable blob store (hash → dataUrl) with only the hash in state.
 */
export const SKETCHABLE_IMAGE_SIZE = 512;

export interface SketchableImageElement extends TransformableElement {
  type: 'sketchableImage';
  bitmapDataUrl: string;
  overlayStrokes: Stroke[];
  hiddenStrokeCount: number;
  scaleX: number;
  scaleY: number;
  isGenerating: boolean;
}

// SudokuElement: Interactive 9x9 puzzle
export interface SudokuGameState {
  grid: number[];
  originalGrid: number[];
}

export interface SudokuElement extends TransformableElement {
  type: 'sudoku';
  width: number;
  height: number;
  gameState: SudokuGameState;
  playerDigitStrokes: Record<number, Stroke[]>;
  placeholderCells: number[];
  conflictCells: number[];
}

// BridgesElement: Interactive Hashiwokakero puzzle
export interface BridgesIsland {
  row: number;
  col: number;
  requiredBridges: number;
}

export interface BridgeConnection {
  island1: number;
  island2: number;
  count: number;
}

export interface BridgesGameState {
  gridCols: number;
  gridRows: number;
  islands: BridgesIsland[];
  bridges: BridgeConnection[];
}

export interface BridgesElement extends TransformableElement {
  type: 'bridges';
  width: number;
  height: number;
  gameState: BridgesGameState;
}

/*
 * ImageElement: User-uploaded image (from camera or gallery).
 *
 * TODO: imageDataUrl stores the full base64 inline, which means every
 * undo/redo snapshot carries a copy. Consider a content-addressable blob
 * store (hash → dataUrl) shared with SketchableImageElement.
 */
export interface ImageElement extends TransformableElement {
  type: 'image';
  imageDataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
}

// MinesweeperElement: Interactive mine-clearing puzzle
export interface MinesweeperCell {
  hasMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
}

export interface MinesweeperGameState {
  rows: number;
  cols: number;
  cells: MinesweeperCell[];
  gameOver: boolean;
  won: boolean;
  minesPlaced: boolean;
  mineCount: number;
}

export interface MinesweeperElement extends TransformableElement {
  type: 'minesweeper';
  width: number;
  height: number;
  gameState: MinesweeperGameState;
}

// Union type for all elements
export type Element =
  | StrokeElement
  | ShapeElement
  | GlyphElement
  | InkTextElement
  | TicTacToeElement
  | CoordinatePlaneElement
  | SketchableImageElement
  | ImageElement
  | SudokuElement
  | BridgesElement
  | MinesweeperElement;

// Type guards
export function isStrokeElement(element: Element): element is StrokeElement {
  return element.type === 'stroke';
}

export function isShapeElement(element: Element): element is ShapeElement {
  return element.type === 'shape';
}

export function isGlyphElement(element: Element): element is GlyphElement {
  return element.type === 'glyph';
}

export function isInkTextElement(element: Element): element is InkTextElement {
  return element.type === 'inkText';
}

export function isTicTacToeElement(element: Element): element is TicTacToeElement {
  return element.type === 'tictactoe';
}

export function isCoordinatePlaneElement(element: Element): element is CoordinatePlaneElement {
  return element.type === 'coordinatePlane';
}

export function isSketchableImageElement(element: Element): element is SketchableImageElement {
  return element.type === 'sketchableImage';
}

export function isImageElement(element: Element): element is ImageElement {
  return element.type === 'image';
}

export function isSudokuElement(element: Element): element is SudokuElement {
  return element.type === 'sudoku';
}

export function isBridgesElement(element: Element): element is BridgesElement {
  return element.type === 'bridges';
}

export function isMinesweeperElement(element: Element): element is MinesweeperElement {
  return element.type === 'minesweeper';
}

export function isTransformableElement(element: Element): element is TransformableElement & Element {
  return element.type !== 'stroke';
}

// Element utilities
export function createStrokeElement(strokes: Stroke[], id?: string): StrokeElement {
  return {
    type: 'stroke',
    id: id ?? generateId(),
    strokes,
  };
}

export function createEmptyTicTacToeElement(
  gridStrokes: Stroke[],
  intersections: [Offset, Offset, Offset, Offset],
  cells: TicTacToeCell[],
  id?: string
): TicTacToeElement {
  return {
    type: 'tictactoe',
    id: id ?? generateId(),
    transform: IDENTITY_MATRIX,
    cells,
    gameState: TicTacToeGameState.PLAYING,
    gridStrokes,
    intersections,
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a CoordinatePlaneElement with proper transform-based positioning.
 *
 * @param canvasOrigin - Where axes intersect in CANVAS coordinates
 * @param xAxisPositive - Length extending right (+X)
 * @param xAxisNegative - Length extending left (-X)
 * @param yAxisPositive - Length extending up (+Y)
 * @param yAxisNegative - Length extending down (-Y)
 * @param gridSpacing - Distance between grid lines
 * @param gridCount - Number of grid divisions
 * @param canvasSourceStrokes - Original arrow strokes in CANVAS coordinates
 * @param id - Optional element ID
 *
 * The function computes the bounding box, sets transform to the top-left corner,
 * and converts all coordinates to LOCAL space.
 */
export function createCoordinatePlaneElement(
  canvasOrigin: Offset,
  xAxisPositive: number,
  xAxisNegative: number,
  yAxisPositive: number,
  yAxisNegative: number,
  gridSpacing: number,
  gridCount: number,
  canvasSourceStrokes: Stroke[],
  id?: string
): CoordinatePlaneElement {
  // Calculate the bounding box top-left in canvas coordinates
  // Add padding for labels and handles
  const padding = 30;
  const topLeftX = canvasOrigin.x - xAxisNegative - padding;
  const topLeftY = canvasOrigin.y - yAxisPositive - padding;

  // Create transform that positions the top-left corner
  const transform: Matrix = {
    values: [1, 0, 0, 0, 1, 0, topLeftX, topLeftY, 1],
  };

  // Convert origin to local coordinates (relative to top-left)
  const localOrigin: Offset = {
    x: canvasOrigin.x - topLeftX,
    y: canvasOrigin.y - topLeftY,
  };

  // Convert source strokes to local coordinates
  const localSourceStrokes = canvasSourceStrokes.map(stroke => ({
    ...stroke,
    inputs: {
      ...stroke.inputs,
      inputs: stroke.inputs.inputs.map(input => ({
        ...input,
        x: input.x - topLeftX,
        y: input.y - topLeftY,
      })),
    },
  }));

  return {
    type: 'coordinatePlane',
    id: id ?? generateId(),
    transform,
    origin: localOrigin,
    xAxisPositive,
    xAxisNegative,
    yAxisPositive,
    yAxisNegative,
    gridSpacing,
    gridCount,
    points: [],
    sourceStrokes: localSourceStrokes,
    inkStrokes: [],
  };
}

export function createImageElement(
  bounds: BoundingBox,
  imageDataUrl: string,
  naturalWidth: number,
  naturalHeight: number,
  targetWidth?: number,
  targetHeight?: number,
  id?: string
): ImageElement {
  const rectWidth = Math.max(50, targetWidth ?? (bounds.right - bounds.left));
  const rectHeight = Math.max(50, targetHeight ?? (bounds.bottom - bounds.top));

  /* Fit image within rectangle bounds, preserving aspect ratio */
  const aspectRatio = naturalHeight > 0 ? naturalWidth / naturalHeight : 1;
  let displayWidth: number;
  let displayHeight: number;

  if (rectWidth / rectHeight > aspectRatio) {
    displayHeight = rectHeight;
    displayWidth = rectHeight * aspectRatio;
  } else {
    displayWidth = rectWidth;
    displayHeight = rectWidth / aspectRatio;
  }

  /* Center the image within bounds */
  const offsetX = (rectWidth - displayWidth) / 2;
  const offsetY = (rectHeight - displayHeight) / 2;

  return {
    type: 'image',
    id: id ?? generateId(),
    transform: {
      values: [1, 0, 0, 0, 1, 0, bounds.left + offsetX, bounds.top + offsetY, 1],
    },
    imageDataUrl,
    naturalWidth,
    naturalHeight,
    displayWidth,
    displayHeight,
  };
}

export function createSketchableImageElement(
  canvasX: number,
  canvasY: number,
  id?: string
): SketchableImageElement {
  return {
    type: 'sketchableImage',
    id: id ?? generateId(),
    transform: {
      values: [1, 0, 0, 0, 1, 0, canvasX, canvasY, 1],
    },
    bitmapDataUrl: '',
    overlayStrokes: [],
    hiddenStrokeCount: 0,
    scaleX: 1,
    scaleY: 1,
    isGenerating: false,
  };
}

// Check if element supports background color
export function supportsBackgroundColor(element: Element): boolean {
  return element.type === 'shape';
}

// Get stroke color from element (returns undefined if not applicable or mixed)
export function getElementStrokeColor(element: Element): number | undefined {
  if (isShapeElement(element)) {
    if (element.paths.length === 0) return undefined;
    const firstColor = element.paths[0].strokeColor;
    // Check if all paths have same color
    const allSame = element.paths.every(p => p.strokeColor === firstColor);
    return allSame ? firstColor : undefined;
  }
  if (isStrokeElement(element)) {
    if (element.strokes.length === 0) return undefined;
    const firstColor = element.strokes[0].brush.color;
    const allSame = element.strokes.every(s => s.brush.color === firstColor);
    return allSame ? firstColor : undefined;
  }
  if (isGlyphElement(element)) {
    return element.color;
  }
  return undefined;
}

// Get background/fill color from element
export function getElementBackgroundColor(element: Element): number | undefined {
  if (isShapeElement(element)) {
    if (element.paths.length === 0) return undefined;
    const firstColor = element.paths[0].fillColor;
    const allSame = element.paths.every(p => p.fillColor === firstColor);
    return allSame ? firstColor : undefined;
  }
  return undefined;
}

// Set stroke color on element (returns new element)
export function setElementStrokeColor(element: Element, color: number): Element {
  if (isShapeElement(element)) {
    return {
      ...element,
      paths: element.paths.map(path => ({ ...path, strokeColor: color })),
    };
  }
  if (isStrokeElement(element)) {
    return {
      ...element,
      strokes: element.strokes.map(stroke => ({
        ...stroke,
        brush: { ...stroke.brush, color },
      })),
    };
  }
  if (isGlyphElement(element)) {
    return { ...element, color };
  }
  return element;
}

// Set background color on element (returns new element)
export function setElementBackgroundColor(element: Element, color: number | undefined): Element {
  if (isShapeElement(element)) {
    return {
      ...element,
      paths: element.paths.map(path => ({ ...path, fillColor: color })),
    };
  }
  return element;
}

// Get element bounding box (in element's local coordinates, before transform)
export function getElementLocalBounds(element: Element): BoundingBox | null {
  switch (element.type) {
    case 'stroke': {
      if (element.strokes.length === 0) return null;
      let left = Infinity,
        top = Infinity,
        right = -Infinity,
        bottom = -Infinity;
      for (const stroke of element.strokes) {
        for (const input of stroke.inputs.inputs) {
          left = Math.min(left, input.x);
          top = Math.min(top, input.y);
          right = Math.max(right, input.x);
          bottom = Math.max(bottom, input.y);
        }
        const halfSize = stroke.brush.size / 2;
        left -= halfSize;
        top -= halfSize;
        right += halfSize;
        bottom += halfSize;
      }
      return { left, top, right, bottom };
    }

    case 'tictactoe': {
      const allPoints = element.cells.flatMap((cell) => [
        cell.quad.topLeft,
        cell.quad.topRight,
        cell.quad.bottomRight,
        cell.quad.bottomLeft,
      ]);
      if (allPoints.length === 0) return null;
      return {
        left: Math.min(...allPoints.map((p) => p.x)),
        top: Math.min(...allPoints.map((p) => p.y)),
        right: Math.max(...allPoints.map((p) => p.x)),
        bottom: Math.max(...allPoints.map((p) => p.y)),
      };
    }

    case 'inkText': {
      const allPoints = element.lines.flatMap((line) =>
        line.tokens.flatMap((token) => [
          token.quad.topLeft,
          token.quad.topRight,
          token.quad.bottomRight,
          token.quad.bottomLeft,
        ])
      );
      if (allPoints.length === 0) return null;
      return {
        left: Math.min(...allPoints.map((p) => p.x)),
        top: Math.min(...allPoints.map((p) => p.y)),
        right: Math.max(...allPoints.map((p) => p.x)),
        bottom: Math.max(...allPoints.map((p) => p.y)),
      };
    }

    case 'shape': {
      // Would need to compute from paths - simplified for now
      return null;
    }

    case 'glyph': {
      // Would need font metrics - simplified for now
      return null;
    }

    case 'coordinatePlane': {
      const { origin, xAxisPositive, xAxisNegative, yAxisPositive, yAxisNegative } = element;
      return {
        left: origin.x - xAxisNegative,
        top: origin.y - yAxisPositive,
        right: origin.x + xAxisPositive,
        bottom: origin.y + yAxisNegative,
      };
    }

    case 'sketchableImage': {
      return {
        left: 0,
        top: 0,
        right: SKETCHABLE_IMAGE_SIZE * element.scaleX,
        bottom: SKETCHABLE_IMAGE_SIZE * element.scaleY,
      };
    }

    case 'image': {
      return {
        left: 0,
        top: 0,
        right: element.displayWidth,
        bottom: element.displayHeight,
      };
    }

    case 'sudoku': {
      return {
        left: 0,
        top: 0,
        right: element.width,
        bottom: element.height,
      };
    }

    case 'bridges': {
      return {
        left: 0,
        top: 0,
        right: element.width,
        bottom: element.height,
      };
    }

    case 'minesweeper': {
      return {
        left: 0,
        top: 0,
        right: element.width,
        bottom: element.height,
      };
    }
  }
}
