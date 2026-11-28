# Changelog

What changed in each release of Lobby, newest first. Versions follow `VERSION` and are tagged `v<version>`; each
tag's message carries its section below. Before 1.0, a minor version adds something you can see or set, and a patch
fixes or polishes what is there.

## [Unreleased]

## [0.5.0] - 2026-11-28

### Changed
- Lobby now runs the tower's v2.20.0 page, so it needs a tower at API 2.44 or newer within 2.x. On an older tower the
  tower refuses it and `tower extensions` says why; Lobby 0.4.0 still runs there.
- New from that page: drag the sidebar's edge to make it wider or narrower (double-click it for its usual width), and
  drag the line above the shells to change their height. Each viewer's sizes are kept.
- The settings, the rate limits and the new-shell picker open as the tower's own popovers, styled as Lobby's
  menu-bar popovers were, with the Inbox setting where it was.

## [0.4.0] - 2026-11-27

### Changed
- A tower update no longer changes or breaks Lobby. Lobby now carries the tower's page it was checked with (the
  tower's v2.19.0 page, in `page/`) instead of copying whichever page your tower has, so everyone runs the same page,
  on any tower from v2.19.0 (API 2.41) within 2.x. Upstream's newest page changes reach Lobby with its next release,
  once the nightly check has passed on them.
- Lobby needs a tower at API 2.41 or newer within 2.x. On an older tower, or a new major, the tower refuses it and
  `tower extensions` says why, instead of serving a page that could break. Lobby 0.3.7 still runs on older towers.
- `./sync.sh` no longer needs a running tower, and leaves `out/` as it was when a build fails.

## [0.3.7] - 2026-11-27

### Fixed
- On the tower from v2.18.0, whose sidebar opens Stats and extensions' views from a row of entries above the floors,
  the page draws again: Lobby used to take that row out, and the page, which now fills it, stopped before drawing the
  floors. The row stays, hidden; the brand's chart opens the tower's Stats in the main pane, lit while they show, and
  a second press closes them; the grid icon opens the row's other entries, such as the Learning center.
- The tower's own "Waiting on you" section, new in v2.18.0, gives way to Lobby's inbox while the inbox shows, so the
  waits aren't listed twice. Older towers get the same Lobby as before.

## [0.3.6] - 2026-11-26

### Fixed
- A worker's terminal no longer cuts off the last letter at its right edge: Lobby's slightly tighter letter spacing
  no longer reaches the terminal, so each line fits the pane it is drawn in.

## [0.3.5] - 2026-11-25

### Fixed
- A worker's ⋯ is no longer hidden under Resume and Let go: while a card that can be resumed is pointed at, the ⋯ is
  the floating toolbar's last button, past a hairline, so its menu is one click away again.
- The ⋯ on a worker's card shows only while the card is pointed at or focused (or its menu is open), as a quiet glyph
  that no longer makes the card's name row taller.

## [0.3.4] - 2026-11-24

### Fixed
- On the tower from v2.17.0 (API 2.31), which puts its page's CSS in cascade layers: a floor's name sits on the
  sidebar again instead of a white box, each worker's new ⋯ is a quiet glyph rather than a framed button, and the
  status words on the workers' cards keep their colours. Older towers get the same Lobby as before.

## [0.3.3] - 2026-11-20

### Fixed
- An extension's sidebar tab, such as the Artifacts gallery's, shows again: as a grid icon in the brand, next to
  Stats, lit while its view is open, and pressed again to close it. It used to land, hidden, in the Stats pane's
  header. With more than one such tab, the icon opens a menu of them.

## [0.3.2] - 2026-11-19

### Fixed
- In a crew, a hire working on another floor hangs from the trunk like the others: its elbow turns into the chip's
  middle, and the trunk no longer jogs sideways past it.

## [0.3.1] - 2026-11-19

### Fixed
- On the tower from v2.14.0-12 (API 2.20): a floor's draft and + buttons show only on hover again, a folded floor's
  + holds the right edge again, and the floor keeps one ⋯, Lobby's, where the page now draws its own beside it. A
  right-click on a floor's name opens Lobby's menu alone.
- Closing a floor's menu with Esc or Tab no longer throws a page error on the newer tower.

## [0.3.0] - 2026-11-18

### Changed
- Lobby installs as a tower extension: `extensions.lobby.path` in the config, pointing at the clone, in place of
  `renderers.lobby` with the path of `out/`. It needs a tower from 2.13, and `./sync.sh` still builds the page.

### Fixed
- A hire's callsign in a crew stays on one line (`ODIN-18`, not `ODIN-` over `18`); the floor and status beside it
  ellipsize instead.

## [0.2.4] - 2026-11-18

### Changed
- The tower's new Extensions entry, apart from the rate limits now, sits in Lobby's foot as one quiet line above
  "Config and renderers": its lamp under the fold's ›, one hairline over both, nothing pushed apart when the floors
  are few.
- The Extensions view drops its grey box: each extension is a card on the pane, like the workers, with the colour
  bar kept for the ones that need a look.

## [0.2.3] - 2026-11-17

### Fixed
- After a tower update and `./sync.sh`, Tower.app loads the new page on a reload. It used to keep the page it had
  already loaded, so it could show the inbox and no floors until it was quit and opened again.

## [0.2.2] - 2026-11-17

### Changed
- A floor's ⋯ menu no longer offers Messages: the tower no longer has Comms, so the item could never show.

### Fixed
- A card that grew for its subagents shrinks back quickly once they end: an ended subagent dims and stays a
  moment, then its row folds away in under half a second instead of crawling shut over two.

## [0.2.1] - 2026-11-17

### Changed
- The glance row (the counts and the usage chip) keeps to one line. Short of room, the chips' words go one at a time,
  quiet first and "waiting" last, leaving each dot and number; a chip's tip still names it.
- The waits' pill says "waiting" rather than "waiting on you".

### Fixed
- The inbox head's chevron sits level with its title, folded or open.

## [0.2.0] - 2026-11-17

### Added
- The inbox keeps to about four rows and scrolls the rest, so the floors keep their room. Its head folds it to its
  count.
- **Inbox: Open, Folded or Off** in Settings. Off gives the count back to the glance row's pill.
- `renderers.lobby.settings.inbox` in the config (`"open"`, `"folded"` or `"off"`) sets the default until a viewer
  picks in Settings.

### Fixed
- The floor menu opens on a tower whose board carries no messages (#1, thanks @RegiByte).

## [0.1.0] - 2026-11-17

### Added
- Lobby: a calm, macOS-style page for the tower. The "Waiting on you" inbox, quiet floors, one ⋯ menu per floor, a
  cleaner worker header, stats in the main pane, GitHub-style diffs and a graphite terminal.
- Lobby's version at the foot of the sidebar, which copies a line for a bug report.
- The MIT license.

[Unreleased]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.3.7...v0.4.0
[0.3.7]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.3.6...v0.3.7
[0.3.6]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/fliptaboada/tower-renderer-lobby/releases/tag/v0.1.0
