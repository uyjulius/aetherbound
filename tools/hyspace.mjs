/**
 * A client for the Hunyuan3D-2.1 Space on Hugging Face, over plain HTTP.
 *
 * Everything else in this toolchain is Node. The only reason mesh generation
 * ever reached into a Python venv in a sibling repo was that `gradio_client`
 * lived there, and that dependency broke the moment a sandbox stopped allowing
 * venv interpreters. It was always the wrong shape: a pipeline that only runs
 * if another project's virtualenv is intact is not a pipeline. There is no
 * Python here.
 *
 * The Space runs Gradio 4.44 with routes at the **root** — `/info`, `/config`,
 * `/upload`, `/call/<api_name>` — not under `/gradio_api`. Current Gradio docs
 * describe the other arrangement, and following them produces a 404 that reads
 * like the Space being down.
 */

import fs from 'node:fs';
import path from 'node:path';

export const SPACE = 'tencent-hunyuan3d-2-1.hf.space';
const BASE = `https://${SPACE}`;

export class QuotaError extends Error {}
export class SpaceError extends Error {}

const authHeaders = () => (process.env.HF_TOKEN
  ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {});

async function upload(file) {
  const body = new FormData();
  body.append('files', new Blob([fs.readFileSync(file)]), path.basename(file));
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body, headers: authHeaders() });
  if (!res.ok) throw new SpaceError(`upload failed: HTTP ${res.status}`);
  const paths = await res.json();
  if (!Array.isArray(paths) || !paths.length) throw new SpaceError('upload returned nothing');
  return { path: paths[0], meta: { _type: 'gradio.FileData' } };
}

/**
 * Read the SSE stream to completion.
 *
 * Quota refusals arrive as a normal `error` event inside the stream rather than
 * as an HTTP status, so they have to be parsed out or a run treats "no GPU
 * left" as "no result".
 */
const NO_DETAIL = 'the Space reported an error with no detail';

