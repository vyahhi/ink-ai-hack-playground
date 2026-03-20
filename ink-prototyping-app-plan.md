# React Ink Prototyping Environment - Implementation Plan

> **Note:** This is the original implementation plan. The actual directory structure
> has diverged from what is described below; see `CLAUDE.md` for the current layout.

## Progress Tracking

| Phase | Description | Status | Completion Date |
|-------|-------------|--------|-----------------|
| 1 | View-Only Interactive Canvas | ✅ Complete | - |
| 2 | Live Inking | ✅ Complete | - |
| 3 | TicTacToe Element | ✅ Complete | - |
| 4 | InkText Creation | ✅ Complete | 2026-01-18 |
| 5 | Advanced Features | ⏳ Pending | - |

---

## Overview

Build a React/Vite app for rapid prototyping of interactive ink-based elements, maintaining data compatibility with the Kotlin NoteContent structure.

**Key Design Decisions:**
- JSON format mirroring protobuf schema (1:1 mapping for easy conversion)
- Minimal abstractions - TypeScript interfaces matching Kotlin sealed classes
- HTML Canvas for stroke rendering, React for element UI
- Start simple (useState), add complexity only when needed
- **Data import:** JSON files only (no protobuf parsing needed initially)
- **Recognition backend:** Use existing `/recognize_google` endpoint (production URL to be configured)
- **Base URL:** Will be configured via environment variable (`VITE_RECOGNITION_API_URL`)

---

## Phase 1: View-Only Interactive Canvas

**Goal:** Render existing NoteContent from JSON, no editing

### Tasks:
1. **Project Setup**
   - `npm create vite@latest . -- --template react-ts`
   - Add dependencies: none initially (just React + TypeScript)

2. **Define TypeScript Types** (`src/types/`)
   - `primitives.ts`: Offset, Quad, Matrix, BoundingBox
   - `brush.ts`: StockBrush, InkToolType, Brush, StrokeInput, Stroke
   - `elements.ts`: Element union type (StrokeElement, ShapeElement, GlyphElement, InkTextElement, TicTacToeElement)
   - `noteContent.ts`: NoteElements container

3. **Canvas Infrastructure** (`src/canvas/`)
   - `InkCanvas.tsx`: Main canvas component with viewport
   - `ViewportManager.ts`: Pan/zoom with mouse wheel + drag
   - `StrokeRenderer.ts`: Draw strokes to Canvas 2D context

4. **Element Rendering** (`src/elements/rendering/`)
   - `ElementRenderer.tsx`: Dispatch by element type
   - `TicTacToeRenderer.tsx`: Grid + pieces + game state
   - `InkTextRenderer.tsx`: Tokens with stroke preservation
   - `ShapeRenderer.tsx`: Path-based shapes
   - `GlyphRenderer.tsx`: Text glyphs

5. **Sample Data** (`src/data/sampleNotes/`)
   - Create test JSON files (tictactoe, handwriting, mixed)

### Deliverables:
- Load and render any NoteElements JSON
- Pan/zoom canvas navigation
- Debug overlay showing element bounds

---

## Phase 2: Live Inking

**Goal:** Capture and render new strokes in real-time

### Tasks:
1. **Input Handling** (`src/input/`)
   - `InkInputHandler.ts`: Pointer event processing (stylus, touch, mouse)
   - `StrokeBuilder.ts`: Accumulate points, handle pressure

2. **Real-Time Rendering**
   - `InProgressStroke.tsx`: Overlay canvas for current stroke
   - Double buffering: in-progress vs finished strokes

3. **Eraser Tool**
   - Point-based erasing (intersect with stroke paths)
   - Stroke splitting on partial erase

4. **Tool UI** (`src/components/`)
   - `Toolbar.tsx`: Tool selection, brush settings
   - `BrushPicker.tsx`: Size, color, brush type

5. **Undo/Redo** (`src/state/`)
   - `undoStack.ts`: Command pattern for reversible operations

### Deliverables:
- Draw strokes with pen/touch/mouse
- Erase strokes
- Undo/redo (Cmd+Z / Cmd+Shift+Z)
- Export NoteElements JSON

---

## Phase 3: TicTacToe Element (Major Milestone)

**Goal:** Recognize "#" pattern, create playable TicTacToe

### Tasks:
1. **Recognition Service** (`src/recognition/`)
   - `RecognitionService.ts`: REST client for existing backend
     - Endpoint: `${VITE_RECOGNITION_API_URL}/recognize_google`
     - Request format matches `StrokesGroupingRequest` from Kotlin app
   - `StrokeClustering.ts`: Group strokes spatially (120dp) + temporally (5000ms)

2. **Element Creation Pipeline** (`src/elements/creation/`)
   - `ElementCreation.ts`: Creator registry, confidence-based selection
   - Interface: `createFromInk(strokes, context) => {elements, confidence}`

3. **TicTacToe Creator**
   - Validate: exactly 4 strokes, size 100-400dp, aspect ratio 0.7-1.43
   - Call recognition API, verify single "#" token
   - Find 4 grid intersections (line intersection algorithm)
   - Create 9 quad cells, initialize empty game state

