import QtQuick
import qs.Commons
import qs.Ui

Panel {
  id: root
  moduleName: "io.github.ewinnington.omaboard"
  ipcTarget: "io.github.ewinnington.omaboard"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root
  readonly property color contentForeground: bar ? bar.barForeground : Color.popups.text
  readonly property string contentFontFamily: bar ? bar.fontFamily : Style.font.family

  function open() {
    gallery.prepare()
    root.controller.show()
    Qt.callLater(function() {
      if (keyCatcher)
        keyCatcher.forceActiveFocus()
    })
  }

  function close() {
    root.controller.hide()
  }

  function switchPanel(direction) {
    if (root.bar && typeof root.bar.switchPanelFrom === "function")
      return root.bar.switchPanelFrom(root.barIdentity, direction)
    return false
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(gallery.implicitWidth)
    contentHeight: panel.fittedContentHeight(gallery.implicitHeight)

    Item {
      id: keyCatcher
      anchors.fill: parent
      focus: true
      Keys.priority: Keys.BeforeItem
      Keys.onPressed: function(event) {
        if (event.key === Qt.Key_Tab || event.key === Qt.Key_Backtab) {
          root.switchPanel((event.modifiers & Qt.ShiftModifier) || event.key === Qt.Key_Backtab ? -1 : 1)
          event.accepted = true
          return
        }
        if (!gallery.handleKey(event) && event.key === Qt.Key_Escape)
          root.close()
      }

      BoardGallery {
        id: gallery
        anchors.fill: parent
        opened: root.opened
        foreground: root.contentForeground
        selectedText: Color.accent
        selectedBackground: Util.alpha(root.contentForeground, 0.08)
        fontFamily: root.contentFontFamily
        onActivated: root.close()
      }
    }
  }
}
