/**
 * Canvas export — produces a ZIP bundle containing:
 *   - canvas.png       (all elements on a white background, cropped to content)
 *   - elements/NNN-type.png  (each element rendered individually)
 *   - data.json        (raw NoteElements JSON)
 */

import JSZip from 'jszip';
import type { NoteElements, Element, BoundingBox } from '../types';
import { renderElement, getElementBounds } from '../elements/rendering/ElementRenderer';

const PADDING = 40; // px around content in the full-canvas render
const ELEMENT_PADDING = 20; // px around individual element renders

/**
 * Pre-load every data-URL image referenced by elements so that
 * the synchronous `renderElement` calls find warm caches.
 */
function collectDataUrls(elements: Element[]): string[] {
  const urls: string[] = [];
  for (const el of elements) {
    if (el.type === 'image' && 'imageDataUrl' in el) {
      urls.push((el as { imageDataUrl: string }).imageDataUrl);
    }
    if (el.type === 'sketchableImage' && 'bitmapDataUrl' in el) {
      const url = (el as { bitmapDataUrl: string }).bitmapDataUrl;
      if (url) urls.push(url);
    }
    if (el.type === 'jigsaw' && 'imageDataUrl' in el) {
      urls.push((el as { imageDataUrl: string }).imageDataUrl);
    }
    if (el.type === 'nonogram' && 'imageDataUrl' in el) {
      const url = (el as { imageDataUrl?: string }).imageDataUrl;
      if (url) urls.push(url);
    }
  }
  return urls;
}

function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // don't block export on broken images
          img.src = url;
        }),
    ),
  ).then(() => {});
}

function getAllContentBounds(elements: Element[]): BoundingBox | null {
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;

  for (const element of elements) {
    const bounds = getElementBounds(element);
    if (bounds) {
      left = Math.min(left, bounds.left);
      top = Math.min(top, bounds.top);
      right = Math.max(right, bounds.right);
      bottom = Math.max(bottom, bounds.bottom);
    }
  }

  if (!isFinite(left)) return null;
  return { left, top, right, bottom };
}

/** Render elements to an off-screen canvas and return PNG blob. */
function renderToBlob(
  elements: Element[],
  bounds: BoundingBox,
  padding: number,
): Promise<Blob> {
  const width = Math.ceil(bounds.right - bounds.left + padding * 2);
  const height = Math.ceil(bounds.bottom - bounds.top + padding * 2);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Translate so bounds.left/bounds.top maps to (padding, padding)
  ctx.translate(padding - bounds.left, padding - bounds.top);

  for (const element of elements) {
    renderElement(ctx, element);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function generateCanvasZip(noteElements: NoteElements): Promise<Blob> {
  const { elements } = noteElements;
  if (elements.length === 0) throw new Error('No elements to export');

  // Ensure images are decoded before we start rendering
  await preloadImages(collectDataUrls(elements));

  // Wait a frame so image caches in renderers are populated
  await new Promise((r) => requestAnimationFrame(r));

  const zip = new JSZip();

  // 1. Full canvas PNG
  const fullBounds = getAllContentBounds(elements);
  if (fullBounds) {
    const fullBlob = await renderToBlob(elements, fullBounds, PADDING);
    zip.file('canvas.png', fullBlob);
  }

  // 2. Individual element PNGs
  const elementsFolder = zip.folder('elements')!;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const bounds = getElementBounds(el);
    if (!bounds) continue;

    const blob = await renderToBlob([el], bounds, ELEMENT_PADDING);
    const idx = String(i).padStart(3, '0');
    elementsFolder.file(`${idx}-${el.type}.png`, blob);
  }

  // 3. JSON data
  zip.file('data.json', JSON.stringify(noteElements, null, 2));

  return zip.generateAsync({ type: 'blob' });
}

export async function exportCanvasAsZip(noteElements: NoteElements): Promise<void> {
  const zipBlob = await generateCanvasZip(noteElements);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  triggerDownload(zipBlob, `ink-playground-${timestamp}.zip`);
}

const UPLOAD_API_URL = import.meta.env.INK_UPLOAD_API_URL as string | undefined;

export async function shareCanvasToTelegram(noteElements: NoteElements): Promise<void> {
  if (!UPLOAD_API_URL) {
    throw new Error('INK_UPLOAD_API_URL is not configured');
  }

  const zipBlob = await generateCanvasZip(noteElements);

  // Upload ZIP to backend
  const formData = new FormData();
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  formData.append('file', zipBlob, `ink-playground-${timestamp}.zip`);

  const response = await fetch(`${UPLOAD_API_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const { url } = await response.json();

  // Open @sundaiclaw_bot chat in Telegram with pre-filled message
  // tg://resolve pre-fills the input field on native Telegram apps (iOS/Android/Desktop)
  const text = `Build a new Sundai project from these designs. The attached ZIP contains sketches, specs, and descriptions — use them to scaffold and implement the project.\n\n${url}`;
  const telegramUrl = `tg://resolve?domain=sundaiclaw_bot&text=${encodeURIComponent(text)}`;
  window.open(telegramUrl, '_self');
}
