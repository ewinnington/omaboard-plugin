# Omaboard menu

An Omarchy Quattro **menu** plugin that shows a live preview of local
[Omaboard](https://github.com/ewinnington/omaboard) whiteboards and jumps
straight into one. It also has a **New board** action.

This plugin does not reimplement the canvas. It reads Omaboard's gallery index
and launches the `omaboard` app.

It is a bar widget with a summoned menu, like clock or timezones: install
asks **left / center / right**, and the board picker anchors to that bar
section.

## Requires

- Omarchy Quattro (`omarchy-shell`)
- [Omaboard](https://github.com/ewinnington/omaboard) **0.2.0 or later**
  (`omaboard --new` and `omaboard --open <id>`)

Boards stay in `~/.local/share/omaboard`. This plugin only reads `index.json`
and thumbnail PNGs.

## Install

Review the repository, then add and enable it:

```sh
omarchy plugin add https://github.com/ewinnington/omaboard-plugin.git --enable
```

Omarchy will ask which bar section to use — **left**, **center**, or **right** —
the same chooser as other bar apps. Left is the default (next to the Omarchy
menu).

For an unattended install from a repository you already trust (skips the
section prompt and uses left):

```sh
omarchy plugin add https://github.com/ewinnington/omaboard-plugin.git --enable --yes
```

Move it later with:

```sh
omarchy bar move io.github.ewinnington.omaboard --section right
```

Summon the overlay menu with:

```sh
omarchy-shell shell toggle io.github.ewinnington.omaboard '{}'
```

## Usage

- Click the bar icon, or run the toggle command above.
- Type to filter by board title.
- Arrow keys move the cursor; Enter opens the highlighted item.
- **New board** creates a board in Omaboard and opens it.
- A board tile opens that board in the running Omaboard window (or starts one).
- Escape closes the menu.

Optional Hyprland bind in `~/.config/hypr/bindings.lua`:

```lua
o.bind("SUPER + SHIFT + B", "Omaboard", "omarchy-shell shell toggle io.github.ewinnington.omaboard '{}'")
```

## Update

```sh
omarchy plugin update io.github.ewinnington.omaboard
```

## Remove

```sh
omarchy plugin remove io.github.ewinnington.omaboard
```

## Validate from source

```sh
omarchy plugin validate .
qmllint -I "$OMARCHY_PATH/shell" Menu.qml BarWidget.qml Panel.qml BoardGallery.qml
```

## Security

This plugin runs unsandboxed inside `omarchy-shell` when enabled.

- Reads `~/.local/share/omaboard/index.json` and `~/.local/share/omaboard/thumbs/*.png`.
- Executes `omaboard` (or `~/.local/bin/omaboard`) with `--new` or `--open <id>`.
- Does not use the network, sudo, or install hooks.
