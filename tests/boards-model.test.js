const fs = require("fs")
const path = require("path")
const vm = require("vm")

const source = fs.readFileSync(path.join(__dirname, "..", "BoardsModel.js"), "utf8")
const context = {}
vm.createContext(context)
vm.runInContext(source, context)

const index = `{
  "boards": [
    { "id": "aaa", "title": "cats", "modified": "2026-08-21T13:18:31.684Z" },
    { "id": "../escape", "title": "nope" },
    { "id": "bbb", "title": "Whiteboard 2", "modified": "2026-08-21T13:18:28.629Z" }
  ]
}`

const boards = context.parseIndex(index)
if (boards.length !== 2) throw new Error("expected 2 safe boards, got " + boards.length)
if (boards[0].title !== "cats") throw new Error("first title")
if (context.filterBoards(boards, "cat").length !== 1) throw new Error("filter cat")
if (!context.showNewBoard("")) throw new Error("new board visible")
if (context.showNewBoard("cats")) throw new Error("new board hidden while filtering")
if (context.dataRoot("/home/ew", "") !== "/home/ew/.local/share/omaboard") throw new Error("dataRoot")
if (context.relativeTime("2026-08-21T13:18:31.684Z", Date.parse("2026-08-21T13:18:40.000Z")) !== "Just now")
  throw new Error("relative time")

console.log("ok")
