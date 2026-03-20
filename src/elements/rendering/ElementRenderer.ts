// Element renderer - dispatches to appropriate renderer based on element type
//
// Uses the plugin registry for all rendering and bounds calculations.
// Plugins are auto-registered when their modules are imported.

import type { Element, BoundingBox } from '../../types';
import type { StrokeRenderOptions } from '../../canvas/StrokeRenderer';
import {
  renderElement as registryRenderElement,
  getElementBounds as registryGetElementBounds,
} from '../registry';

// Import all plugins to ensure they're registered
import '../bridges';
import '../glyph';
import '../image';
import '../inktext';
import '../minesweeper';
import '../shape';
import '../sketchableimage';
import '../stroke';
import '../sudoku';
import '../tictactoe';

export interface ElementRenderOptions {
  // Options to pass to stroke rendering
  strokeOptions?: StrokeRenderOptions;
  // Morph animation progress for shapes (0 = source strokes, 1 = final shape)
  morphProgress?: number;
}

// Render any element type using the plugin registry
export function renderElement(
  ctx: CanvasRenderingContext2D,
  element: Element,
  options: ElementRenderOptions = {}
): void {
  registryRenderElement(ctx, element, {
    strokeOptions: options.strokeOptions,
    morphProgress: options.morphProgress,
  });
}

// Get bounding box for any element using the plugin registry
export function getElementBounds(element: Element): BoundingBox | null {
  return registryGetElementBounds(element);
}
