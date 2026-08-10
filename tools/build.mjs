import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const watch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const options = {
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'esm',
  target: ['chrome120', 'firefox121', 'safari17'],
  outfile: path.join(root, 'public/game.js'),
  sourcemap: true,
  minify: !watch,
  legalComments: 'none',
  logLevel: 'info',
  loader: { '.glsl': 'text', '.vert': 'text', '.frag': 'text' },
  define: { __DEV__: watch ? 'true' : 'false' },
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[build] watching src/ …');
} else {
  await esbuild.build(options);
  console.log('[build] done → public/game.js');
}
