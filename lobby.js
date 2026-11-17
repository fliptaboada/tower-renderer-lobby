// Lobby's layer over the page: view-only touches lobby.css can't make alone. No verb called; the one thing it keeps
// is the viewer's choice for the inbox (Open, Folded or Off), in `tower.store`.
import { copyText, ICON, withIcons } from '/lib/view.js'
import { choice, section } from '/lib/settings.js'
import { addedTidyOf, branchLine, gistLine, lampOf, loudest, pairLineOf, statusName, tidyLine, tidyRows, WAITING_NAME } from '/lib/cards.js'
import { locationOf } from '/lib/layout.js'
import { DISMISSED_KEY } from '/lib/viewer.js'
import { esc, modelName } from '/lib/words.js'

// The frame. This module loads before the page's (sync.sh links it ahead of page.js), so it regroups the stock frame
// before the page first draws: the page fills its elements by id, so moving them changes where they draw, not what.
// The board's sign and a stats button go up into the brand; the tally and the limits share one glance row; the
// Floors/Stats switch goes (stats opens from the brand and closes from its own pane); stats moves into the main pane;
// the config path and the renderers fold under one disclosure.
{
  const byId = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id))
  const make = (/** @type {string} */ html) => /** @type {HTMLElement} */ (document.createRange().createContextualFragment(html).firstElementChild)
  byId('settings-open').before(byId('board-sign'), make(`<button class="icon-btn stats-open" data-side-view="stats" aria-label="stats" data-tip="stats: spend, work and waits, from the logs"><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5"/></svg></button>`))
  const glance = make('<div class="glance"></div>')
  byId('tally').before(glance)
  glance.append(byId('tally'), byId('limits-bar'))
  const switcher = /** @type {Element} */ (document.querySelector('.side-views'))
  switcher.remove()
  const pane = make(`<section class="stats-pane" aria-label="stats"><header class="stats-pane-head"><h2>Stats</h2><button class="icon-btn" data-side-view="floors" aria-label="close stats" data-tip="close stats">${ICON.close}</button></header></section>`)
  pane.append(byId('stats'))
  byId('view-host').before(pane)
  const more = make('<details class="side-more"><summary>Config and renderers</summary></details>')
  byId('side-foot').before(more)
  more.append(byId('side-foot'), byId('renderers'))

  // Lobby's version, at the end of that fold's summary (where the page's own version, which lobby.css hides from the
  // brand, goes too): sync.sh stamps the build into a meta tag, VERSION's number with the commit it was built from.
  // Pressing it copies one line that says what runs, for a bug report.
  const meta = /** @type {HTMLMetaElement} */ (document.querySelector('meta[name="lobby-version"]'))
  const { commit, built } = meta.dataset
  const said = `Lobby ${meta.content} (${commit}, built ${built}) on the tower ${window.tower.served.version ?? 'of unknown version'}`
  const version = Object.assign(document.createElement('button'), { type: 'button', className: 'lobby-version', textContent: `Lobby ${meta.content}` })
  version.dataset.tip = `${said}. Press to copy it`
  version.addEventListener('click', (e) => {
    e.preventDefault()
    copyText(said).then(() => (version.dataset.tip = 'copied'), (/** @type {Error} */ err) => (version.dataset.tip = err.message))
    setTimeout(() => (version.dataset.tip = `${said}. Press to copy it`), 1400)
  })
  const summary = /** @type {HTMLElement} */ (more.querySelector('summary'))
  summary.replaceChildren(Object.assign(document.createElement('span'), { textContent: 'Config and renderers' }), version)
}

// The tally draws every status with its count, zeros included; a count at zero is marked `zero` so the glance row
// shows only what is there. The waits' pill says "waiting" rather than the page's "waiting on you". The page redraws
// the tally on each board, so the marks and the words follow its mutations, written only when they differ so the
// observer settles.
//
// The glance row (the counts and the limits) keeps to one line: each chip's word is wrapped in a span, and when the
// row runs out of room the words go one at a time, the quietest status's first and the waits' own last, leaving each
// lamp and number (a chip's tip still names it). It is measured again whenever the counts, the limits or the sidebar's width change.
const tally = /** @type {HTMLElement} */ (document.getElementById('tally'))
const glance = /** @type {HTMLElement} */ (tally.closest('.glance'))
const mark = () => {
  for (const chip of tally.querySelectorAll('.chip')) {
    const word = [...chip.childNodes].find((n) => n.nodeType === 3 && n.textContent?.trim())
    if (word) {
      const span = Object.assign(document.createElement('span'), { className: 'chip-word', textContent: chip.matches('.waits') ? 'waiting' : word.textContent?.trim() })
      word.replaceWith(' ', span)
    }
    const kept = chip.querySelector(':scope > .chip-word')
    if (kept && chip.matches('.waits') && kept.textContent !== 'waiting') kept.textContent = 'waiting'
    chip.classList.toggle('zero', chip.querySelector('b')?.textContent?.trim() === '0')
  }
  tally.classList.toggle('clear', !tally.querySelector('.chip:not(.zero)'))
  fit()
}
/** Whose word goes first when the row is short of room: the quietest statuses, the waits' own last. */
const TERSE_ORDER = ['quiet', 'working', 'ready', 'broken', 'needs', 'offered', 'waits']
const fit = () => {
  const over = () => glance.scrollWidth > glance.clientWidth + 1
  const chips = /** @type {HTMLElement[]} */ ([...tally.querySelectorAll('.chip')])
  for (const chip of chips) chip.classList.remove('terse')
  glance.classList.remove('tight')
  for (const kind of TERSE_ORDER) {
    if (!over()) return
    // The waits' pill carries its loudest wait's status too (`waits ready`): a status's turn is its own chip's.
    chips.find((c) => c.classList.contains(kind) && (kind === 'waits' || !c.classList.contains('waits')) && !c.classList.contains('zero'))?.classList.add('terse')
  }
  // Every word gone and still short: the chips close up.
  if (over()) glance.classList.add('tight')
}
new MutationObserver(mark).observe(tally, { childList: true, subtree: true, characterData: true })
new MutationObserver(fit).observe(/** @type {HTMLElement} */ (document.getElementById('limits-bar')), { childList: true, subtree: true, characterData: true })
new ResizeObserver(fit).observe(glance)
mark()

