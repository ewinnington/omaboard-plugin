import QtQuick
import qs.Ui

BarWidget {
  id: root
  moduleName: "io.github.ewinnington.omaboard"

  readonly property bool opened: panelItem ? panelItem.opened === true : false
  readonly property bool popoutSwitchClosing: panelItem ? panelItem.popoutSwitchClosing === true : false

  property var panelItem: null

  function open() {
    if (panelItem)
      panelItem.open()
  }

  function close() {
    if (panelItem)
      panelItem.close()
  }

  function toggle() {
    if (panelItem)
      panelItem.toggle()
  }

  function closeForPopoutSwitch() {
    if (panelItem)
      panelItem.closeForPopoutSwitch()
  }

  function injectPanel() {
    var target = panelLoader.item
    if (!target)
      return
    panelItem = target
    if ("bar" in target)
      target.bar = root.bar
    if ("settings" in target)
      target.settings = root.settings
    if ("anchorItem" in target)
      target.anchorItem = button
    if ("hostWidget" in target)
      target.hostWidget = root
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  onBarChanged: injectPanel()
  onSettingsChanged: injectPanel()

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "\uf303"
    tooltipText: "Omaboard"
    onPressed: function(buttonCode) {
      if (buttonCode === Qt.LeftButton)
        root.toggle()
    }
  }
}
