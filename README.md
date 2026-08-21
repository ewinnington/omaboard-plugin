# Omaboard for Omarchy

Quick access to local [Omaboard](https://github.com/ewinnington/omaboard)
whiteboards from the [Omarchy](https://omarchy.org/) bar.

Click the bar icon to see live thumbnails of every board on this machine,
filter by name, jump straight into one, or create a **New board**. The plugin
does not draw, save, or reimplement the canvas. It only reads Omaboard's
gallery and launches the `omaboard` app.

Plugin id: `io.github.ewinnington.omaboard`

## How it integrates

Omaboard 0.2.0 or later owns the boards. This plugin is a thin Omarchy shell
plugin (`bar-widget` + `menu`) that:

1. Reads `~/.local/share/omaboard/index.json` for titles and ids.
2. Shows `~/.local/share/omaboard/thumbs/<id>.png` as previews.
3. Launches `omaboard --open <id>` or `omaboard --new`.

If Omaboard is already running, that second launch is handed off to the
existing window instead of starting another copy. Creating or editing still
happens inside Omaboard; the plugin never writes board JSON.

The bar button is a normal Omarchy bar widget. Install asks **left / center /
right**, the same chooser as clock, weather, and other bar apps. The picker
anchors to that section. Tab / Shift+Tab walks neighboring bar panels.

`omarchy-shell shell toggle io.github.ewinnington.omaboard '{}'` still opens
the same gallery as a summoned overlay (useful for a keybind).

## Requires

- [Omarchy](https://omarchy.org/) Quattro (`omarchy-shell`)
- [Omaboard](https://github.com/ewinnington/omaboard) **0.2.0 or later**, on
  `PATH` or at `~/.local/bin/omaboard`

Install the app first:

```sh
git clone https://github.com/ewinnington/omaboard.git
cd omaboard
./bin/install          # Arch package via makepkg
# or: ./bin/build && cp build/omaboard ~/.local/bin/omaboard
omaboard --version     # expect 0.2.0 or newer
```

Older Omaboard builds have no `--open` / `--new` flags, so the plugin cannot
jump into a board.

## Install

Review this repository, then add and enable it:

```sh
omarchy plugin add https://github.com/ewinnington/omaboard-plugin.git --enable
```

Omarchy will:

1. Warn that plugins run unsandboxed inside `omarchy-shell`.
2. Clone the repo to `~/.config/omarchy/plugins/io.github.ewinnington.omaboard/`.
3. Ask whether to enable it.
4. Ask which bar section to use: **left**, **center**, or **right**.

Left is the default (next to the Omarchy menu).

Trusted, unattended install (skips the section prompt and uses left):

```sh
omarchy plugin add https://github.com/ewinnington/omaboard-plugin.git --enable --yes
```

Move it later:

```sh
omarchy bar move io.github.ewinnington.omaboard --section right
omarchy bar move io.github.ewinnington.omaboard --section center
omarchy bar move io.github.ewinnington.omaboard --section left
```

## Usage

- **Left-click** the bar icon to open or close the picker.
- **Type** to filter by board title.
- **Arrow keys** move the cursor; **Enter** opens the highlighted item.
- **New board** runs `omaboard --new`.
- A board tile runs `omaboard --open <id>`.
- **Escape** clears the filter, or closes the picker if the filter is empty.
- **Tab** / **Shift+Tab** switches to the next/previous bar panel.

Summon without clicking the bar:

```sh
omarchy-shell shell toggle io.github.ewinnington.omaboard '{}'
```

Optional Hyprland bind in `~/.config/hypr/bindings.lua`. Check
`omarchy menu keybindings --print` first; unbind the combo if it is already
taken:

```lua
o.bind("SUPER + SHIFT + B", "Omaboard", "omarchy-shell shell toggle io.github.ewinnington.omaboard '{}'")
```

## Update

```sh
omarchy plugin update io.github.ewinnington.omaboard
```

Omarchy shows a diff and fast-forwards the git checkout. After updating
Omaboard itself, confirm `omaboard --version` is still 0.2.0 or newer.

## Remove

```sh
omarchy plugin remove io.github.ewinnington.omaboard
```

That only removes the plugin. Boards in `~/.local/share/omaboard` are left
alone.

## Validate from source

```sh
omarchy plugin validate .
qmllint -I "$OMARCHY_PATH/shell" Menu.qml BarWidget.qml Panel.qml BoardGallery.qml
```

## Layout

| File | Role |
| --- | --- |
| `manifest.json` | Plugin id, `bar-widget` + `menu` kinds, default section `left` |
| `BarWidget.qml` | Bar icon; loads the anchored picker |
| `Panel.qml` | Keyboard panel attached to the bar section you chose |
| `Menu.qml` | Fullscreen overlay used by `omarchy-shell shell summon/toggle` |
| `BoardGallery.qml` | Shared thumbnail grid, filter, and `omaboard` launch |
| `BoardsModel.js` | Parses Omaboard's `index.json` |

## Security

This plugin runs unsandboxed inside the long-lived `omarchy-shell` process
when enabled. Review the source before installing.

- **Reads** `~/.local/share/omaboard/index.json` and
  `~/.local/share/omaboard/thumbs/*.png`.
- **Executes** `omaboard` (or `~/.local/bin/omaboard`) with `--new` or
  `--open <id>`. Board ids with path separators are rejected.
- **Does not** use the network, sudo, install hooks, or write Omaboard data.
- **Does not** change Hyprland config, `shell.json` layout beyond the normal
  `omarchy plugin enable` bar placement, or other plugins.

## License

MIT. See [LICENSE](LICENSE).
