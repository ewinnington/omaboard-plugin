# Omaboard plugin — security review and hardening

**Plugin:** `io.github.ewinnington.omaboard` 1.1.3
**Companion app:** [omaboard](https://github.com/ewinnington/omaboard) 0.2.3
**Marketplace:** [HANCORE-linux/omarchy-plugin-marketplace#1255](https://github.com/HANCORE-linux/omarchy-plugin-marketplace/issues/1255)
**Reviewed tree:** plugin 1.1.3 on `master` (this document); app `db77f1bba6fd93444f0aeaf66f4d8c1118d97355`
**Date:** 2026-08-22

This is a source review of the Omarchy bar/menu plugin and the local app whose
data it reads. It is not a marketplace certification, sandbox proof, or
guarantee. Community plugins run unsandboxed inside `omarchy-shell`.

## 1. Threat model

The plugin is a thin gallery: it reads Omaboard’s on-disk index, shows
thumbnails, and launches the app. It does not write boards.

| Asset | Trust |
| --- | --- |
| Plugin QML/JS in this repository | Trusted after the user installs it |
| `omarchy-shell` process | Shared with every other enabled plugin |
| `~/.local/share/omaboard/index.json` and `thumbs/*.png` | **Untrusted** metadata. Same uid as the user, but treated as hostile so a corrupt or markup-shaped index cannot abuse the shell |
| `HOME` / `XDG_DATA_HOME` | Environment. Must be absolute paths with no `..` |
| `omaboard` binary | Executed only from an allowlisted absolute path |

Assumed attacker: anything that can shape `index.json` (buggy write, copied
tree, confused backup restore) plus IPC `shell toggle` payloads. Not in
scope: a fully compromised user account rewriting `~/.local/bin/omaboard`.

## 2. Marketplace findings

Exact-commit comments on #1255 and the follow-up review:

| Finding | Commit cited | Status |
| --- | --- | --- |
| Board titles from `index.json` rendered with default `Text.AutoText`, allowing markup-shaped metadata to load rich-text resources in the shell | `f6ebd61` | Fixed. Titles sanitized; every `Text` sink sets `textFormat: Text.PlainText` |
| `FileView` loaded the whole index with no size or row ceiling | `997f164` | Fixed. `FileView` only watches; content is `/usr/bin/head -c` (1 MiB) then `JSON.parse`; at most 256 boards |

Pinned app install remains a fail-closed clone of a 40-character SHA in detached HEAD (see README). That still produces the baseline `remote-build` capability.

## 3. Hardening controls

### 3.1 Injection (rich text / UI)

- `BoardsModel.sanitizeTitle` strips HTML comments and tags, dangling `<…`,
  C0/C1 controls, bidi/zero-width characters, leftover `<>`, then truncates
  to 120 characters.
- Filter text is sanitized the same way (120 char cap) before it is shown.
- `BoardGallery.qml` sets `textFormat: Text.PlainText` on every `Text` item
  (titles, relative time, filter header, empty states).
- The companion app sanitizes titles on load/save/rename so `index.json` is
  clean even for older plugins. See [omaboard `docs/security-review.md`](https://github.com/ewinnington/omaboard/blob/master/docs/security-review.md).

### 3.2 Command execution

The plugin never searches `PATH` and never runs `omaboard --version`.

Allowlisted binaries (after `/usr/bin/test -x`):

- `/usr/bin/omaboard`
- `/usr/local/bin/omaboard`
- `$HOME/.local/bin/omaboard` only when `HOME` is a safe absolute path

Launch is `Quickshell.execDetached([absolutePath, "--new"])` or
`[..., "--open", uuid]`. Board ids must match
`[0-9a-f]{8}-…-{12}` (case-insensitive). Bare `"omaboard"` is rejected.

Index reads use `/usr/bin/head` (not `PATH` `head`). The process is not
started if the index path is empty (`head -- ""` would otherwise read stdin).

### 3.3 Availability / parsing bounds

| Bound | Value | Where |
| --- | --- | --- |
| Index bytes before parse | 1 MiB (`head -c` + length check) | `BoardGallery.qml`, `parseIndex` |
| Accepted boards | 256 | `parseIndex`, display model |
| Title / filter | 120 chars | `sanitizeTitle`, `sanitizeFilter` |
| Timestamp fields | 40 chars | `parseIndex`, `relativeTime` |
| Summon payload JSON | 4 KiB | `Menu.qml` `open()` |
| Font family from IPC | `[A-Za-z0-9 _-]{1,64}` | `Menu.qml` |

`parseIndex` requires `boards` to be a JSON array and skips array/non-object
entries. Oversized input returns `[]` rather than parsing.

`FileView` uses `preload: false` and does not call `reload()`; it only
watches for changes, then re-runs the bounded `head`.

### 3.4 Paths and thumbs

- `HOME` / `XDG_DATA_HOME` must be absolute, ≤ 4096 chars, no NUL, no `.` /
  `..` segments. Otherwise `dataRoot` is empty and no index is read.
- Thumb URLs must be `file://` (not a bare `file:`), must not contain `..`,
  and must equal the reconstructed URL for
  `$dataRoot/thumbs/<uuid>.png`.
- `Image.source` is set only when the string starts with `file://`.
  `sourceSize` is the tile size so a huge PNG is not decoded at full
  resolution in the shell.

### 3.5 What this plugin does not do

No network, no `sudo`/`pkexec`, no install hooks, no writes under
`~/.local/share/omaboard`, no Hyprland or `shell.json` edits beyond normal
`omarchy plugin enable` bar placement.

## 4. Theme checklist

| Theme | Result |
| --- | --- |
| Markup / AutoText | Sanitized + `PlainText` |
| Command injection | Argv only; absolute `/usr/bin/head` and `/usr/bin/test` |
| PATH hijack | Binary allowlist; no `which`, no `omaboard` on PATH |
| Path traversal | UUID ids; absolute data root; exact thumb URL match |
| JSON bombs | 1 MiB + 256 rows + array check |
| Symlinks on thumbs | Tile `sourceSize`; app refuses symlink thumbs on write |
| Process stdout flood | No `--version`; `head -c` is the only reader |
| IPC (`shell toggle`) | Bounded JSON; font names filtered |
| Privilege / network | None |

## 5. Tests

```sh
node tests/boards-model.test.js
```

Covers: markup strip, path-shaped ids, oversized index, non-array `boards`,
board cap, filter cap, relative `HOME` rejected, empty `HOME` rejected, bare
`"omaboard"` rejected, `/tmp/evil` rejected, `/usr/bin/omaboard` and
`~/.local/bin/omaboard` accepted.

App tests (`omaboard/bin/test`) cover sanitizer, UUID `--open`, index
traversal, symlink delete/save, and JSON id vs filename mismatch.

## 6. Residual risk

- A user who can replace an allowlisted `omaboard` binary can run that
  binary. That is the same uid as the shell.
- Qt image decoders may still parse a hostile PNG; `sourceSize` bounds
  raster size, not every decoder bug.
- Rapid `index.json` rewrites can spawn many `head` processes. Each read is
  still capped at 1 MiB.
- Same-uid processes can still send Omaboard’s local socket (`new`/`open`).
  That is the app, not this plugin.

## 7. Re-review

When changing `BoardGallery.qml`, `BoardsModel.js`, or `Menu.qml`, re-check:

1. No `Text` without `textFormat: Text.PlainText`.
2. No `PATH` lookup and no shell (`bash`, `sh -c`).
3. Index is never `FileView.text()` / unbounded `JSON.parse`.
4. `execDetached` arguments are an allowlisted path plus `--new` or
   `--open` and a UUID.
5. `node tests/boards-model.test.js` still passes.