// A worker's header line, drawn from the board in the core's line's place (lobby.css hides that one, which the page
// still writes): its floor, its model and effort, then its branch with the button that copies it right beside it,
// then who hired it. The core's view redraws its line, so this one is put back after each redraw, and written only
// when what it says changes. The card is the one whose callsign heads the view.
const COPY = '<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"/></svg>'
const DONE = '<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg>'
/** @type {import('/lib/board.js').Board | undefined} */
let board
let queued = false

/** @param {string} branch */
const copyButton = (branch) => {
  const button = Object.assign(document.createElement('button'), { type: 'button', className: 'icon-btn copy-branch', innerHTML: COPY })
  const tip = `copy the branch: ${branch}`
  button.dataset.tip = tip
  button.setAttribute('aria-label', `copy the branch ${branch}`)
  button.addEventListener('click', () =>
    copyText(branch).then(
      () => {
        button.innerHTML = DONE
        button.dataset.tip = 'copied'
        setTimeout(() => ((button.innerHTML = COPY), (button.dataset.tip = tip)), 1400)
      },
      (/** @type {Error} */ err) => (button.dataset.tip = err.message),
    ),
  )
  return button
}

/** @param {Element} root @param {import('/lib/board.js').Card} card @param {import('/lib/board.js').Floor | undefined} floor */
const drawWhere = (root, card, floor) => {
  const part = root.querySelector('.where-part')
  if (!part) return
  const folder = card.worktree ? '' : floor && card.cwd !== floor.hub ? (card.cwd.split('/').pop() ?? '') : ''
  const pieces = /** @type {[string, string][]} */ ([
    ['floor', floor?.name ?? card.project],
    ['meta', [modelName(card.model), card.effort].filter(Boolean).join(' · ')],
    ['branch', card.worktree ? branchLine(card) : folder],
    ['pair', pairLineOf(card, undefined)],
  ]).filter(([, text]) => text)
  const key = JSON.stringify([pieces, card.worktree?.branch])
  const had = /** @type {HTMLElement | null} */ (part.querySelector('.lobby-where'))
  if (had?.dataset.key === key) return
  const line = Object.assign(document.createElement('span'), { className: 'lobby-where' })
  line.dataset.key = key
  pieces.forEach(([kind, text], i) => {
    if (i) line.append(' · ')
    const piece = Object.assign(document.createElement('span'), { className: `lobby-${kind}` })
    if (kind === 'branch' && card.worktree) piece.innerHTML = withIcons(esc(text))
    else piece.textContent = text
    line.append(piece)
    if (kind === 'branch' && card.worktree?.branch) line.append(copyButton(card.worktree.branch))
  })
  had ? had.replaceWith(line) : part.append(line)
}

/** The "needs you" banner: what the worker last said, under its name. @param {Element} root @param {import('/lib/board.js').Card} card */
const touchAsk = (root, card) => {
  const what = root.querySelector('.ask .what')
  const gist = gistLine(card)
  const hadGist = what?.querySelector('.lobby-gist')
  if (what && gist && hadGist?.textContent !== gist) {
    hadGist?.remove()
    what.append(Object.assign(document.createElement('span'), { className: 'lobby-gist', textContent: gist }))
  }
}

const placeCopies = () => {
  queued = false
  if (!board) return
  const all = board.floors.flatMap((f) => f.cards.map((c) => ({ card: c, floor: f })))
  for (const part of document.querySelectorAll('[data-view="tower/card"] .where-part')) {
    const root = /** @type {Element} */ (part.closest('[data-view]'))
    const callsign = root.querySelector('.bar-info .call')?.textContent?.trim()
    const found = all.find(({ card }) => card.callsign === callsign)
    if (!found) continue
    drawWhere(root, found.card, found.floor)
    touchAsk(root, found.card)
  }
}
const queue = () => {
  if (queued) return
  queued = true
  requestAnimationFrame(placeCopies)
}
/** Whether a change happened inside a terminal: a terminal changes on every keystroke and line of output, and nothing
 * this layer draws lives there, so its observers skip those changes before doing any work. @param {MutationRecord} m */
