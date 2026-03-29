import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, 'uploads');
const MAX_FILE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Clean up files older than 24h
function cleanupOldFiles() {
  try {
    const now = Date.now();
    for (const file of readdirSync(UPLOADS_DIR)) {
      const filePath = join(UPLOADS_DIR, file);
      const stat = statSync(filePath);
      if (now - stat.mtimeMs > MAX_FILE_AGE_MS) {
        unlinkSync(filePath);
      }
    }
  } catch {
    // ignore cleanup errors
  }
}

const app = express();
app.set('trust proxy', true);
app.use(cors());

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const id = uuidv4();
  const filename = `${id}.zip`;
  const destPath = join(UPLOADS_DIR, filename);

  // multer saves to a temp name in the same dir, rename it
  renameSync(req.file.path, destPath);

  // Build public download URL
  const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/api/files/${filename}`;

  // Cleanup old files in background
  cleanupOldFiles();

  res.json({ url });
});

app.get('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  // Sanitize: only allow uuid-style .zip filenames
  if (!/^[a-f0-9-]+\.zip$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = join(UPLOADS_DIR, filename);
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.download(filePath);
});

app.listen(PORT, () => {
  console.log(`Upload server running on port ${PORT}`);
});
