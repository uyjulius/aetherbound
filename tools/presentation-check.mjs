/** Ensure automatic battle turns wait for the view instead of applying invisible damage. */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const godot = process.env.GODOT ?? 'godot';

let report;
try {
  const raw = execFileSync(godot, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/presentation_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const line = raw.split('\n').reverse()
    .find((value) => value.trim().startsWith('{') && value.trim().endsWith('}'));
  if (!line) throw new Error(`no report in probe output:\n${raw.slice(-800)}`);
  report = JSON.parse(line);
} catch (error) {
  console.error('\x1b[31mFAIL\x1b[0m — battle presentation probe did not run.');
  console.error(String(error.stdout ?? error.message));
  process.exit(1);
}

if (report.trouble?.length) {
  console.error(`\x1b[31mFAIL\x1b[0m — ${report.trouble.join('; ')}`);
  process.exit(1);
}
console.log(`\x1b[32mOK\x1b[0m — ${report.presented} automatic actions paused for presentation before resolving.`);