const inTerminal = (m) => !!(m.target.nodeType === 1 ? /** @type {Element} */ (m.target) : m.target.parentElement)?.closest('.xterm')
window.tower.subscribe((b) => ((board = b), queue()))
new MutationObserver((changes) => changes.some((m) => !inTerminal(m)) && queue()).observe(/** @type {HTMLElement} */ (document.getElementById('view-host')), { childList: true, subtree: true })

// What the sidebar draws from the board itself, beside the page's floors: the inbox of who waits on you, and each
// floor's menu. Both act through the page's own controls by their data attributes (data-worker, data-open-view,
// data-dismiss, data-spawn, data-shell-dir, data-open, data-resume-all), which the page handles wherever
// they are clicked, so nothing here calls a verb or keeps state of its own.
const side = /** @type {HTMLElement} */ (document.querySelector('.side'))
const floors = /** @type {HTMLElement} */ (document.getElementById('floors'))
/** @type {Set<string>} */
let dismissed = new Set()
const readDismissed = async () => {
  const kept = await window.tower.store.get(DISMISSED_KEY)
  dismissed = new Set(Array.isArray(kept) ? kept : [])
  drawInbox()
}
window.tower.store.on((key) => key === DISMISSED_KEY && void readDismissed())

const el = (/** @type {string} */ tag, /** @type {string} */ className = '', /** @type {string} */ text = '') => Object.assign(document.createElement(tag), { className, textContent: text })
const icon = (/** @type {string} */ name) => {
  const span = el('span', 'ico')
  span.innerHTML = /** @type {Record<string, string>} */ (ICON)[name] ?? ''
  return span
}
/** How long ago, in the fewest words: `now`, `4m`, `2h 10m`, `3d`. @param {number} since */
const ago = (since) => {
  const m = Math.floor((Date.now() - since) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h${m % 60 ? ` ${m % 60}m` : ''}` : `${Math.floor(h / 24)}d`
}
/** The floor's colour as the page paints it on its section. @param {string} id */
const floorColour = (id) => floorEl(id)?.style.getPropertyValue('--p') || ''
/** @param {string} floor */
const floorEl = (floor) => /** @type {HTMLElement | null} */ (floors.querySelector(`section.floor[data-hold="floor:${CSS.escape(floor)}"]`))

// The inbox: every worker waiting on you, on any floor, the longest wait first, with what it said and for how long.
// Waiting covers more than a question: a worker that finished its turn waits on you too, so the inbox is named as
// the page names it, "Waiting on you", its count in the colour of the loudest wait and each row's state beside it.
// A row opens the worker; its × dismisses the wait for this viewer, as the page's own dismiss does.
//
// However many wait, the inbox keeps to a few rows' height and scrolls the rest, so the floors keep their room. Its
// head folds it to the count alone. Whether it shows at all is the viewer's, in the settings popover (Open, Folded or
// Off), kept in `tower.store` under INBOX_KEY; until they choose, the config's `renderers.lobby.settings.inbox` says
// (one of the same words), else Open. Off hands the waits back to the glance's own "waiting on you" pill.
const INBOX_KEY = 'lobby.inbox'
/** The head's chevron, pointing right (folded); lobby.css turns it down while open. Drawn, not a glyph: a glyph sits
 * off its box's centre, so it would turn off-centre. */
const FOLD = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>'
const INBOX_MODES = /** @type {const} */ (['open', 'folded', 'off'])
/** @typedef {(typeof INBOX_MODES)[number]} InboxMode */
const isMode = (/** @type {unknown} */ m) => INBOX_MODES.includes(/** @type {InboxMode} */ (m))
/** What the config sets, until the viewer chooses. @type {InboxMode} */
let inboxDefault = 'open'
/** The viewer's choice, once made. @type {InboxMode | undefined} */
let inboxChosen
const inboxMode = () => inboxChosen ?? inboxDefault
const readInboxMode = async () => {
  const [renderer, kept] = await Promise.all([window.tower.renderer().catch(() => null), window.tower.store.get(INBOX_KEY)])
  if (isMode(renderer?.settings?.inbox)) inboxDefault = renderer.settings.inbox
  inboxChosen = isMode(kept) ? kept : undefined
  drawn = ''
  drawInbox()
  drawInboxSetting()
}
const setInboxMode = (/** @type {InboxMode} */ mode) => {
  inboxChosen = mode
  window.tower.store.set(INBOX_KEY, mode)
  drawn = ''
  drawInbox()
  drawInboxSetting()
}
window.tower.store.on((key) => key === INBOX_KEY && void readInboxMode())

const inbox = el('section', 'inbox')
inbox.setAttribute('aria-label', 'waiting on you')
side.insertBefore(inbox, side.querySelector('.floors'))
/** The rows' own scroller, kept across draws so a redraw leaves where the viewer scrolled to. */
const inboxRows = el('div', 'inbox-rows')
const markMore = () => inboxRows.classList.toggle('more', inboxRows.scrollTop + inboxRows.clientHeight < inboxRows.scrollHeight - 2)
inboxRows.addEventListener('scroll', markMore, { passive: true })
/** What the inbox last drew, all but the ages: a board that changes none of it leaves the rows, their tips and the
 * pointer's place alone, and only the ages are written. */
let drawn = ''
/** The wait whose worker was open at the last draw. @type {string | undefined} */
let inboxSel
const drawInbox = () => {
  if (!board) return
  const mode = inboxMode()
  const cards = new Map(board.floors.flatMap((f) => f.cards.map((c) => [c.id, { card: c, floor: f }])))
  const waits = mode === 'off' ? [] : board.waiting.filter((w) => !dismissed.has(w.key) && cards.has(w.id)).sort((a, b) => a.since - b.since)
  const isSel = (/** @type {string} */ id) => location.hash.slice(1).split('/')[0] === id || location.hash.includes(encodeURIComponent(`card:${id}`))
  const shape = JSON.stringify([mode, waits.map((w) => {
    const { card, floor } = /** @type {{ card: import('/lib/board.js').Card, floor: import('/lib/board.js').Floor }} */ (cards.get(w.id))
    return [w.key, lampOf(card), card.callsign, floor.name, floorColour(floor.id), gistLine(card) || statusName(card), statusName(card), isSel(card.id)]
  })])
  if (shape === drawn) {
    inboxRows.querySelectorAll('.inbox-row').forEach((row, i) => {
      const age = row.querySelector('.inbox-ago')
      const now = ago(waits[i].since)
      if (age && age.textContent !== now) age.textContent = now
    })
    return
  }
  drawn = shape
  inbox.hidden = waits.length === 0
  inbox.classList.toggle('folded', mode === 'folded')
  side.classList.toggle('has-inbox', waits.length > 0)
  const tone = loudest(waits.map((w) => /** @type {{ card: import('/lib/board.js').Card }} */ (cards.get(w.id)).card)) ?? 'quiet'
  // The folded sidebar's count of waits (the rail's) takes the same colour as the inbox's (lobby.css).
  side.dataset.waitTone = tone
  if (!waits.length) return (inboxRows.replaceChildren(), inbox.replaceChildren())
  const head = el('button', `inbox-head ${tone}`)
  head.type = 'button'
  head.setAttribute('aria-expanded', String(mode === 'open'))
  head.dataset.tip = mode === 'open' ? 'fold the inbox to its count' : 'unfold the inbox'
  const fold = el('span', 'inbox-fold')
  fold.innerHTML = FOLD
  head.append(fold, el('span', 'inbox-title', WAITING_NAME[0].toUpperCase() + WAITING_NAME.slice(1)), el('span', 'inbox-n', String(waits.length)))
  head.addEventListener('click', () => setInboxMode(inboxMode() === 'open' ? 'folded' : 'open'))
  const rows = waits.map((w) => {
    const { card, floor } = /** @type {{ card: import('/lib/board.js').Card, floor: import('/lib/board.js').Floor }} */ (cards.get(w.id))
    const row = el('div', `inbox-row ${lampOf(card)}`)
    row.classList.toggle('sel', isSel(card.id))
    const go = el('button', 'inbox-go')
    go.type = 'button'
    go.dataset.worker = card.id
    const top = el('span', 'inbox-top')
    const where = el('span', 'inbox-floor', floor.name)
    where.style.setProperty('--p', floorColour(floor.id))
    top.append(el('span', 'lamp'), el('span', 'inbox-call', card.callsign), where, el('span', 'inbox-st', statusName(card)), el('span', 'inbox-ago', ago(w.since)))
    go.append(top, el('span', 'inbox-gist', gistLine(card) || statusName(card)))
    go.dataset.tip = `${card.callsign} · ${statusName(card)}: open it`
    const dismiss = el('button', 'icon-btn inbox-dismiss')
    dismiss.type = 'button'
    dismiss.dataset.dismiss = w.key
    dismiss.setAttribute('aria-label', `dismiss ${card.callsign}'s wait`)
    dismiss.dataset.tip = 'dismiss: off this list until it waits again'
    dismiss.innerHTML = ICON.close
    row.append(go, dismiss)
    return row
  })
  inboxRows.replaceChildren(...rows)
  inbox.replaceChildren(head, inboxRows)
  // The open worker's row in sight when it becomes the open one, not on every redraw: a new wait leaves the scroll be.
  const sel = waits.find((w) => isSel(w.id))?.key
  if (mode === 'open' && sel && sel !== inboxSel) inboxRows.querySelector('.inbox-row.sel')?.scrollIntoView({ block: 'nearest' })
  inboxSel = sel
  markMore()
}

