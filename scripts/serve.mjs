import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const directory = path.resolve(root, process.env.SERVE_DIR ?? 'dist');
const port = Number(process.env.PORT ?? 4173);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.glb': 'model/gltf-binary',
  '.ogg': 'audio/ogg', '.svg': 'image/svg+xml', '.map': 'application/json; charset=utf-8',
};

const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
  const relative = pathname.replace(/^\/+/, '') || 'index.html';
  let file = path.resolve(directory, relative);
  if (!file.startsWith(`${directory}${path.sep}`) && file !== directory) {
    response.writeHead(400).end('Bad path'); return;
  }
  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) { file = path.join(file, 'index.html'); info = await stat(file).catch(() => null); }
  if (!info?.isFile()) { response.writeHead(404).end('Not found'); return; }
  response.writeHead(200, {
    'Content-Type': mime[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(response);
});
server.listen(port, () => console.log(`Aetherbound at http://localhost:${port}`));
