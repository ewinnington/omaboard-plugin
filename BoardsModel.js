var TITLE_MAX = 120
var FILTER_MAX = 120
var MAX_INDEX_BYTES = 1048576
var MAX_BOARDS = 256
var MAX_TIME_CHARS = 40
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
var ASSET = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i

function isSafeAbsPath(path) {
  var p = String(path || "")
  if (!p || p.charAt(0) !== "/" || p.length > 4096)
    return false
  if (p.indexOf("\0") !== -1)
    return false
  var parts = p.split("/")
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] === "." || parts[i] === "..")
      return false
  }
  return true
}

function dataRoot(home, xdgDataHome) {
  var xdg = String(xdgDataHome || "")
  if (xdg && isSafeAbsPath(xdg))
    return xdg.replace(/\/$/, "") + "/omaboard"
  var h = String(home || "")
  if (isSafeAbsPath(h))
    return h + "/.local/share/omaboard"
  return ""
}

function indexPath(root) {
  if (!isSafeAbsPath(root))
    return ""
  return root + "/index.json"
}

function thumbPath(root, id) {
  if (!isSafeAbsPath(root) || !isSafeBoardId(id))
    return ""
  return root + "/thumbs/" + String(id) + ".png"
}

function isSafeBoardId(id) {
  return UUID.test(String(id || ""))
}

function isSafeAssetName(name) {
  return ASSET.test(String(name || ""))
}

function allowedOmaboardPaths(home) {
  var out = ["/usr/bin/omaboard", "/usr/local/bin/omaboard"]
  if (isSafeAbsPath(home))
    out.push(home + "/.local/bin/omaboard")
  return out
}

function isSafeOmaboardPath(path, home) {
  var p = String(path || "")
  var allowed = allowedOmaboardPaths(home)
  for (var i = 0; i < allowed.length; i++) {
    if (p === allowed[i])
      return true
  }
  return false
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
      if (!board || typeof board !== "object" || Array.isArray(board) || !board.id)
        continue
      var id = String(board.id)
      if (!isSafeBoardId(id))
        continue
      out.push({
        id: id,
        title: sanitizeTitle(board.title),
        modified: String(board.modified || "").slice(0, MAX_TIME_CHARS),
        created: String(board.created || "").slice(0, MAX_TIME_CHARS)
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
  var stamp = String(iso || "")
  if (!stamp || stamp.length > MAX_TIME_CHARS)
    return "Unknown"
  var then = Date.parse(stamp)
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
  if (!path)
    return ""
  var url = typeof fileUrlFn === "function" ? fileUrlFn(path) : ("file://" + path)
  url = String(url || "")
  if (url.indexOf("file://") !== 0 || url.indexOf("..") !== -1)
    return ""
  var base = url.split("?")[0]
  var expected = typeof fileUrlFn === "function" ? String(fileUrlFn(path) || "") : ("file://" + path)
  if (!expected || base !== expected)
    return ""
  var stamp = Date.parse(String(modified || "").slice(0, MAX_TIME_CHARS))
  if (!isFinite(stamp))
    stamp = Date.now()
  return base + "?t=" + stamp
}