// The inbox's setting, a section of the page's settings popover. The page paints the popover's whole HTML on opening
// and whenever what it shows changes, so the section is added again after each paint; the page compares its HTML
// with what it painted last, not with the popover's, so an addition stays until its next real paint.
const settingsPop = /** @type {HTMLElement} */ (document.getElementById('settings'))
const INBOX_LABEL = { open: 'Open', folded: 'Folded', off: 'Off' }
const INBOX_MEANS = {
  open: 'who waits on you, above the floors: a few rows high, the rest a scroll away',
  folded: 'the inbox folded to its count, unfolded from its head',
  off: 'no inbox: the glance row\'s "waiting on you" counts the waits',
}
const drawInboxSetting = () => {
  const host = settingsPop.querySelector(':scope > .settings')
  if (!host) return
  const html = section('Inbox', 'who waits on you, in the sidebar', `<div class="seg" role="group" aria-label="inbox">${INBOX_MODES.map((m) => choice('data-lobby-inbox', m, INBOX_LABEL[m], INBOX_MEANS[m], m === inboxMode())).join('')}</div>`)
  const was = host.querySelector(':scope > .lobby-inbox-pref')
  const fresh = /** @type {HTMLElement} */ (document.createRange().createContextualFragment(html).firstElementChild)
  fresh.classList.add('lobby-inbox-pref')
  if (was?.outerHTML === fresh.outerHTML) return
  const focused = document.activeElement?.closest('[data-lobby-inbox]')?.getAttribute('data-lobby-inbox')
  if (was) was.replaceWith(fresh)
  else (host.querySelectorAll(':scope > section')[1] ?? host.lastElementChild)?.after(fresh)
  if (focused) /** @type {HTMLElement | null} */ (fresh.querySelector(`[data-lobby-inbox="${focused}"]`))?.focus()
}
new MutationObserver(() => drawInboxSetting()).observe(settingsPop, { childList: true })
settingsPop.addEventListener('click', (e) => {
  const mode = /** @type {Element} */ (e.target).closest('[data-lobby-inbox]')?.getAttribute('data-lobby-inbox')
  if (isMode(mode)) setInboxMode(/** @type {InboxMode} */ (mode))
})
void readInboxMode()
setInterval(drawInbox, 30_000)
addEventListener('hashchange', drawInbox)