4. **TicTacToe Interactions** (`src/elements/interactions/`)
   - `isInterestedIn(strokes)`: bounds check
   - `acceptInk(strokes)`: recognize "X", determine cell, update game state
   - Computer AI: block wins > take corners > take center > take sides

5. **Geometry Utilities** (`src/geometry/`)
   - `lineIntersection.ts`: Find intersection points
   - `polygon.ts`: Point-in-polygon, rect-in-polygon

### Deliverables:
- Draw "#" symbol creates TicTacToe board
- Draw "X" in cells to play
- Computer responds with "O"
- Game detects win/loss/tie

---

## Phase 4: InkText Creation

**Goal:** Full handwriting recognition and text element creation

### Tasks:
1. **InkText Creator**
   - Minimum 2 strokes required
   - Estimate writing angle, rotate to horizontal
   - Extract lines from recognition result
   - Create tokens with stroke associations

2. **Token Layout Engine**
   - Baseline alignment
   - Word wrapping at layoutWidth
   - List indentation support

3. **Ink Assignment to Text**
   - Append new strokes to existing InkText
   - Re-recognize affected tokens
   - Handle word boundaries

4. **Alternative Recognition Backends** (future)
   - Abstract `HandwritingApiClient` interface
   - Google Handwriting API implementation
   - Gemini 3 Flash implementation (for AI-assisted recognition)

### Deliverables:
- Write text that gets recognized into InkText elements
- Text flows and wraps correctly
- Can add text to existing elements

---

## Phase 5: Advanced Features (Future)

- Ink text editing (cursor, selection, insertion, deletion)
- Shape recognition and beautification
- Copy/paste with ink preservation
- Export to PDF/image
- Real-time collaborative editing
- Additional interactive elements (checkbox lists, charts, etc.)

---

## File Structure

```
ink-playground/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/           # JSON schema TypeScript interfaces
│   │   ├── primitives.ts
│   │   ├── brush.ts
│   │   ├── elements.ts
│   │   └── noteContent.ts
│   ├── state/           # State management
│   │   ├── canvasState.ts
│   │   └── undoStack.ts
│   ├── canvas/          # Core canvas rendering
│   │   ├── InkCanvas.tsx
│   │   ├── ViewportManager.ts
│   │   └── StrokeRenderer.ts
│   ├── elements/        # Element-specific code
│   │   ├── creation/
│   │   ├── interactions/
│   │   ├── rendering/
│   │   └── viewInfo/
│   ├── input/           # Input handling
│   ├── recognition/     # Handwriting recognition
│   ├── geometry/        # Math utilities
│   ├── components/      # UI components
│   └── data/            # Sample JSON files
```

---

## Key TypeScript Types

### Element Union
```typescript
type Element =
  | StrokeElement      // Raw ink strokes (no transform)
  | ShapeElement       // Vector shapes with transform
  | GlyphElement       // Text glyphs with transform
  | InkTextElement     // Recognized handwriting with transform
  | TicTacToeElement;  // Interactive game with transform
```

### Stroke Structure
```typescript
interface StrokeInput {
  x: number;
  y: number;
  timeMillis: number;
  pressure?: number;
}

interface Stroke {
  inputs: { tool: InkToolType; inputs: StrokeInput[] };
  brush: { stockBrush: StockBrush; color: number; size: number };
}
```

### Element Creator Interface
```typescript
interface ElementCreator {
  name: string;
  createFromInk(
    strokes: StrokeElement[],
    noteContext: NoteContext,
    recognitionResult?: HandwritingRecognitionResult
  ): Promise<{ elements: ElementViewInfo[]; confidence: number }>;
}
```

---

## Critical Reference Files (Kotlin App)

| Purpose | File Path |
|---------|-----------|
| Protobuf schema | `shared/src/main/proto/common/note/content.proto` |
| Element hierarchy | `androidApp/src/main/java/ai/ink/app/ui/ink/model/InkModels.kt` |
| TicTacToe creator | `androidApp/src/main/java/ai/ink/app/ui/ink/model/tictactoe/Creation.kt` |
| TicTacToe game logic | `androidApp/src/main/java/ai/ink/app/ui/ink/model/tictactoe/Model.kt` |
| Architecture doc | `docs/context/Inkteractive component architecture.md` |
| Recognition API | `shared/src/commonMain/kotlin/ai/ink/common/data/api/StrokesGroupingApiService.kt` |

---

## Verification Plan

### Phase 1 Verification:
- Load sample JSON with all element types
- Verify strokes render with correct colors/sizes
- Verify element transforms position correctly
- Test pan/zoom at various scales

### Phase 2 Verification:
- Draw strokes with stylus (if available), mouse, touch
- Verify pressure affects stroke width (when available)
- Verify eraser removes strokes correctly
- Test undo/redo stack integrity

### Phase 3 Verification:
- Draw "#" symbol → TicTacToe board appears
- Draw "X" in center cell → game state updates
- Computer responds → "O" appears
- Play to win/loss/tie → game ends correctly
- Export JSON → valid NoteContent format

### Phase 4 Verification:
- Write "hello world" → recognized as InkText
- Text wraps at layout boundary
- Add text to existing element → tokens merge correctly
