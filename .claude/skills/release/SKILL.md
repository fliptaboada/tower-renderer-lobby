---
name: release
description: Ship a change to Lobby, or cut a release of it. Use when asked to release, bump the version, tag, write the changelog, "commit, PR and merge", or "pull and sync" the local copy. Covers checking a change in headless Chrome, the changelog entry, the version bump, the PR, the annotated tag with its notes, and rebuilding the main checkout's out/.
---

# Releasing Lobby

Lobby is `lobby.js` and `lobby.css` over a copy of the tower's page, built into `out/` by `sync.sh`. A release is a
number in `VERSION`, a section in `CHANGELOG.md`, a merge on `main` and an annotated tag `v<version>` whose message is
that section. The steps run in this order; skip the ones the user didn't ask for, and say which you skipped.

## 1. Check the change in the browser

The running tower serves Lobby from the main checkout's `out/`, which is not your branch. Check your files without
touching the config or the user's checkout: `check.mjs` (beside this file) opens `/r/lobby/` in headless Chrome,
answers its `lobby.js` and `lobby.css` with yours, and reports errors.

```sh
node .claude/skills/release/check.mjs . <out dir> [window widths…]      # e.g. 1280 1920 2560
```

It prints the page's console errors and saves `sidebar-<width>.png` per width into `<out dir>` (use the scratchpad).
Read the screenshots. A fresh headless profile starts with empty `tower.store`, so the viewer's choices are the
defaults; set one with `window.tower.store.set(...)` in the script when a case needs it.

- Size the sidebar by the window, never by styling `.side`: the page sets its width from the window
  (`clamp(min(20rem, 38vw), 22vw, 28rem)`), and a `.side` widened by hand gets covered by the main pane.
- Below about 840px the sidebar folds to its rail; nothing narrower than 320px is a real case.
- Show the screenshots that back what you report (`tower show`), and remove ones that turned out misleading.

## 2. Write the changelog entry

Under `## [Unreleased]` in `CHANGELOG.md`, while the change is made, in the user's words for what they see:
`### Added` for something new to see or set, `### Changed` for something that behaves differently, `### Fixed` for
a bug or a misalignment. Name a contributor's PR and handle: `(#1, thanks @name)`. Say what a user notices, not which
function changed.

## 3. Bump the version

Before 1.0: **minor** (`0.2.0` → `0.3.0`) when the release adds something to see or set (a feature, a setting, a
config key); **patch** (`0.2.0` → `0.2.1`) for fixes and polish. Change all three:

- `VERSION`: the number alone.
- `README.md`: the example in "Which version you run" (`**Lobby 0.2.1**`).
- `CHANGELOG.md`: rename `## [Unreleased]` to `## [<version>] - <YYYY-MM-DD>`, put a fresh empty `## [Unreleased]`
  above it, and update the compare links at the foot (`[Unreleased]` from the new tag; the new version from the
  previous tag).

The bump can ride in the same PR as the change, as its own commit (`Lobby <version>`), when the user asks for both.

## 4. Commit, PR, merge

- Branch from `origin/main` (`git fetch` first): the worktree's branch may already be merged.
- Commit only what you mean to ship; never `out/` (ignored) or screenshots.
- `gh pr create --base main`: what changes, then what you checked and at which widths. End with the attribution line.
- Merge (`gh pr merge --merge`) only when the user said to. Then `git fetch` and confirm `origin/main:VERSION`.

## 5. Tag, with the notes

The tag goes on the merge commit on `origin/main`, annotated, its message the title line `Lobby <version>`, a blank
line, then the version's changelog section without its heading:

```sh
v=$(git show origin/main:VERSION | tr -d '[:space:]')
{ printf 'Lobby %s\n\n' "$v"; git show origin/main:CHANGELOG.md | sed -n "/^## \[$v\]/,/^## \[/{/^## \[/d;/^\[/d;p;}"; } > "$TMPDIR/notes-$v"
cat "$TMPDIR/notes-$v"                      # read it before tagging
git tag -a "v$v" -F "$TMPDIR/notes-$v" origin/main --cleanup=whitespace
git push origin "v$v"
git tag -l -n99 "v$v"                       # what the tag says
```

The sed prints from the version's heading to the next one, dropping the headings and the compare links at the foot.
Keep a dollar sign followed by a digit out of this file: Claude Code reads one in a skill as a placeholder for the
skill's arguments and swaps in a word of the request when the skill is started with any, code blocks included.

`--cleanup=whitespace` trims the blank lines around the notes and keeps the `### Added` lines, which git's default
cleanup would drop as comments. Tags are published: never move or re-push one that is out unless the user asks.

## 6. Update the user's local copy

Only when the user asks ("pull and sync"). The main checkout is theirs: look before touching it.

```sh
cd <main checkout>
git status --short --branch                 # clean and on main, or stop and ask
git pull --ff-only
./sync.sh
grep -o 'lobby-version"[^>]*' out/index.html  # the new version and the merge's commit
```

Tell them to reload the page, and what the sidebar's foot should now say (`Lobby <version>`).
