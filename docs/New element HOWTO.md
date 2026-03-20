# How to Add a New Element Type

This guide explains how to add a new element type to Ink Playground using the plugin architecture.

## Overview

Each element type is a self-contained plugin in `src/elements/<type>/`. A plugin can provide:
- **Rendering** (required) - How to draw the element
- **Creation** (optional) - How to create the element from ink strokes
- **Interaction** (optional) - How the element responds to additional ink input

## Steps

### 1. Define the Type (`src/types/elements.ts`)

Add your element interface, update the union type, and add a type guard:

```typescript
// Add interface
export interface CheckboxElement extends TransformableElement {
  type: 'checkbox';
  checked: boolean;
  sourceStrokes: Stroke[];
}

// Add to Element union
export type Element =
  | StrokeElement
  | ShapeElement
  | GlyphElement
  | InkTextElement
  | TicTacToeElement
  | CheckboxElement;  // <-- Add here

// Add type guard
export function isCheckboxElement(element: Element): element is CheckboxElement {
  return element.type === 'checkbox';
}
```

### 2. Create Plugin Directory

```
src/elements/checkbox/
  index.ts        # Plugin definition + registration
  renderer.ts     # Required: rendering logic
  creator.ts      # Optional: creation from ink
  interaction.ts  # Optional: ink interaction handling
```

### 3. Implement the Renderer (`renderer.ts`)

Every plugin must implement `render()` and `getBounds()`:

```typescript
import type { CheckboxElement, BoundingBox } from '../../types';
import type { RenderOptions } from '../registry/ElementPlugin';

export function render(
  ctx: CanvasRenderingContext2D,
  element: CheckboxElement,
  options?: RenderOptions
): void {
  // Draw the checkbox
  const bounds = getBounds(element);
  if (!bounds) return;

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(bounds.left, bounds.top, 20, 20);

  if (element.checked) {
    ctx.beginPath();
    ctx.moveTo(bounds.left + 4, bounds.top + 10);
    ctx.lineTo(bounds.left + 8, bounds.top + 16);
    ctx.lineTo(bounds.left + 16, bounds.top + 4);
    ctx.stroke();
  }
}

export function getBounds(element: CheckboxElement): BoundingBox | null {
  // Calculate bounds from sourceStrokes or fixed size
  // ...
}
```

### 4. Implement the Creator (`creator.ts`) - Optional

If your element can be created from ink strokes:

```typescript
import type { Stroke } from '../../types';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';

export function canCreate(strokes: Stroke[]): boolean {
  // Quick check: can these strokes potentially form a checkbox?
  // Return true if worth attempting creation
  return strokes.length >= 1 && strokes.length <= 2;
}

export async function createFromInk(
  strokes: Stroke[],
  context: CreationContext,
  recognitionResult?: HandwritingRecognitionResult
): Promise<CreationResult | null> {
  // Analyze strokes and create element if they match
  // Return null if strokes don't form a valid checkbox

  const element: CheckboxElement = {
    type: 'checkbox',
    id: generateId(),
    transform: IDENTITY_MATRIX,
    checked: false,
    sourceStrokes: strokes,
  };

  return {
    elements: [element],
    consumedStrokes: strokes,
    confidence: 0.85,
  };
}
```

### 5. Implement the Interaction (`interaction.ts`) - Optional

If your element responds to additional ink input:

```typescript
import type { Stroke, BoundingBox } from '../../types';
import type { CheckboxElement } from '../../types/elements';
import type { InteractionResult } from '../registry/ElementPlugin';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';

export function isInterestedIn(
  element: CheckboxElement,
  strokes: Stroke[],
  strokeBounds: BoundingBox
): boolean {
  // Return true if strokes overlap with this element
  // and the element should handle them
}

export async function acceptInk(
  element: CheckboxElement,
  strokes: Stroke[],
  recognitionResult?: HandwritingRecognitionResult
): Promise<InteractionResult> {
  // Handle the ink and return updated element
  const newElement: CheckboxElement = {
    ...element,
    checked: !element.checked,  // Toggle on any ink
  };

  return {
    element: newElement,
    consumed: true,
    strokesConsumed: strokes,
  };
}
```

### 6. Create the Plugin Definition (`index.ts`)

Wire everything together and register:

```typescript
import type { Element, CheckboxElement } from '../../types';
import { isCheckboxElement } from '../../types';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { registerPlugin } from '../registry/ElementRegistry';
import { render, getBounds } from './renderer';
// Import these only if you have them:
import { canCreate, createFromInk } from './creator';
import { isInterestedIn, acceptInk } from './interaction';

const checkboxPlugin: ElementPlugin<CheckboxElement> = {
  elementType: 'checkbox',
  name: 'Checkbox',

  // Type guard (required if using interaction)
  isElementOfType(element: Element): element is CheckboxElement {
    return isCheckboxElement(element);
  },

  // Creation (optional)
  canCreate,
  createFromInk,

  // Interaction (optional)
  isInterestedIn,
  acceptInk,

  // Rendering (required)
  render,
  getBounds,
};

// Auto-register on import
registerPlugin(checkboxPlugin);

export { checkboxPlugin };
```

### 7. Register the Plugin (`src/elements/index.ts`)

Add one import line:

```typescript
// Import all plugins to register them
import './stroke';
import './shape';
import './glyph';
import './inktext';
import './tictactoe';
import './checkbox';  // <-- Add this line
```

## That's It!

Your new element type will automatically:
- Render when present in `noteElements`
- Be created from ink (if you implemented creation)
- Handle ink interactions (if you implemented interaction)

No changes needed to `App.tsx`, `ElementRenderer.ts`, or any dispatch logic.

## Plugin Interface Reference

```typescript
interface ElementPlugin<T extends Element> {
  // Identification
  readonly elementType: string;  // Must match element's `type` field
  readonly name: string;         // Human-readable name

  // Type guard (required for interaction)
  isElementOfType?(element: Element): element is T;

  // Creation (optional)
  canCreate?(strokes: Stroke[]): boolean;
  createFromInk?(
    strokes: Stroke[],
    context: CreationContext,
    recognitionResult?: HandwritingRecognitionResult
  ): Promise<CreationResult | null>;

  // Interaction (optional)
  isInterestedIn?(element: T, strokes: Stroke[], strokeBounds: BoundingBox): boolean;
  acceptInk?(
    element: T,
    strokes: Stroke[],
    recognitionResult?: HandwritingRecognitionResult
  ): Promise<InteractionResult>;

  // Rendering (required)
  render(ctx: CanvasRenderingContext2D, element: T, options?: RenderOptions): void;
  getBounds(element: T): BoundingBox | null;
}
```

## Examples

- **Render-only**: See `src/elements/stroke/`, `src/elements/shape/`, `src/elements/glyph/`
- **With creation**: See `src/elements/inktext/`
- **Full featured**: See `src/elements/tictactoe/`