// A floor's menu, drawn from the board, so a folded floor has one too: its collections and archive open in the main
// pane (data-open-view), its shelf pages likewise or in a tab, its repos open a shell or the editor, and what the
// page draws inline (worktrees, tidy) unfolds the floor and opens there. Ticked: what is open now. The ⋯ on the name
// carries a dot while something there wants a decision: red for a policy that can't run or a worktree at risk, amber
// for a policy's slot offered. Stranded workers pile up and rarely press, so they stay a menu item, with no dot. The
// ⋯'s tip says why its dot is there.
const MORE = '<svg class="icon" viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12.5" cy="8" r="1.3"/></svg>'
const menu = el('div', 'floor-menu')
menu.setAttribute('popover', 'auto')
menu.setAttribute('role', 'menu')
document.body.append(menu)
/** @type {HTMLElement | null} */
let opener = null

/** The open location, by the hash. */
const here = () => (board ? locationOf(location.hash, board) : undefined)
/** @param {string} subject @param {string} [view] */
const isOpen = (subject, view) => {
  const at = here()
  return !!at && at.subject === subject && (view === undefined || at.view === view)
}
/** A menu item: a button the page acts on by `data`. @param {{ what: string, glyph?: string, n?: number | string, warn?: string, on?: boolean, data?: Record<string, string>, run?: () => void, tip?: string }} o */
const entry = (o) => {
  const b = el('button')
  b.type = 'button'
  b.setAttribute('role', 'menuitem')
  b.tabIndex = -1
  if (o.on) (b.className = 'on'), b.setAttribute('aria-current', 'true')
  // What is open closes from its own item: a view in the main pane by the pane's own ×, an inline section by its
  // tray, which `run` presses either way.
  if (!(o.on && !o.run)) Object.assign(b.dataset, o.data ?? {})
  else b.addEventListener('click', () => /** @type {HTMLElement | null} */ (document.querySelector('#view-host .view-root:not(.kept) [data-home]'))?.click())
  if (o.tip) b.dataset.tip = o.tip
  b.append(icon(o.glyph ?? ''), el('span', 'what', o.what))
  if (o.warn) b.append(el('span', 'warn', o.warn))
  else if (o.n !== undefined) b.append(el('span', 'n', String(o.n)))
  if (o.on) b.append(Object.assign(el('span', 'check'), { innerHTML: DONE }), Object.assign(el('span', 'uncheck'), { innerHTML: ICON.close }))
  if (o.on) b.dataset.tip = `${o.what} is open: click to close it`
  if (o.run) b.addEventListener('click', o.run)
  return b
}
const label = (/** @type {string} */ text) => el('div', 'menu-label', text)
const rule = () => Object.assign(el('div'), { role: 'separator' })
const view = (/** @type {string} */ subject, /** @type {string} [v] */ v) => ({ openView: JSON.stringify(v ? { subject, view: v } : { subject }) })
const GLYPHS = /** @type {Record<string, string>} */ ({ drafts: 'draft', reviews: 'thread', policies: 'resume' })

/** What wants a decision on a floor, read on the board: the dot's colour and the words for why. @param {import('/lib/board.js').Floor} f */
const floorDot = (f) => {
  const x = /** @type {any} */ (f.x ?? {})
  const n = (/** @type {number} */ k, /** @type {string} */ one, /** @type {string} */ many) => `${k} ${k === 1 ? one : many}`
  const invalid = (x.policies?.policies ?? []).filter((/** @type {any} */ p) => p.problems?.length).length
  const risky = f.worktrees.filter((w) => w.state === 'at-risk' || w.state === 'lost').length
  const offers = (x.policies?.offers ?? []).length
  const red = [invalid && n(invalid, 'policy can’t run', 'policies can’t run'), risky && n(risky, 'worktree at risk', 'worktrees at risk')].filter(Boolean)
  if (red.length) return { dot: 'broken', why: red.join(', ') }
  if (offers) return { dot: 'working', why: n(offers, 'policy run offered', 'policy runs offered') }
  return { dot: '', why: '' }
}

