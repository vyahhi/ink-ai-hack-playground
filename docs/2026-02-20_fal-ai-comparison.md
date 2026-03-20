# Sketch-to-Image Approach Comparison

## Three-Way Comparison Table

| Aspect | **draw-together** ([dabit3/draw-together](https://github.com/dabit3/draw-together)) | **realtime-canvas** ([amrrs/realtime-canvas](https://github.com/amrrs/realtime-canvas)) | **Ink Playground** (our approach) |
|---|---|---|---|
| **Model** | `110602490-sdxl-turbo-realtime` (SDXL Turbo) | `fal-ai/flux-2/klein` (FLUX.2 Klein, realtime endpoint) | `fal-ai/flux-2/klein/9b/edit` (FLUX.2 Klein 9B, edit endpoint) |
| **API style** | `fal.realtime.connect()` -- persistent WebSocket | `fal.realtime.connect()` -- persistent WebSocket with server-side token proxy | `fetch()` POST to REST endpoint -- one-shot request per generation cycle |
| **Drawing surface** | Excalidraw (vector shapes/freehand, exported as raster) | Vanilla HTML Canvas (mouse/touch, no pressure, fixed line width 3px) | Custom HTML Canvas with ink strokes (pressure-aware, stylus-native) |
| **Image capture** | Exports Excalidraw scene to **450x450** blob at quality 0.5 via `exportToBlob()` | Scales canvas content to center-fit a **704x704** offscreen canvas at JPEG quality 0.5 | Composites the current bitmap + visible overlay strokes onto a **512x512** offscreen canvas via `compositeBitmapWithStrokes()` |
| **Images sent** | **1 image** -- `image_url` | **1 image** -- `image_url` | **2 images** -- `image_urls[0]` = reference (clean bitmap), `image_urls[1]` = guidance (bitmap + ink strokes composited) |
| **Prompt** | User-editable scene description: `"A cinematic, realistic shot of a baby panda..."` | Style preset + canvas instructions: `"<style>. Keep a pure black background unchanged. Transform only the sketched object in the center. No extra scene or environment. Preserve overall silhouette from the sketch."` | Relational edit instruction: `"Image 1 is the reference. Image 2 shows the same scene with hand-drawn ink strokes as guides..."` |
| **Style control** | User types a free-form text prompt | 11 hardcoded style presets (Studio, Toy, Ceramic, Plush, Wood, Metal, Stone, Anime, Glass, Ink, Neon) | None (static prompt, style inherited from reference image) |
| **Conditioning approach** | **img2img** with `strength: 0.99` -- sketch is a spatial hint, model regenerates freely | **img2img realtime** with `num_inference_steps: 3`, `seed: 35`, `output_feedback_strength: 1` -- sketch is stylized as an object render | **Multi-reference in-context** -- model sees clean reference and annotated version, produces a targeted edit preserving the reference |
| **Iteration model** | Every canvas change triggers a new generation; previous AI output is discarded | Every canvas change triggers a new generation; AI output displayed side-by-side or merged, but never fed back as input | Iterative refinement loop -- each generation's output becomes the next reference image, ink strokes accumulate (hidden after consumption) |
| **Debounce** | None (real-time streaming) | 128ms `setTimeout` + fal client `throttleInterval: 64ms` | 3000ms after last stroke |
| **Latency target** | Real-time (~200-500ms) via SDXL Turbo WebSocket | Real-time via FLUX.2 Klein WebSocket (3 inference steps) | ~1-2s generation time per request |
| **Fidelity to strokes** | Low -- sketch is a compositional suggestion; model reinterprets freely | Medium -- prompt says "preserve overall silhouette from the sketch" but model applies heavy style transformation | High (intended) -- prompt explicitly asks model to render strokes as natural parts of the existing scene |
| **Auth model** | API key directly in client via `fal.config()` | Server-side token proxy (`/api/fal/realtime-token`) -- short-lived tokens (120s), `FAL_KEY` never exposed to browser | API key in client (with TODO to move server-side) |
| **Tech stack** | Next.js + React + Excalidraw + `@fal-ai/client` | Node.js + Express + vanilla HTML/CSS/JS + `@fal-ai/client` (ESM CDN import) | React + TypeScript + Vite + custom canvas engine |

## Key Architectural Differences

**draw-together** treats the canvas as a continuously-regenerated prompt visualization -- the text prompt defines *what* appears, and the sketch merely suggests *where*. It is essentially "guided text-to-image" where the drawing is a layout hint.

**realtime-canvas** takes a similar one-shot approach but adds style presets and explicit canvas instructions. Each generation is independent -- the AI output is displayed next to (or merged over) the sketch but is never fed back as input for the next generation. The prompt constrains the model to transform "only the sketched object" while preserving the background and silhouette, giving the user somewhat more control over the output shape than draw-together.

**Our approach** treats the canvas as a persistent, evolving document. The clean bitmap is the ground truth, and each round of ink strokes is a surgical edit instruction. By sending two images (before/after strokes) with an explicit relational prompt, we ask the model to diff them and integrate only the changes. The `hiddenStrokeCount` mechanism preserves stroke history across iterations.

## Prompt Strategy Contrast

- **draw-together**: The prompt is a *scene description* (`"A cinematic shot of a baby panda..."`). The model generates from scratch every time. The sketch constrains spatial layout via img2img strength but does not describe the edit.
- **realtime-canvas**: The prompt is a *style preset + canvas instruction*. Each preset is a material/aesthetic description (e.g., `"handcrafted ceramic object, matte glaze, subtle imperfections, gallery product shot"`), appended with instructions to keep the background unchanged, transform only the central object, and preserve the silhouette. The model is told what the sketch *should look like*, not what to change.
- **Ours**: The prompt is an *edit instruction* referencing indexed images (`"Image 1 is the reference. Image 2 shows..."`). This leverages FLUX.2's [multi-reference in-context conditioning](https://docs.bfl.ml/flux_2/flux2_image_editing) where each `image_urls` entry can be addressed by index. The model is told to produce a result that matches image 1 but incorporates the drawn strokes from image 2.

## realtime-canvas: Notable Implementation Details

- **Token proxy**: The Express server fetches short-lived tokens (120s TTL) from `rest.alpha.fal.ai/tokens/` using the server-side `FAL_KEY`. The client refreshes tokens transparently via `tokenProvider` callback with a 110s expiration buffer.
- **Fixed seed**: `seed: 35` is hardcoded, which produces deterministic output for the same sketch + prompt. This means changing the style preset re-renders the same composition in a different material/aesthetic without randomness.
- **Output feedback**: `output_feedback_strength: 1` enables the model's own output feedback loop, which may help temporal coherence between successive frames.
- **Split/Merge view modes**: Users can view the sketch and AI output side-by-side (Split) or overlaid (Merge, with the sketch fading in during drawing and fading out when the result arrives).
- **15s stuck-state guardrail**: A `setTimeout` clears the generating indicator if no result arrives within 15 seconds.
- **Theme-aware prompting**: The background color instruction changes based on the active theme (`"Keep a pure white background unchanged."` for light, `"Keep a pure black background unchanged."` for dark).

## Potential Improvements to Our Prompt (from BFL docs)

Based on the [FLUX.2 Klein prompting guide](https://docs.bfl.ml/guides/prompting_guide_flux2_klein):

- Front-load the most important element (what should change)
- Add lighting/style context so the model knows the target aesthetic
- Consider making the prompt dynamic -- e.g., incorporating a user-provided scene description alongside the edit instruction
- The model does not auto-enhance prompts (no upsampling), so being more descriptive could improve results
- Consider adding style presets (like realtime-canvas) to give users control over the output aesthetic while keeping our relational edit architecture

## Sources

- [dabit3/draw-together](https://github.com/dabit3/draw-together)
- [amrrs/realtime-canvas](https://github.com/amrrs/realtime-canvas)
- [fal-ai-community/infinite-kanvas](https://github.com/fal-ai-community/infinite-kanvas)
- [FLUX.2 Image Editing docs](https://docs.bfl.ml/flux_2/flux2_image_editing)
- [FLUX.2 Klein Prompting Guide](https://docs.bfl.ml/guides/prompting_guide_flux2_klein)
- [fal.ai FLUX.2 edit model](https://fal.ai/models/fal-ai/flux-2/edit)
- [fal.ai Klein user guide](https://fal.ai/learn/devs/flux-2-klein-user-guide)
