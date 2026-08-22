import Quickshell
import Quickshell.Io
import QtQuick
import qs.Commons
import qs.Ui
import "BoardsModel.js" as BoardsModel

Item {
  id: root

  property bool opened: false
  property color foreground: Color.foreground
  property color selectedText: Color.accent
  property color selectedBackground: Util.alpha(Color.foreground, 0.08)
  property string fontFamily: Style.font.family
  property int cornerRadius: Style.cornerRadius
  property int columns: 3
  property int tileWidth: Style.space(188)
  property int thumbHeight: Style.space(112)
  property int tileGap: Style.space(10)
  readonly property int tileHeight: thumbHeight + Style.space(48)
  readonly property int headerHeight: Math.max(Style.space(34), Style.font.title + Style.spacing.controlPaddingY * 2)
  readonly property int contentSpacing: Style.spacing.md
  readonly property int gridHeight: {
    var rows = Math.max(1, Math.ceil(Math.max(displayModel.count, 1) / columns))
    return rows * tileHeight + Math.max(0, rows - 1) * tileGap
  }

  property string filterText: ""
  property int selectedIndex: 0
  property bool cursorActive: false
  property var boards: []
  property string omaboardPath: ""
  property bool omaboardAvailable: false

  readonly property string home: Quickshell.env("HOME")
  readonly property string dataRoot: BoardsModel.dataRoot(home, Quickshell.env("XDG_DATA_HOME"))
  readonly property string indexFilePath: BoardsModel.indexPath(dataRoot)

  implicitWidth: columns * (tileWidth + tileGap)
  implicitHeight: headerHeight + contentSpacing + gridHeight

  signal activated()

  function prepare() {
    root.filterText = ""
    root.selectedIndex = 0
    root.cursorActive = true
    root.disarmPointer()
    whichProc.running = true
    root.readIndexBounded()
    root.rebuildDisplay()
  }

  function readIndexBounded() {
    if (indexReader.running)
      indexReader.running = false
    indexReader.running = true
  }

  function disarmPointer() {
    pointerGate.reset()
  }

  function loadBoards(raw) {
    root.boards = BoardsModel.parseIndex(raw)
    if (root.opened)
      root.rebuildDisplay()
  }

  function rebuildDisplay() {
    displayModel.clear()
    if (!root.omaboardAvailable)
      return

    if (BoardsModel.showNewBoard(root.filterText)) {
      displayModel.append({
        kind: "new",
        boardId: "",
        title: "New board",
        modifiedText: "Blank canvas",
        thumbnail: ""
      })
    }

    var matches = BoardsModel.filterBoards(root.boards, root.filterText)
    var limit = Math.min(matches.length, BoardsModel.MAX_BOARDS)
    for (var i = 0; i < limit; i++) {
      var board = matches[i]
      displayModel.append({
        kind: "board",
        boardId: board.id,
        title: BoardsModel.sanitizeTitle(board.title),
        modifiedText: BoardsModel.relativeTime(board.modified),
        thumbnail: BoardsModel.thumbUrl(Util.fileUrl, root.dataRoot, board.id, board.modified)
      })
    }

    if (displayModel.count === 0)
      root.selectedIndex = 0
    else if (root.selectedIndex >= displayModel.count)
      root.selectedIndex = displayModel.count - 1
    else if (root.selectedIndex < 0)
      root.selectedIndex = 0

    Qt.callLater(function() {
      if (displayModel.count > 0)
        resultGrid.positionViewAtIndex(root.selectedIndex, GridView.Contain)
    })
  }

  function select(delta) {
    if (displayModel.count === 0)
      return
    root.disarmPointer()
    if (!root.cursorActive) {
      root.cursorActive = true
      root.selectedIndex = delta < 0 ? displayModel.count - 1 : 0
    } else {
      root.selectedIndex = (root.selectedIndex + delta + displayModel.count) % displayModel.count
    }
    resultGrid.positionViewAtIndex(root.selectedIndex, GridView.Contain)
  }

  function selectRow(delta) {
    if (displayModel.count === 0)
      return
    root.disarmPointer()
    if (!root.cursorActive) {
      root.cursorActive = true
      root.selectedIndex = delta < 0 ? displayModel.count - 1 : 0
      resultGrid.positionViewAtIndex(root.selectedIndex, GridView.Contain)
      return
    }
    var next = root.selectedIndex + delta * root.columns
    if (next < 0)
      next = 0
    if (next >= displayModel.count)
      next = displayModel.count - 1
    root.selectedIndex = next
    resultGrid.positionViewAtIndex(root.selectedIndex, GridView.Contain)
  }

  function setFilter(nextFilter) {
    root.filterText = BoardsModel.sanitizeFilter(nextFilter)
    root.selectedIndex = 0
    root.cursorActive = true
    root.disarmPointer()
    root.rebuildDisplay()
  }

  function selectFromPointer(index, item, mouse) {
    if (!pointerGate.moved(item, mouse))
      return
    root.cursorActive = true
    root.selectedIndex = index
  }

  function activateIndex(index) {
    if (index < 0 || index >= displayModel.count)
      return
    root.launchRow(displayModel.get(index))
  }

  function launchRow(row) {
    if (!row || !root.omaboardAvailable || !BoardsModel.isSafeOmaboardPath(root.omaboardPath, root.home))
      return
    if (row.kind === "new")
      Quickshell.execDetached([root.omaboardPath, "--new"])
    else if (row.kind === "board" && BoardsModel.isSafeBoardId(row.boardId))
      Quickshell.execDetached([root.omaboardPath, "--open", row.boardId])
    else
      return
    root.activated()
  }

  function handleKey(event) {
    if (event.key === Qt.Key_Escape) {
      if (root.filterText) {
        root.setFilter("")
        event.accepted = true
        return true
      }
      return false
    }
    if (Util.editsFilter(event, root.filterText)) {
      root.setFilter(Util.editedFilter(event, root.filterText))
      event.accepted = true
      return true
    }
    if (event.key === Qt.Key_Left) {
      root.select(-1)
      event.accepted = true
      return true
    }
    if (event.key === Qt.Key_Right) {
      root.select(1)
      event.accepted = true
      return true
    }
    if (event.key === Qt.Key_Up) {
      root.selectRow(-1)
      event.accepted = true
      return true
    }
    if (event.key === Qt.Key_Down) {
      root.selectRow(1)
      event.accepted = true
      return true
    }
    if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
      if (root.cursorActive)
        root.activateIndex(root.selectedIndex)
      else if (displayModel.count > 0)
        root.cursorActive = true
      event.accepted = true
      return true
    }
    if (event.text && event.text.length === 1 && event.text.charCodeAt(0) >= 32 && event.text.charCodeAt(0) !== 127 && (event.modifiers === Qt.NoModifier || event.modifiers === Qt.ShiftModifier)) {
      root.setFilter(root.filterText + event.text)
      event.accepted = true
      return true
    }
    return false
  }

  ListModel { id: displayModel }

  PointerMoveGate {
    id: pointerGate
    referenceItem: root
  }

  FileView {
    id: indexWatch
    path: root.indexFilePath
    preload: false
    watchChanges: true
    printErrors: false
    onFileChanged: root.readIndexBounded()
  }

  Process {
    id: indexReader
    command: ["head", "-c", String(BoardsModel.MAX_INDEX_BYTES + 1), "--", root.indexFilePath]
    stdout: StdioCollector {
      id: indexOut
      waitForEnd: true
    }
    onExited: function(exitCode) {
      var raw = String(indexOut.text || "")
      if (exitCode !== 0 || raw.length > BoardsModel.MAX_INDEX_BYTES)
        root.loadBoards("{}")
      else
        root.loadBoards(raw)
    }
  }

  Process {
    id: whichProc
    command: ["which", "omaboard"]
    stdout: StdioCollector {
      id: whichOut
      waitForEnd: true
    }
    onExited: function(exitCode) {
      var found = String(whichOut.text || "").trim()
      if (exitCode === 0 && found.length > 0 && found.length < 512 && found.indexOf("\n") === -1) {
        root.omaboardPath = "omaboard"
        root.omaboardAvailable = true
        if (root.opened)
          root.rebuildDisplay()
        return
      }
      if (root.home) {
        localWhich.running = true
        return
      }
      root.omaboardPath = ""
      root.omaboardAvailable = false
      if (root.opened)
        root.rebuildDisplay()
    }
  }

  Process {
    id: localWhich
    command: ["test", "-x", String(root.home || "") + "/.local/bin/omaboard"]
    onExited: function(exitCode) {
      if (exitCode === 0 && root.home) {
        root.omaboardPath = root.home + "/.local/bin/omaboard"
        root.omaboardAvailable = true
      } else if (root.omaboardPath !== "omaboard") {
        root.omaboardPath = ""
        root.omaboardAvailable = false
      }
      if (root.opened)
        root.rebuildDisplay()
    }
  }

  Component.onCompleted: {
    whichProc.running = true
    root.readIndexBounded()
  }

  Column {
    anchors.fill: parent
    spacing: root.contentSpacing

    Rectangle {
      width: parent.width
      height: root.headerHeight
      radius: root.cornerRadius
      color: "transparent"

      Text {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        text: root.filterText || "Omaboard"
        textFormat: Text.PlainText
        color: root.foreground
        opacity: root.filterText ? 1 : 0.9
        font.family: root.fontFamily
        font.pixelSize: Style.font.heading
        elide: Text.ElideRight
      }
    }

    Item {
      width: parent.width
      height: parent.height - root.headerHeight - root.contentSpacing

      GridView {
        id: resultGrid
        anchors.fill: parent
        model: displayModel
        clip: true
        cellWidth: root.tileWidth + root.tileGap
        cellHeight: root.tileHeight + root.tileGap
        boundsBehavior: Flickable.StopAtBounds
        visible: displayModel.count > 0

        delegate: Item {
          required property int index
          required property string kind
          required property string boardId
          required property string title
          required property string modifiedText
          required property string thumbnail

          readonly property bool hasCursor: root.cursorActive && index === root.selectedIndex
          readonly property bool isNew: kind === "new"

          width: resultGrid.cellWidth
          height: resultGrid.cellHeight

          Rectangle {
            anchors.fill: parent
            anchors.rightMargin: root.tileGap
            anchors.bottomMargin: root.tileGap
            radius: root.cornerRadius
            color: hasCursor ? root.selectedBackground : "transparent"
            border.width: isNew || hasCursor ? Math.max(1, Style.space(1)) : 0
            border.color: hasCursor ? root.selectedText : Color.accent

            Column {
              anchors.fill: parent
              anchors.margins: 1

              Rectangle {
                width: parent.width
                height: root.thumbHeight
                radius: root.cornerRadius
                color: Util.alpha(root.foreground, isNew ? 0.04 : 0.06)
                clip: true

                Image {
                  anchors.fill: parent
                  visible: !isNew && thumbnail.indexOf("file:") === 0
                  source: thumbnail.indexOf("file:") === 0 ? thumbnail : ""
                  fillMode: Image.PreserveAspectCrop
                  asynchronous: true
                  cache: false
                  sourceSize.width: Math.round(width)
                  sourceSize.height: Math.round(height)
                }

                Text {
                  anchors.centerIn: parent
                  visible: isNew
                  text: "+"
                  textFormat: Text.PlainText
                  color: root.selectedText
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.displayLarge
                }
              }

              Item {
                width: parent.width
                height: parent.height - root.thumbHeight

                Column {
                  anchors.left: parent.left
                  anchors.right: parent.right
                  anchors.verticalCenter: parent.verticalCenter
                  anchors.leftMargin: Style.space(8)
                  anchors.rightMargin: Style.space(8)
                  spacing: 1

                  Text {
                    width: parent.width
                    text: title
                    textFormat: Text.PlainText
                    color: hasCursor || isNew ? root.selectedText : root.foreground
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.body
                    font.bold: isNew
                    elide: Text.ElideRight
                  }

                  Text {
                    width: parent.width
                    text: modifiedText
                    textFormat: Text.PlainText
                    color: root.foreground
                    opacity: 0.62
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.caption
                    elide: Text.ElideRight
                  }
                }
              }
            }

            MouseArea {
              anchors.fill: parent
              hoverEnabled: true
              cursorShape: Qt.PointingHandCursor
              onPositionChanged: function(mouse) { root.selectFromPointer(index, this, mouse) }
              onClicked: {
                root.cursorActive = true
                root.selectedIndex = index
                root.activateIndex(index)
              }
            }
          }
        }
      }

      Column {
        anchors.centerIn: parent
        spacing: Style.space(8)
        width: parent.width
        visible: displayModel.count === 0

        Text {
          width: parent.width
          text: root.omaboardAvailable ? "󰈉" : "󰏪"
          textFormat: Text.PlainText
          color: root.selectedText
          opacity: 0.8
          font.family: root.fontFamily
          font.pixelSize: Style.font.displayLarge
          horizontalAlignment: Text.AlignHCenter
        }

        Text {
          width: parent.width
          text: !root.omaboardAvailable
            ? "Omaboard is not installed"
            : (root.filterText ? "No boards match “" + root.filterText + "”" : "No boards yet")
          textFormat: Text.PlainText
          color: root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.title
          horizontalAlignment: Text.AlignHCenter
          wrapMode: Text.WordWrap
        }

        Text {
          width: parent.width
          visible: !root.omaboardAvailable
          text: "Install omaboard 0.2.3 or later, then open this menu again."
          textFormat: Text.PlainText
          color: root.foreground
          opacity: 0.7
          font.family: root.fontFamily
          font.pixelSize: Style.font.body
          horizontalAlignment: Text.AlignHCenter
          wrapMode: Text.WordWrap
        }
      }
    }
  }
}