/** Opens a section the page draws inline in the floor (worktrees, tidy): the floor unfolded first if it is folded. @param {string} floor @param {string} key */
const openSection = (floor, key) => {
  const press = () => /** @type {HTMLElement | null} */ (floorEl(floor)?.querySelector(`[data-section="${CSS.escape(`${key}:${floor}`)}"]`))?.click()
  if (!floorEl(floor)?.classList.contains('folded')) return press()
  const fold = /** @type {HTMLElement | null | undefined} */ (floorEl(floor)?.querySelector('[data-floor-fold]'))
  fold?.click()
  requestAnimationFrame(() => requestAnimationFrame(press))
}

/** @param {string} floor */
const fill = (floor) => {
  const f = board?.floors.find((x) => x.id === floor)
  if (!f) return false
  const x = /** @type {any} */ (f.x ?? {})
  const invalid = (x.policies?.policies ?? []).filter((/** @type {any} */ p) => p.problems?.length).length
  // A collection opens as its list (a collection's own default view may be an editor for a new item); policies open
  // in their extension's view of the floor, which says which can't run and why.
  const kept = f.collections.map((c) => {
    const [subject, v] = c.id === 'policies' ? [`floor:${f.id}`, 'policies/policies'] : [`collection:${f.id}/${c.id}`, 'tower/collection']
    return entry({ what: c.label, glyph: GLYPHS[c.id] ?? 'collection', n: c.items.length || '', warn: c.id === 'policies' && invalid ? `${invalid} invalid` : undefined, on: isOpen(subject, v), data: view(subject, v), tip: c.description })
  })
  const section = floorEl(f.id)
  const sectionOn = (/** @type {string} */ key) => !!section?.querySelector(`.tray.on[data-section="${CSS.escape(`${key}:${f.id}`)}"]`)
  const atRisk = f.worktrees.filter((w) => w.state === 'at-risk' || w.state === 'lost').length
  const floorItems = [
    entry({ what: 'Archive', glyph: 'archive', on: isOpen(`floor:${f.id}`, 'tower/archive'), data: view(`floor:${f.id}`, 'tower/archive') }),
    f.worktrees.length > 0 && entry({ what: 'Worktrees', glyph: 'branch', n: f.worktrees.length, warn: atRisk ? `${atRisk} at risk` : undefined, on: sectionOn('worktrees'), run: () => openSection(f.id, 'worktrees') }),
    // Tidy: what can go (landed worktrees, old logs, extensions' entries such as filed review threads), as the
    // page's own Tidy tray offers it, its rows counted the same way.
    f.actions.some((a) => a.verb === 'tidy') && (() => {
      const rows = tidyRows(f, Date.now(), addedTidyOf(board, f)).length
      return rows > 0 && entry({ what: 'Tidy', glyph: 'tidy', n: rows, on: sectionOn('tidy'), tip: tidyLine(f.tidy, addedTidyOf(board, f)), run: () => openSection(f.id, 'tidy') })
    })(),
    f.cards.some((c) => c.stranded) && entry({ what: 'Resume stranded workers', glyph: 'resume', n: f.cards.filter((c) => c.stranded).length, data: { resumeAll: f.id } }),
  ].filter((e) => e instanceof HTMLElement)
  const shelf = (f.shelf ?? []).map((s, n) => {
    if ('link' in s) {
      const a = Object.assign(entry({ what: s.label, glyph: 'remote' }), {})
      a.addEventListener('click', () => window.open(/** @type {string} */ (s.link), '_blank', 'noreferrer'))
      return a
    }
    const subject = `shelf:${f.id}/${n}`
    return entry({ what: s.label, glyph: 'doc', on: isOpen(subject), data: view(subject) })
  })
  const editor = f.actions.some((a) => a.verb === 'editor')
  const repos = [f.hub, ...f.repos].map((dir, i) => {
    const row = el('div', 'repo-acts')
    row.append(icon(i ? 'repo' : 'hub'), el('span', 'what', dir.split('/').pop() ?? dir))
    row.dataset.tip = dir
    const shell = el('button', 'icon-btn')
    Object.assign(shell, { type: 'button', tabIndex: -1, innerHTML: ICON.shell })
    Object.assign(shell.dataset, { shellProject: f.id, shellDir: dir, tip: `new shell in ${dir}` })
    shell.setAttribute('role', 'menuitem')
    shell.setAttribute('aria-label', `new shell in ${dir.split('/').pop()}`)
    row.append(shell)
    if (editor) {
      const open = el('button', 'icon-btn')
      Object.assign(open, { type: 'button', tabIndex: -1, innerHTML: ICON.editor })
      Object.assign(open.dataset, { open: dir, openProject: f.id, tip: `open ${dir} in your editor` })
      open.setAttribute('role', 'menuitem')
      open.setAttribute('aria-label', `open ${dir.split('/').pop()} in your editor`)
      row.append(open)
    }
    return row
  })
  // What extensions add to an unfolded floor (its section's verbs), as the page draws them: their data attributes
  // keep them working where they are clicked.
  const adds = [...(section?.querySelectorAll('.adds > button') ?? [])].map((b) => {
    const copy = entry({ what: (b.textContent ?? '').trim() || b.getAttribute('aria-label') || '' })
    Object.assign(copy.dataset, /** @type {HTMLElement} */ (b).dataset)
    return copy
  })
  const make = f.actions.some((a) => a.verb === 'spawn') ? [entry({ what: 'New worker', glyph: 'plus', data: { spawn: f.id } })] : []
  // A folded floor's extension buttons and badges aren't drawn by the page, so its menu can't list them: this
  // unfolds the floor and opens its menu again, whole.
  if (section?.classList.contains('folded')) {
    make.push(entry({ what: `More on ${f.name}…`, glyph: 'caret', tip: 'unfold the floor for what its extensions add', run: () => {
      /** @type {HTMLElement | null} */ (section.querySelector('[data-floor-fold]'))?.click()
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const more = /** @type {HTMLElement | null} */ (floorEl(f.id)?.querySelector(':scope > .sign > .floor-more'))
        if (more) open(f.id, more)
      }))
    } }))
  }
  // An unfolded floor's extension badges, as the page draws them, at the head of its own items: shown, not pressed.
  const badges = [...(section?.querySelectorAll('.adds > :not(button, a)') ?? [])].map((b) => {
    const row = el('div', 'menu-badge')
    row.append(/** @type {Element} */ (b.cloneNode(true)))
    return row
  })
  const groups = [
    kept.length && [label('Kept'), ...kept],
    floorItems.length && [label('Floor'), ...floorItems],
    shelf.length && [label('Shelf'), ...shelf],
    [label('Repos'), ...repos, ...make, ...badges, ...adds],
  ].filter((g) => Array.isArray(g))
  menu.replaceChildren(...groups.flatMap((g, i) => (i ? [rule(), ...g] : g)))
  return true
}

