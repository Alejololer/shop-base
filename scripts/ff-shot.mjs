// Firefox visual check over WebDriver BiDi (Firefox dropped CDP).
// node scripts/ff-shot.mjs <url> <out.png> [w] [h]   env FF_EVAL = async expression run before the shot; its JSON result is printed.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const [url, out = 'ff.png', w = '1366', h = '768'] = process.argv.slice(2);
const port = 9400 + Math.floor(Math.random() * 400);
const prof = `${process.env.TEMP}/ff-bidi-${port}`;
mkdirSync(prof, { recursive: true });
const ff = spawn('C:/Program Files/Mozilla Firefox/firefox.exe', ['--headless', '--no-remote', '--profile', prof, `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await sleep(250);
  try { const s = new WebSocket(`ws://127.0.0.1:${port}/session`); await new Promise((ok, ko) => { s.onopen = ok; s.onerror = ko; }); ws = s; } catch {}
}
if (!ws) { ff.kill(); throw new Error('no BiDi socket'); }
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); }).then((m) => { if (m.type === 'error') throw new Error(`${method}: ${m.error} ${m.message}`); return m.result; });

try {
  await send('session.new', { capabilities: {} });
  const { contexts } = await send('browsingContext.getTree', {});
  const context = contexts[0].context;
  await send('browsingContext.setViewport', { context, viewport: { width: +w, height: +h } });
  await send('browsingContext.navigate', { context, url, wait: 'complete' });
  await sleep(1200);
  if (process.env.FF_EVAL) {
    const r = await send('script.evaluate', { expression: `(async () => JSON.stringify(await (${process.env.FF_EVAL})))()`, target: { context }, awaitPromise: true });
    console.log(r.result?.value ?? JSON.stringify(r));
  }
  const { data } = await send('browsingContext.captureScreenshot', { context });
  writeFileSync(out, Buffer.from(data, 'base64'));
  console.log(`${out} ${w}x${h}`);
} finally { ws.close(); ff.kill(); }
