// Records a scripted walkthrough of Lobby on a sandbox that populate.sh filled and that serves Lobby as `lobby`:
// headless Chrome's screencast, a drawn cursor and captions in the top layer, frames timed by their own timestamps and
// encoded by ffmpeg. Needs Google Chrome and ffmpeg. Its frames go in a `frames/` folder beside the video.
//   node record.mjs <the sandbox's url> <out.mp4>
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const [base, out] = process.argv.slice(2)
const W = 1440, H = 900, SCALE = 2
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const port = await new Promise((resolve) => { const s = createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) }) })
const profile = mkdtempSync(path.join(os.tmpdir(), 'tower-demo-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--no-first-run', '--no-default-browser-check', '--mute-audio', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })

let wsUrl
for (let i = 0; i < 300 && !wsUrl; i++) {
  const t = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json(), () => [])
  wsUrl = t.find((x) => x.type === 'page')?.webSocketDebuggerUrl
  if (!wsUrl) await sleep(100)
}
const ws = new WebSocket(wsUrl)
await new Promise((r) => ws.addEventListener('open', r))
let next = 0
const pending = new Map(), listeners = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(String(e.data))
  if (m.id === undefined) return listeners.get(m.method)?.forEach((f) => f(m.params))
  const p = pending.get(m.id); pending.delete(m.id)
  m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result)
})
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
const on = (method, f) => listeners.set(method, [...(listeners.get(method) ?? []), f])
on('Runtime.exceptionThrown', (p) => console.error('page error:', p.exceptionDetails.exception?.description ?? p.exceptionDetails.text))