/** Opens the floor's menu at a point, or under the button that opened it. @param {string} floor @param {HTMLElement} from @param {{x: number, y: number}} [at] */
const open = (floor, from, at) => {
  if (!fill(floor)) return
  opener = from
  menu.showPopover()
  const r = from.getBoundingClientRect()
  const { width, height } = menu.getBoundingClientRect()
  menu.style.left = `${Math.max(8, Math.min(at ? at.x : r.right - width, innerWidth - width - 8))}px`
  menu.style.top = `${Math.max(8, Math.min(at ? at.y : r.bottom + 4, innerHeight - height - 8))}px`
  from.setAttribute('aria-expanded', 'true')
  // After the click settles: the page puts focus back in the worker's terminal on a click in the sidebar.
  requestAnimationFrame(() => /** @type {HTMLElement | null} */ (menu.querySelector('[role="menuitem"]'))?.focus())
}
// An item closes the menu; the click goes on to the page, which acts on the item's data attributes.
menu.addEventListener('click', (e) => /** @type {Element} */ (e.target).closest('[role="menuitem"]') && menu.hidePopover())
menu.addEventListener('toggle', (e) => {
  if (/** @type {ToggleEvent} */ (e).newState === 'open') return
  opener?.setAttribute('aria-expanded', 'false')
  if (!document.activeElement || document.activeElement === document.body || menu.contains(document.activeElement)) opener?.focus()
})
menu.addEventListener('keydown', (e) => {
  const items = /** @type {HTMLElement[]} */ ([...menu.querySelectorAll('[role="menuitem"]')])
  const i = items.indexOf(/** @type {HTMLElement} */ (document.activeElement))
  const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key]
  if (to !== undefined) {
    e.preventDefault()
    items[(to + items.length) % items.length]?.focus()
  }
  // The page's own keys (Esc to the skyline, N to the next waiting) stay out of the menu; Esc still closes it.
  e.stopPropagation()
  if (e.key === 'Tab') menu.hidePopover()
})

/** The ⋯ whose menu was open when the pointer went down on it. The menu closes itself on that press (a popover
 * closes when the pointer goes down outside it), so by the click it reads as closed and would open again; noted
 * first, the click closes it instead. @type {HTMLElement | null} */
let wasOpenFor = null
const noteOpen = () => {
  wasOpenFor = menu.matches(':popover-open') ? opener : null
}

