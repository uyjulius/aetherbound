import { build } from 'esbuild';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const out = path.join(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await build({
  entryPoints: [path.join(root, 'src/main.js')],
  outfile: path.join(out, 'app.js'),
  bundle: true,
  format: 'esm',
  target: ['es2022'],
  minify: true,
  sourcemap: true,
  legalComments: 'none',
});
await Promise.all([
  cp(path.join(root, 'site/index.html'), path.join(out, 'index.html')),
  cp(path.join(root, 'site/style.css'), path.join(out, 'style.css')),
  cp(path.join(root, 'site/CNAME'), path.join(out, 'CNAME')),
  cp(path.join(root, 'content'), path.join(out, 'content'), { recursive: true }),
]);

let commit = 'development';
try { commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {}
await writeFile(path.join(out, 'build.json'), `${JSON.stringify({ commit, builtAt: new Date().toISOString() })}\n`);

console.log(`Built ${path.relative(root, out)} from ${commit}`);
