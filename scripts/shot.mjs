// Visual review helper: node scripts/shot.mjs <url> <out.png> [width] [height] [cookie=value]
// Uses headless Edge/Chrome over CDP so admin pages can be captured with the auth cookie.
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const [url, out = 'shot.png', w = '1440', h = '900', cookie] = process.argv.slice(2);
const bins = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const bin = bins.find(existsSync);
const port = 9333 + Math.floor(Math.random() * 500);
const proc = spawn(bin, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP || '/tmp'}/shot-profile-${port}`, `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = list.find((t) => t.type === 'page' && t.url.startsWith('about:blank')) ?? list.find((t) => t.type === 'page'); } catch {}
}
if (!target) { proc.kill(); throw new Error('no page target'); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });

await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 600 });
if (cookie) { const [name, ...v] = cookie.split('='); await send('Network.setCookie', { name, value: v.join('='), url }); }
await send('Page.enable');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); // show final state of scroll-driven reveals
await send('Page.navigate', { url });
await sleep(2500);
// full-page via clip (keeps the viewport, so svh/vh units stay realistic)
const { result } = await send('Runtime.evaluate', { expression: 'Math.min(document.documentElement.scrollHeight, 8000)', returnByValue: true });
await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" })' }); await sleep(1500); // trigger lazy images
await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 0, behavior: "instant" })' }); await sleep(300);
if (process.env.SHOT_EVAL) { await send('Runtime.evaluate', { expression: process.env.SHOT_EVAL }); await sleep(300); } // e.g. open a menu
await send('Runtime.evaluate', { expression: 'Promise.race([Promise.all([...document.images].map((i) => i.decode().catch(() => {}))), new Promise((r) => setTimeout(r, 3000))])', awaitPromise: true }); // paint async-decoded images
const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: +w, height: result.value, scale: 1 } });
writeFileSync(out, Buffer.from(data, 'base64'));
console.log(`${out} ${w}x${result.value}`);
ws.close(); proc.kill();