/** Puts each floor's ⋯ on its name, folded or not, and marks it. */
const decorate = () => {
  if (!board) return
  for (const f of board.floors) {
    const sign = floorEl(f.id)?.querySelector(':scope > .sign')
    if (!sign) continue
    let more = /** @type {HTMLButtonElement | null} */ (sign.querySelector(':scope > .floor-more'))
    if (!more) {
      more = Object.assign(el('button', 'icon-btn floor-more'), { type: 'button', innerHTML: MORE })
      more.setAttribute('aria-haspopup', 'menu')
      more.setAttribute('aria-expanded', 'false')
      more.setAttribute('aria-label', `${f.name}: kept, shelf and repos`)
      more.dataset.tip = 'kept, shelf and repos · or right-click the name'
      const target = more
      const id = f.id
      more.addEventListener('pointerdown', noteOpen)
      more.addEventListener('click', () => (wasOpenFor === target ? ((wasOpenFor = null), menu.hidePopover()) : open(id, target)))
      // Last on the name, so it holds the right edge while the floor's other buttons wait for a hover.
      sign.append(more)
    }
    const { dot, why } = floorDot(f)
    if ((more.dataset.dot ?? '') !== dot) dot ? (more.dataset.dot = dot) : delete more.dataset.dot
    const tip = why ? `${why} · kept, shelf and repos` : 'kept, shelf and repos · or right-click the name'
    if (more.dataset.tip !== tip) more.dataset.tip = tip
  }
}
let decorating = false
const queueDecorate = () => {
  if (decorating) return
  decorating = true
  requestAnimationFrame(() => ((decorating = false), decorate()))
}
new MutationObserver(queueDecorate).observe(floors, { childList: true, subtree: true })
window.tower.subscribe(() => (queueDecorate(), drawInbox()))
floors.addEventListener('pointerdown', (e) => e.button === 2 && /** @type {Element} */ (e.target).closest?.('section.floor > .sign') && noteOpen(), true)
floors.addEventListener('contextmenu', (e) => {
  const sign = /** @type {Element} */ (e.target).closest?.('section.floor > .sign')
  const more = /** @type {HTMLElement | null | undefined} */ (sign?.querySelector(':scope > .floor-more'))
  if (!sign || !more) return
  e.preventDefault()
  // A right-click on the name whose menu is open closes it, as a second click on its ⋯ does.
  if (wasOpenFor === more) return void ((wasOpenFor = null), menu.hidePopover())
  open((sign.parentElement?.getAttribute('data-hold') ?? '').replace(/^floor:/, ''), more, { x: e.clientX, y: e.clientY })
})
void readDismissed()

// Stats open in the main pane, over what is there (lobby.css), from the header's chart icon. Opening a worker or a
// floor's thing from the sidebar closes them, since what was asked for would otherwise sit behind them.
side.addEventListener('click', (e) => {
  if (!side.classList.contains('on-stats')) return
  if (!/** @type {Element} */ (e.target).closest('.floors, .inbox')) return
  /** @type {HTMLElement | null} */ (document.querySelector('.stats-pane [data-side-view="floors"]'))?.click()
}, true)

// Whatever opens in the main pane while Stats show (a new floor, a draft, a worker from anywhere) takes the pane:
// Stats close as soon as the pane mounts or brings forward another view, so the two never stack.
const viewHost = /** @type {HTMLElement} */ (document.getElementById('view-host'))
new MutationObserver((changes) => {
  if (!side.classList.contains('on-stats') || changes.every(inTerminal)) return
  if (!changes.some((m) => m.target === viewHost || /** @type {Element} */ (m.target).parentElement === viewHost)) return
  /** @type {HTMLElement | null} */ (document.querySelector('.stats-pane [data-side-view="floors"]'))?.click()
}).observe(viewHost, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })

// Dragging a crew by its grip: the page keeps the crew where it was, marked `dragged`, and marks where it would land
// (lobby.css draws both). Here, a ghost of the crew's lead card follows the pointer, lifted, until the drag ends;
// the page's own drag, its capture and its Escape, go on as they are.
/** @type {HTMLElement | null} */
let ghost = null
const endGhost = () => {
  ghost?.remove()
  ghost = null
  removeEventListener('pointermove', followGhost, true)
  removeEventListener('pointerup', endGhost, true)
  removeEventListener('pointercancel', endGhost, true)
  removeEventListener('keydown', escGhost, true)
}
/** Where the card was taken: its left edge, and the pointer's height in it. A crew moves only up and down its floor,
 * so the ghost keeps the card's column and follows the pointer's height. @type {{ left: number, dy: number }} */
let grab = { left: 0, dy: 0 }
const followGhost = (/** @type {PointerEvent} */ e) => ghost && (ghost.style.translate = `${grab.left}px ${e.clientY - grab.dy}px`)
const escGhost = (/** @type {KeyboardEvent} */ e) => e.key === 'Escape' && endGhost()
floors.addEventListener('pointerdown', (e) => {
  const grip = /** @type {Element} */ (e.target).closest?.('[data-crew-drag]')
  const card = grip?.closest('.crew-group')?.querySelector(':scope > .sess')
  if (!card || e.button !== 0) return
  const r = card.getBoundingClientRect()
  grab = { left: r.left, dy: e.clientY - r.top }
  ghost = Object.assign(document.createElement('div'), { className: 'lobby-ghost' })
  ghost.setAttribute('aria-hidden', 'true')
  ghost.append(/** @type {Element} */ (card.cloneNode(true)))
  ghost.style.width = `${r.width}px`
  document.body.append(ghost)
  followGhost(e)
  addEventListener('pointermove', followGhost, true)
  addEventListener('pointerup', endGhost, true)
  addEventListener('pointercancel', endGhost, true)
  addEventListener('keydown', escGhost, true)
}, true)
