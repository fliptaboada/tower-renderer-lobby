# Changelog

What changed in each release of Lobby, newest first. Versions follow `VERSION` and are tagged `v<version>`; each
tag's message carries its section below. Before 1.0, a minor version adds something you can see or set, and a patch
fixes or polishes what is there.

## [Unreleased]

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

[Unreleased]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.2.3...HEAD
[0.2.3]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/fliptaboada/tower-renderer-lobby/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/fliptaboada/tower-renderer-lobby/releases/tag/v0.1.0
