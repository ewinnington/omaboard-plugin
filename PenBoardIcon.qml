import QtQuick

// Pen-on-whiteboard mark for a ~16px Omarchy bar slot.
// Rectangles only: Qt Shape strokes often vanish at this size.
Item {
  id: root

  property color color: "#eeeeee"

  anchors.fill: parent

  // Whiteboard
  Rectangle {
    id: board
    anchors.fill: parent
    anchors.margins: Math.max(1, root.width * 0.08)
    radius: Math.max(1.5, width * 0.14)
    color: "transparent"
    border.width: Math.max(1.6, width * 0.12)
    border.color: root.color
  }

  // Pen barrel
  Rectangle {
    id: barrel
    width: Math.max(2, root.width * 0.16)
    height: root.height * 0.62
    radius: width / 2
    color: root.color
    rotation: -40
    anchors.centerIn: parent
    anchors.horizontalCenterOffset: root.width * 0.04
    anchors.verticalCenterOffset: -root.height * 0.04
  }

  // Pen nib
  Rectangle {
    width: Math.max(3.5, root.width * 0.22)
    height: width
    radius: 0.6
    color: root.color
    rotation: 50
    x: root.width * 0.16
    y: root.height * 0.58
  }
}
