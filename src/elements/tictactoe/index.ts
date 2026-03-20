// TicTacToe Element Plugin
//
// Self-contained element type for TicTacToe games.
// Importing this module automatically registers the plugin.

import type { Element, TicTacToeElement } from '../../types';
import { isTicTacToeElement } from '../../types';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { registerPlugin } from '../registry/ElementRegistry';
import { canCreate, createFromInk } from './creator';
import { isInterestedIn, acceptInk } from './interaction';
import { render, getBounds } from './renderer';

const ticTacToePlugin: ElementPlugin<TicTacToeElement> = {
  elementType: 'tictactoe',
  name: 'TicTacToe',

  // Type guard
  isElementOfType(element: Element): element is TicTacToeElement {
    return isTicTacToeElement(element);
  },

  // Creation
  canCreate,
  createFromInk,

  // Interaction
  isInterestedIn,
  acceptInk,

  // Rendering
  render,
  getBounds,
};

// Auto-register on import
registerPlugin(ticTacToePlugin);

export { ticTacToePlugin };
