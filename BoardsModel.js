var TITLE_MAX = 120
var FILTER_MAX = 120
var MAX_INDEX_BYTES = 262144
var MAX_BOARDS = 256
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
var ASSET = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i

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
  if (!isSafeBoardId(id))
    return ""
  return String(root || "") + "/thumbs/" + String(id) + ".png"
}

function isSafeBoardId(id) {
  return UUID.test(String(id || ""))
}

function isSafeAssetName(name) {
  return ASSET.test(String(name || ""))
}

function stripMarkup(value) {
  var s = String(value || "")
  s = s.replace(/<!--[\s\S]*?-->/g, "")
  s = s.replace(/<[^>]*>/g, "")
  s = s.replace(/<[^>]*$/g, "")
  return s
}

function stripControls(value, allowNewlines) {
  var s = String(value || "")
  var out = ""
  for (var i = 0; i < s.length; i++) {
    var code = s.charCodeAt(i)
    if (code === 0x09) {
      if (allowNewlines)
        out += s.charAt(i)
      continue
    }
    if (code === 0x0A || code === 0x0D) {
      if (allowNewlines)
        out += s.charAt(i)
      continue
    }
    if (code < 0x20 || (code >= 0x7F && code <= 0x9F))
      continue
    if (code === 0x200B || code === 0x200C || code === 0x200D || code === 0x200E || code === 0x200F)
      continue
    if (code >= 0x202A && code <= 0x202E)
      continue
    if (code >= 0x2066 && code <= 0x2069)
      continue
    if (code === 0xFEFF || code === 0xFFF9 || code === 0xFFFA || code === 0xFFFB || code === 0xFFFC)
      continue
    out += s.charAt(i)
  }
  return out
}

function sanitizeTitle(value) {
  var s = stripControls(stripMarkup(value), false)
  s = s.replace(/[<>]/g, "")
  s = s.replace(/\s+/g, " ").trim()
  if (s.length > TITLE_MAX)
    s = s.slice(0, TITLE_MAX)
  return s || "Whiteboard"
}

function parseIndex(raw) {
  var text = String(raw || "")
  if (text.length > MAX_INDEX_BYTES)
    return []
  var out = []
  try {
    var data = JSON.parse(text || "{}")
    var boards = data && Array.isArray(data.boards) ? data.boards : []
    for (var i = 0; i < boards.length; i++) {
      if (out.length >= MAX_BOARDS)
        break
      var board = boards[i]
      if (!board || typeof board !== "object" || !board.id)
        continue
      var id = String(board.id)
      if (!isSafeBoardId(id))
        continue
      out.push({
        id: id,
        title: sanitizeTitle(board.title),
        modified: String(board.modified || ""),
        created: String(board.created || "")
      })
    }
  } catch (e) {
    return []
  }
  return out
}

function sanitizeFilter(value) {
  var s = stripControls(String(value || ""), false)
  s = s.replace(/[<>]/g, "")
  if (s.length > FILTER_MAX)
    s = s.slice(0, FILTER_MAX)
  return s
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
  if (!isSafeBoardId(id))
    return ""
  var path = thumbPath(root, id)
  if (!path)
    return ""
  var url = typeof fileUrlFn === "function" ? fileUrlFn(path) : ("file://" + path)
  url = String(url || "")
  if (url.indexOf("file:") !== 0)
    return ""
  var stamp = Date.parse(modified)
  if (!isFinite(stamp))
    stamp = Date.now()
  return url + "?t=" + stamp
}