async function readStream(res) {
  if (!res.ok || !res.body) throw new SpaceError(`stream failed: HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, cut).trimEnd();
      buffer = buffer.slice(cut + 1);
      if (line.startsWith('event:')) { event = line.slice(6).trim(); continue; }
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (event === 'complete') {
        try { return JSON.parse(payload); } catch { return payload; }
      }
      if (event === 'error') {
        // `data: null` means one of two things, and the two are told apart by the
        // clock rather than by the payload — see `generateMesh`, which times the
        // call and rewrites this message when the refusal was instant.
        const text = payload && payload !== 'null' ? payload : NO_DETAIL;
        if (/quota/i.test(text)) throw new QuotaError(text);
        throw new SpaceError(text);
      }
    }
  }
  throw new SpaceError('the stream ended without completing');
}

/**
 * Build the positional argument array.
 *
 * **Thirteen entries, not the twelve `/info` documents.** The real dependency
 * in `/config` carries a hidden `state` component at index 0. Sending twelve
 * shifts every argument by one — the image arrives as state, the steps as an
 * image — and the Space answers `event: error / data: null` with no further
 * explanation. That is indistinguishable from a quota refusal, an expired
 * token or a cold container, and it cost a long chain of wrong diagnoses.
 *
 * The general lesson: `/info` describes the *documented* API and `/config`
 * describes the *actual* wiring. When a Gradio call fails inexplicably, read
 * `/config` and count the inputs.
 */
function buildArguments({ front, back, left, right, steps, guidanceScale, seed,
  octree, removeBackground, numChunks }) {
  return [
    null,                       // hidden state component
    front,                      // Image
    front, back, left, right,   // Front / Back / Left / Right multiview
    steps, guidanceScale, seed, octree,
    removeBackground, numChunks,
    false,                      // randomize seed — off, so runs are repeatable
  ];
}

/**
 * Generate a mesh.
 *
 * `textured` picks `/generation_all`, which returns real PBR maps and reserves
 * 270s of GPU; the default `/shape_generation` returns geometry only for 90s.
 * The reservation is flat per call whatever the settings, so a coarser octree
 * buys nothing and the finest grid is always the right request.
 */
export async function generateMesh({
  front, back = null, left = null, right = null,
  steps = 30, guidanceScale = 5, seed = 1234, octree = 256,
  removeBackground = true, numChunks = 8000, textured = false,
}) {
  const refs = {};
  for (const [key, file] of [['front', front], ['back', back], ['left', left], ['right', right]]) {
    refs[key] = file && fs.existsSync(file) ? await upload(file) : null;
  }
  if (!refs.front) throw new SpaceError('a front view is required');

  const data = buildArguments({
    ...refs, steps, guidanceScale, seed, octree, removeBackground, numChunks,
  });

  const endpoint = textured ? '/generation_all' : '/shape_generation';
  const post = await fetch(`${BASE}/call${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ data }),
  });
  if (!post.ok) throw new SpaceError(`call failed: HTTP ${post.status} ${await post.text()}`);
  const { event_id: eventId } = await post.json();
  if (!eventId) throw new SpaceError('no event id returned');

  const started = Date.now();
  try {
    return await readStream(
      await fetch(`${BASE}/call${endpoint}/${eventId}`, { headers: authHeaders() }));
  } catch (err) {
    // A detail-free refusal has two causes and they need different answers, so it is
    // worth saying which one this was. Both were diagnosed the hard way.
    //
    // A wrong-length argument array (see `buildArguments`) fails instantly, and so does
    // ZeroGPU declining to reserve GPU time. What separates them is that the second is
    // specific to the size of the reservation: with the same arguments and the same
    // token, `/shape_generation` asks for 90 seconds and is served while
    // `/generation_all` asks for 270 and is refused in four. So the endpoint that was
    // refused is part of the message, and the cheaper one is named as the next thing to
    // try — the alternative is a run that reports "malformed arguments" for a wall the
    // caller only has to wait out.
    if (err instanceof SpaceError && err.message === NO_DETAIL) {
      const seconds = (Date.now() - started) / 1000;
      throw seconds < 30 && textured
        ? new QuotaError(`${endpoint} was refused in ${seconds.toFixed(0)}s without a reason. `
          + 'An instant refusal of the 270-second endpoint is ZeroGPU declining the '
          + 'reservation, not a bad argument array: the same call to /shape_generation '
          + '(90s) is still served. Wait for the allowance to refill, or generate '
          + 'geometry now and texture later.')
        : new SpaceError(`${err.message} (after ${seconds.toFixed(0)}s on ${endpoint}) — `
          + 'if this was instant, count the arguments in /config; see buildArguments.');
    }
    throw err;
  }
}

/**
 * Every plausible URL for a produced file, best first.
 *
 * Only `https://<space>/file=<path>` actually serves them; the others 404 or
 * 403. They are tried in turn because the result shape varies between the two
 * endpoints, and a GPU call costs 90 seconds of a daily allowance — losing one
 * to a guessed URL means spending another.
 */
export function fileCandidates(result) {
  const out = [];
  const walk = (value) => {
    if (!value) return;
    if (typeof value === 'string' && /\.(glb|obj|ply)$/i.test(value)) {
      out.push(value.startsWith('http') ? value : `${BASE}/file=${value}`);
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (typeof value === 'object') {
      for (const key of ['url', 'path']) {
        const v = value[key];
        if (typeof v === 'string' && /\.(glb|obj|ply)$/i.test(v)) {
          if (v.startsWith('http')) out.push(v);
          else out.push(`${BASE}/file=${v}`);
        }
      }
      Object.values(value).forEach(walk);
    }
  };
  walk(result);
  return [...new Set(out)];
}

/**
 * Download the first candidate that is really a GLB.
 *
 * glTF binary starts with the magic "glTF". Checking it matters: a 404 page
 * saved under a .glb name is 22 bytes of JSON that every later step accepts
 * and no step can use, and it gets reported as a successful download.
 */
export async function downloadMesh(result, out) {
  const urls = fileCandidates(result);
  if (!urls.length) throw new SpaceError(`no file in result: ${JSON.stringify(result).slice(0, 300)}`);
  for (const url of urls) {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) continue;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.slice(0, 4).toString() !== 'glTF') continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, bytes);
    return { out, bytes: bytes.length, url };
  }
  throw new SpaceError(`none of ${urls.length} candidate URLs returned a GLB`);
}
