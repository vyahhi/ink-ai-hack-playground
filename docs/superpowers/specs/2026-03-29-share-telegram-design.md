# Share on Telegram — Design Spec

## Overview

Add a "Share on Telegram" button to the toolbar that uploads the canvas ZIP export to a backend file server, then opens Telegram's share URL with the download link and message "Build this sundai project".

## Frontend

### `src/services/canvasExport.ts`
- Extract ZIP generation into `generateCanvasZip(noteElements): Promise<Blob>` (returns blob, no download)
- Existing `exportCanvasAsZip()` calls `generateCanvasZip()` + `triggerDownload()`
- New `shareCanvasToTelegram(noteElements): Promise<void>`:
  1. Calls `generateCanvasZip()` to get ZIP blob
  2. POSTs blob to `${INK_UPLOAD_API_URL}/api/upload` as multipart/form-data
  3. Gets back `{ url: string }` (public download URL)
  4. Opens `https://t.me/share/url?url=<download_url>&text=Build this sundai project` in new tab

### `src/App.tsx`
- New `isSharing` state + `handleShareTelegram` handler (same pattern as export)
- New button next to export button with rocket SVG icon (Lucide `rocket`)
- Disabled when `isSharing || currentNote.elements.length === 0`
- Title: "Share on Telegram"

### `.env.example`
- Add `INK_UPLOAD_API_URL=` variable

## Backend (`server/`)

### `server/index.js` — Express server
- `POST /api/upload` — multer multipart, saves ZIP to `server/uploads/<uuid>.zip`, returns `{ url }`
- `GET /api/files/:filename` — serves stored files
- Cleanup: on each upload, delete files older than 24h from uploads dir
- CORS enabled, 50MB file size limit
- Port from `PORT` env var (default 3000)

### `server/package.json`
- Dependencies: express, multer, cors, uuid

### `server/Dockerfile`
- Node 20 alpine, runs the Express server on port 8080 (Cloud Run default)

## Deployment
- Backend deploys to GCP Cloud Run via `gcloud run deploy`
- `INK_UPLOAD_API_URL` set to the Cloud Run service URL

## Telegram Share Flow
```
Click button → generateCanvasZip() → POST /api/upload → { url } → window.open(t.me/share/url?...)
```
