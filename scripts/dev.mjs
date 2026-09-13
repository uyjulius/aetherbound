import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
await import(`./build.mjs?at=${Date.now()}`);
const server = spawn(process.execPath, [path.join(root, 'scripts/serve.mjs')], { stdio: 'inherit' });
let queued = false;
const rebuild = () => {
  if (queued) return;
  queued = true;
  setTimeout(async () => {
    queued = false;
    try { await import(`./build.mjs?at=${Date.now()}`); } catch (error) { console.error(error); }
  }, 100);
};
for (const directory of ['src', 'site']) watch(path.join(root, directory), { recursive: true }, rebuild);
process.on('SIGINT', () => { server.kill('SIGINT'); process.exit(0); });