await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: false })
const scheme = (value) => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] })
await scheme('light')

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(`${expression}\n  threw: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
  return r.result.value
}

// The overlay: a manual popover so it sits in the top layer, above the page's own popovers and dialogs.
const OVERLAY = String.raw`(() => {
  if (window.__demo) return
  const css = document.createElement('style')
  css.textContent = ${'`'}
  #demo-layer { position: fixed; inset: 0; width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; padding: 0;
    border: 0; background: transparent; overflow: visible; pointer-events: none; color-scheme: normal }
  #demo-layer::backdrop { display: none }
  #demo-cursor { position: absolute; left: 0; top: 0; width: 22px; height: 30px; transform: translate(-3px, -2px);
    filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / .35)); transition: scale 120ms ease-out; transform-origin: 3px 2px }
  #demo-cursor.down { scale: .86 }
  .demo-ripple { position: absolute; width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 50%;
    border: 2px solid rgb(10 132 255 / .9); background: rgb(10 132 255 / .18); animation: demo-ripple 520ms ease-out forwards }
  @keyframes demo-ripple { from { scale: .3; opacity: 1 } to { scale: 1.5; opacity: 0 } }
  #demo-caption { position: absolute; left: 50%; bottom: 64px; translate: -50% 0; max-width: 980px; padding: 13px 22px;
    border-radius: 14px; background: rgb(28 28 30 / .82); backdrop-filter: blur(18px) saturate(1.6); color: #fff;
    font: 500 19px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif; letter-spacing: -.01em;
    box-shadow: 0 10px 40px rgb(0 0 0 / .28), 0 0 0 .5px rgb(255 255 255 / .12) inset; text-align: center;
    opacity: 0; transition: opacity 260ms ease, translate 260ms ease }
  #demo-caption.show { opacity: 1 }
  #demo-caption b { font-weight: 650 }
  #demo-card { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; gap: 14px;
    background: radial-gradient(1200px 700px at 50% 40%, #2b2d42 0%, #121318 70%); color: #fff; opacity: 0;
    transition: opacity 450ms ease; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif }
  #demo-card.show { opacity: 1 }
  #demo-card h1 { margin: 0; font-size: 64px; font-weight: 700; letter-spacing: -.035em }
  #demo-card p { margin: 0; font-size: 22px; color: rgb(255 255 255 / .66); letter-spacing: -.01em }
  #demo-card .kicker { font-size: 15px; letter-spacing: .14em; text-transform: uppercase; color: rgb(255 255 255 / .5) }
  ${'`'}
  document.head.append(css)
  const layer = Object.assign(document.createElement('div'), { id: 'demo-layer', popover: 'manual' })
  layer.innerHTML = '<div id="demo-card"></div><div id="demo-caption"></div>' +
    '<svg id="demo-cursor" viewBox="0 0 22 30"><path d="M2 2v22l5.6-5.3 3.6 8.3 3.6-1.6-3.6-8.1H19z" fill="#000" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  document.body.append(layer)
  const cursor = layer.querySelector('#demo-cursor')
  const at = (e) => (cursor.style.left = e.clientX + 'px', cursor.style.top = e.clientY + 'px')
  addEventListener('pointermove', at, true)
  addEventListener('pointerdown', (e) => {
    at(e); cursor.classList.add('down')
    const r = Object.assign(document.createElement('div'), { className: 'demo-ripple' })
    r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'
    layer.append(r); setTimeout(() => r.remove(), 600)
  }, true)
  addEventListener('pointerup', () => cursor.classList.remove('down'), true)
  const raise = () => { if (layer.matches(':popover-open')) layer.hidePopover(); layer.showPopover() }
  raise()
  // Whatever enters the top layer after it covers it: raise it again.
  addEventListener('toggle', (e) => { if (e.target !== layer && e.newState === 'open') queueMicrotask(raise) }, true)
  new MutationObserver(() => { for (const d of document.querySelectorAll('dialog[open]')) if (!d.__raised) (d.__raised = true, queueMicrotask(raise)) }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] })
  window.__demo = {
    raise,
    caption(html) {
      const c = layer.querySelector('#demo-caption')
      if (!html) return c.classList.remove('show')
      c.innerHTML = html; c.classList.add('show')
    },
    card(html) {
      const c = layer.querySelector('#demo-card')
      if (!html) return c.classList.remove('show')
      c.innerHTML = html; c.classList.add('show')
    },
  }
})()`

// Frames, kept as they arrive with their own timestamps.
const frames = path.join(path.dirname(out), 'frames')
rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true })
const shots = []
let recording = false
on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  send('Page.screencastFrameAck', { sessionId })
  if (!recording) return
  const file = path.join(frames, `${String(shots.length).padStart(5, '0')}.jpg`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  shots.push({ file, t: metadata.timestamp })
})

const loaded = new Promise((r) => on('Page.loadEventFired', r))
await send('Page.navigate', { url: `${base}/r/lobby/` })
await loaded
await sleep(2000)
await evaluate(OVERLAY)

// Input: the pointer glides to a point, as a hand would, and every step is a real mouse event.
let pointer = { x: W * 0.62, y: H * 0.45 }, buttons = 0
const moveTo = async (x, y, ms = 650) => {
  const from = { ...pointer }, steps = Math.max(8, Math.round(ms / 16))
  for (let i = 1; i <= steps; i++) {
    const k = ease(i / steps)
    pointer = { x: from.x + (x - from.x) * k, y: from.y + (y - from.y) * k }
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...pointer, buttons, ...(buttons && { button: 'left' }) })
    await sleep(ms / steps)
  }
}
const rectOf = async (css, pick = 'center') => {
  const r = await evaluate(`(() => { const e = ${css.startsWith('(') ? css : `document.querySelector(${JSON.stringify(css)})`}; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })()`)
  if (!r) throw new Error(`nothing at ${css}`)
  return pick === 'left' ? { x: r.x + Math.min(40, r.w / 3), y: r.y + r.h / 2 } : { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}
const hover = async (css, ms, pick) => { const p = await rectOf(css, pick); await moveTo(p.x, p.y, ms) }
const press = (type) => send('Input.dispatchMouseEvent', { type, ...pointer, button: 'left', buttons: (buttons = type === 'mousePressed' ? 1 : 0), clickCount: 1 })
const click = async (css, ms, pick) => {
  if (css) await hover(css, ms, pick)
  await sleep(120)
  await press('mousePressed'); await sleep(70); await press('mouseReleased')
}
const caption = (html) => evaluate(`__demo.caption(${JSON.stringify(html ?? '')})`)
const card = (html) => evaluate(`__demo.card(${JSON.stringify(html ?? '')})`)
const key = async (k, code, keyCode) => {
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: keyCode })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: keyCode })
}

const cardOf = (call) => `([...document.querySelectorAll('.floors .sess')].find(e => e.querySelector('.call')?.textContent.trim() === '${call}'))`
const inboxOf = (call) => `([...document.querySelectorAll('.inbox .inbox-row')].find(e => e.querySelector('.inbox-call')?.textContent.trim() === '${call}')?.querySelector('.inbox-go'))`
const floorSign = (id) => `(document.querySelector('section.floor[data-hold="floor:${id}"] > .sign'))`
const floorMore = (id) => `(document.querySelector('section.floor[data-hold="floor:${id}"] > .sign > .floor-more'))`
const menuItem = (what) => `([...document.querySelectorAll('.floor-menu button')].find(b => b.querySelector('.what')?.textContent.trim() === '${what}'))`
const tab = (name) => `([...document.querySelectorAll('.main .pane-tab')].find(b => b.textContent.trim().startsWith('${name}')))`

await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...pointer })
await send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: W * SCALE, maxHeight: H * SCALE, everyNthFrame: 1 })
await sleep(300)
recording = true

// ── Title
await card('<div class="kicker">The Tower</div><h1>Lobby</h1><p>A calm, macOS-style page for the tower</p>')
await sleep(2600)
await card(null)
await sleep(700)

// ── Inbox
await caption('<b>Waiting on you</b>: every worker that needs you, on any floor, in one list')
await hover(inboxOf('NOVA-03'), 800, 'left'); await sleep(500)
await hover(inboxOf('LYRA-02'), 650, 'left'); await sleep(450)
await hover(inboxOf('RIGEL-06'), 550, 'left'); await sleep(900)

// ── Floors and crews
await caption('Floors read as quiet signs, and a crew shows as a tree')
await hover(cardOf('ORION-04'), 700, 'left'); await sleep(700)
await hover(cardOf('VEGA-05'), 450, 'left'); await sleep(600)
await hover(cardOf('RIGEL-06'), 450, 'left'); await sleep(1100)

// ── A wait, opened
await caption('Click a wait to jump to it: what it asks sits at the top')
await click(inboxOf('LYRA-02'), 750, 'left'); await sleep(1800)

// ── The where line and the branch copy
await caption('Floor, model, effort and branch on one line, with a copy button')
await hover('.main .lobby-where', 700, 'left'); await sleep(500)
await click('.main .copy-branch', 650); await sleep(1500)

// ── Brief
await caption('The Brief: the conversation as a readable thread')
await click(tab('Brief'), 600); await sleep(2200)

// ── Changes
await caption('<b>Changes</b>, in a GitHub-style diff theme')
await click(cardOf('ATLAS-01'), 800, 'left'); await sleep(900)
await click(tab('Changes'), 600); await sleep(1400)
await moveTo(900, 520, 900); await sleep(1400)

// ── Floor menu
await caption('One <b>⋯</b> menu per floor: kept items, worktrees, shelf and repos')
await hover(floorSign('tower'), 700, 'left'); await sleep(300)
await click(floorMore('tower'), 450); await sleep(1500)
await hover(menuItem('Drafts'), 500); await sleep(500)
await click(null); await sleep(1500)
await caption('What is open gets a tick: click it again to close it')
await click(floorMore('tower'), 600); await sleep(1300)
await hover(menuItem('Drafts'), 450); await sleep(900)
await click(null); await sleep(1200)

// ── Stats
await caption('<b>Stats</b> open in the main pane, not squeezed into the sidebar')
await click('.stats-open', 700); await sleep(2400)
await click('.stats-pane [data-side-view="floors"]', 700); await sleep(700)

// ── Drag
await caption('Drag a worker to reorder the floor')
await hover(cardOf('MIRA-07'), 800, 'left'); await sleep(350)
await hover(`(${cardOf('MIRA-07')}.closest('.crew-group').querySelector('.crew-grip'))`, 300); await sleep(200)
await press('mousePressed'); await sleep(150)
{
  const to = await rectOf(cardOf('ORION-04'), 'left')
  await moveTo(pointer.x + 6, pointer.y - 6, 200)
  await moveTo(to.x + 10, to.y - 12, 1100); await sleep(700)
  await press('mouseReleased')
}
await sleep(1100)

// ── Dark
await caption('Light and dark follow macOS')
await moveTo(860, 430, 700)
await scheme('dark'); await sleep(2600)

// ── Fold the sidebar
await caption('Fold the sidebar: the waiting count stays on the rail')
await click('#side-hide', 800); await sleep(2000)
await click('#rail [data-side]', 700); await sleep(1200)

// ── End
await caption(null)
await card('<div class="kicker">The Tower</div><h1>Lobby</h1><p>github.com/fliptaboada/tower-renderer-lobby</p>')
await sleep(2800)

recording = false
await send('Page.stopScreencast')
ws.close(); chrome.kill()
rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })

// Each frame lasts until the next one arrived; the last one holds a second.
const list = shots.map((s, i) => `file '${s.file}'\nduration ${((shots[i + 1]?.t ?? s.t + 1) - s.t).toFixed(4)}`).join('\n') + `\nfile '${shots.at(-1).file}'\n`
const listFile = path.join(path.dirname(out), 'frames.txt')
writeFileSync(listFile, list)
console.log(`${shots.length} frames over ${(shots.at(-1).t - shots[0].t).toFixed(1)} s`)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-vf', 'fps=30,scale=1920:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' })
console.log(`wrote ${out}`)
