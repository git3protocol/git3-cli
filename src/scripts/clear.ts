import { api, deleteHub } from "./sync.js"
import fs from "fs"

fs.unlinkSync("./cache.json")

let res = await api.get("/orgs")
for (const org of res.data) {
    console.log("hub:", org.name)
    deleteHub(org.name)
}
