function dataRoot(home, xdgDataHome) {
  var xdg = String(xdgDataHome || "")
  if (xdg)
    return xdg.replace(/\/$/, "") + "/omaboard"
  return String(home || "") + "/.local/share/omaboard"
}

function indexPath(root) {
  return String(root || "") + "/index.json"
}

function thumbPath(root, id) {
  return String(root || "") + "/thumbs/" + String(id || "") + ".png"
}

function parseIndex(raw) {
  var out = []
  try {
    var data = JSON.parse(raw || "{}")
    var boards = data && data.boards ? data.boards : []
    for (var i = 0; i < boards.length; i++) {
      var board = boards[i]
      if (!board || !board.id)
        continue
      var id = String(board.id)
      if (!id || id.indexOf("/") !== -1 || id.indexOf("\\") !== -1)
        continue
      out.push({
        id: id,
        title: String(board.title || "Whiteboard"),
        modified: String(board.modified || ""),
        created: String(board.created || "")
      })
    }
  } catch (e) {
    return []
  }
  return out
}

function filterBoards(boards, query) {
  var q = String(query || "").trim().toLowerCase()
  if (!q)
    return boards ? boards.slice() : []
  var out = []
  var list = boards || []
  for (var i = 0; i < list.length; i++) {
    var title = String(list[i].title || "").toLowerCase()
    if (title.indexOf(q) !== -1)
      out.push(list[i])
  }
  return out
}

function showNewBoard(query) {
  var q = String(query || "").trim().toLowerCase()
  if (!q)
    return true
  return "new board".indexOf(q) !== -1
}

function relativeTime(iso, nowMs) {
  if (!iso)
    return "Unknown"
  var then = Date.parse(iso)
  if (!isFinite(then))
    return "Unknown"
  var now = isFinite(nowMs) ? nowMs : Date.now()
  var seconds = Math.floor((now - then) / 1000)
  if (seconds < 45)
    return "Just now"
  if (seconds < 3600)
    return Math.max(1, Math.floor(seconds / 60)) + " min ago"
  if (seconds < 86400)
    return Math.floor(seconds / 3600) + " hr ago"
  if (seconds < 86400 * 7)
    return Math.floor(seconds / 86400) + " days ago"
  var date = new Date(then)
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear()
}

function thumbUrl(fileUrlFn, root, id, modified) {
  var path = thumbPath(root, id)
  var url = typeof fileUrlFn === "function" ? fileUrlFn(path) : ("file://" + path)
  var stamp = Date.parse(modified)
  if (!isFinite(stamp))
    stamp = Date.now()
  return url + "?t=" + stamp
}
