// Sudoku Element Plugin

import type { Element, SudokuElement } from '../../types';
import { isSudokuElement, generateId } from '../../types';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { registerPlugin } from '../registry/ElementRegistry';
import { registerPaletteEntry } from '../../palette/PaletteRegistry';
import { isInterestedIn, acceptInk } from './interaction';
import { render, getBounds } from './renderer';
import { generatePuzzle } from './puzzleGenerator';

const CANVAS_GRID = 50;
const GRID_SIZE = 9;

const sudokuPlugin: ElementPlugin<SudokuElement> = {
  elementType: 'sudoku',
  name: 'Sudoku',

  isElementOfType(element: Element): element is SudokuElement {
    return isSudokuElement(element);
  },

  isInterestedIn,
  acceptInk,

  render,
  getBounds,
};

registerPlugin(sudokuPlugin);

registerPaletteEntry({
  id: 'sudoku',
  label: 'Sudoku',
  icon: 'sudoku',
  category: 'game',
  onSelect: async (bounds, consumeStrokes) => {
    const rectSize = Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top);
    const side = Math.max(
      CANVAS_GRID * GRID_SIZE,
      Math.round(rectSize / CANVAS_GRID) * CANVAS_GRID,
    );

    const cx = (bounds.left + bounds.right) / 2;
    const cy = (bounds.top + bounds.bottom) / 2;
    const originX = Math.round((cx - side / 2) / CANVAS_GRID) * CANVAS_GRID;
    const originY = Math.round((cy - side / 2) / CANVAS_GRID) * CANVAS_GRID;

    const gameState = generatePuzzle();

    consumeStrokes();

    return {
      type: 'sudoku' as const,
      id: generateId(),
      transform: {
        values: [1, 0, 0, 0, 1, 0, originX, originY, 1] as [number, number, number, number, number, number, number, number, number],
      },
      width: side,
      height: side,
      gameState,
      playerDigitStrokes: {},
      placeholderCells: [],
      conflictCells: [],
    };
  },
});

export { sudokuPlugin };
