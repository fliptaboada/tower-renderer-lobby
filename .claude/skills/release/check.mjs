// Opens Lobby at the running tower's /r/lobby/ in headless Chrome, with this clone's lobby.js and lobby.css in place of
// the ones the tower serves, so a branch is checked without touching the config or the main checkout's out/.
// Prints the page's errors and saves the sidebar at each window width.
//
//   node .claude/skills/release/check.mjs <clone> <out dir> [width…]     (default width: 1280)
//
// TOWER_URL picks the tower (default http://127.0.0.1:4317); CHROME, the browser.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const [clone, out, ...sizes] = process.argv.slice(2)
if (!clone || !out) throw new Error('usage: check.mjs <clone> <out dir> [width…]')
const widths = sizes.length ? sizes.map(Number) : [1280]
const tower = process.env.TOWER_URL ?? 'http://127.0.0.1:4317'
// sync.sh strips lobby.css's layer lines for a page whose CSS sits in no cascade layer (before 2.17, or a fork); do
// the same, or every layered rule of Lobby's loses to the page and the screenshots show the stock page's look.
const layered = (await fetch(`${tower}/r/lobby/`).then((r) => r.text())).includes('@layer tower.')
const lobbyCss = () => {
  const css = readFileSync(path.join(clone, 'lobby.css'), 'utf8')
  return layered ? css : css.split('\n').filter((l) => !/^@layer tower\.\w+ \{$/.test(l) && !/^\} \/\* tower\.\w+ \*\/$/.test(l)).join('\n')
}
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
mkdirSync(out, { recursive: true })
const profile = mkdtempSync(path.join(out, 'profile-'))
const port = 9300 + Math.floor(Math.random() * 600)
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--mute-audio', 'about:blank'], { stdio: 'ignore' })
const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms))
const done = (/** @type {number} */ code) => (chrome.kill(), setTimeout(() => (rmSync(profile, { recursive: true, force: true }), process.exit(code)), 300))

let tabs
for (let i = 0; i < 50 && !tabs; i++) tabs = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json(), () => sleep(200))
const ws = new WebSocket(tabs.find((/** @type {{ type: string }} */ t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const waiting = new Map()
const send = (/** @type {string} */ method, params = {}) => new Promise((res) => { waiting.set(++id, res); ws.send(JSON.stringify({ id, method, params })) })
/** @type {string[]} */
const errors = []
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && waiting.has(m.id)) return (waiting.get(m.id)(m.result ?? m), waiting.delete(m.id))
  if (m.method === 'Fetch.requestPaused') {
    const file = new URL(m.params.request.url).pathname.endsWith('.js') ? 'lobby.js' : 'lobby.css'
    const type = file.endsWith('.js') ? 'text/javascript' : 'text/css'
    send('Fetch.fulfillRequest', { requestId: m.params.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: type }], body: Buffer.from(file === 'lobby.css' ? lobbyCss() : readFileSync(path.join(clone, file))).toString('base64') })
  }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((/** @type {{ value?: unknown, description?: string }} */ a) => a.value ?? a.description).join(' '))
}
await send('Runtime.enable')
await send('Fetch.enable', { patterns: [{ urlPattern: '*/r/lobby/lobby.js*' }, { urlPattern: '*/r/lobby/lobby.css*' }] })
await send('Emulation.setDeviceMetricsOverride', { width: widths[0], height: 800, deviceScaleFactor: 2, mobile: false })
await send('Page.navigate', { url: `${tower}/r/lobby/` })
await sleep(4000)
const version = (await send('Runtime.evaluate', { expression: `document.querySelector('.lobby-version')?.textContent`, returnByValue: true })).result?.value
console.log(`page: ${version ?? 'no Lobby version found: is /r/lobby/ declared?'}`)
for (const width of widths) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 2, mobile: false })
  await sleep(700)
  const side = (await send('Runtime.evaluate', { expression: `Math.round(document.querySelector('.side').getBoundingClientRect().width)`, returnByValue: true })).result?.value
  const shot = await send('Page.captureScreenshot', { clip: { x: 0, y: 0, width: Math.min(width, side + 40), height: 800, scale: 1 } })
  writeFileSync(path.join(out, `sidebar-${width}.png`), Buffer.from(shot.data, 'base64'))
  console.log(`${width}px window: sidebar ${side}px → ${path.join(out, `sidebar-${width}.png`)}`)
}
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'errors: none')
done(errors.length ? 1 : 0)
