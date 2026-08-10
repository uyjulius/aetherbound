import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const PORT = Number(process.env.PORT || 5177);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ktx2': 'image/ktx2',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

// Files live in two places: public/ (built + index) and assets/ (generated art & audio).
const MOUNTS = [
  { prefix: '/assets/', dir: path.join(root, 'assets') },
  { prefix: '/', dir: path.join(root, 'public') },
];

function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  if (clean.includes('\0')) return null;
  for (const mount of MOUNTS) {
    if (!clean.startsWith(mount.prefix)) continue;
    const rel = clean.slice(mount.prefix.length) || 'index.html';
    const full = path.join(mount.dir, rel);
    if (!full.startsWith(mount.dir)) return null; // path traversal guard
    return full;
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  let file = resolve(req.url || '/');
  if (!file) return send(res, 400, 'Bad request');
  try {
    let stat = await fsp.stat(file).catch(() => null);
    if (stat?.isDirectory()) {
      file = path.join(file, 'index.html');
      stat = await fsp.stat(file).catch(() => null);
    }
    if (!stat) return send(res, 404, 'Not found: ' + req.url);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
      // Needed if we ever move heavy generation into a worker with SharedArrayBuffer.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    send(res, 500, String(err));
  }
});

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

server.listen(PORT, () => {
  console.log(`[serve] http://localhost:${PORT}`);
});
