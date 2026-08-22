const fs = require("fs")
const path = require("path")
const vm = require("vm")

const source = fs.readFileSync(path.join(__dirname, "..", "BoardsModel.js"), "utf8")
const context = {}
vm.createContext(context)
vm.runInContext(source, context)

const idA = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"
const idB = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb"

const index = `{
  "boards": [
    { "id": "${idA}", "title": "<b>cats</b>", "modified": "2026-08-21T13:18:31.684Z" },
    { "id": "../escape", "title": "nope" },
    { "id": "bbb", "title": "Whiteboard 2" },
    { "id": "${idB}", "title": "<img src=\\"file:///etc/passwd\\">Notes", "modified": "2026-08-21T13:18:28.629Z" }
  ]
}`

const boards = context.parseIndex(index)
if (boards.length !== 2) throw new Error("expected 2 safe boards, got " + boards.length)
if (boards[0].title !== "cats") throw new Error("first title sanitized, got " + boards[0].title)
if (boards[1].title !== "Notes") throw new Error("img title sanitized, got " + boards[1].title)
if (context.sanitizeTitle("<img src=\"file:///etc/passwd\">") !== "Whiteboard")
  throw new Error("empty markup title")
if (context.sanitizeTitle("<img src=\"file:///etc/passwd\"") !== "Whiteboard")
  throw new Error("dangling markup title")
if (context.filterBoards(boards, "cat").length !== 1) throw new Error("filter cat")
if (!context.showNewBoard("")) throw new Error("new board visible")
if (context.showNewBoard("cats")) throw new Error("new board hidden while filtering")
if (context.dataRoot("/home/ew", "") !== "/home/ew/.local/share/omaboard") throw new Error("dataRoot")
if (context.relativeTime("2026-08-21T13:18:31.684Z", Date.parse("2026-08-21T13:18:40.000Z")) !== "Just now")
  throw new Error("relative time")
if (context.isSafeBoardId("../secret")) throw new Error("unsafe id")
if (!context.isSafeBoardId(idA)) throw new Error("uuid id")
if (context.thumbUrl(null, "/tmp/omaboard", "../secret", "") !== "")
  throw new Error("thumb url traversal")
const thumb = context.thumbUrl(null, "/tmp/omaboard", idA, "2026-08-21T13:18:31.684Z")
if (thumb.indexOf("file:///tmp/omaboard/thumbs/" + idA + ".png?t=") !== 0)
  throw new Error("thumb url " + thumb)

console.log("ok")
