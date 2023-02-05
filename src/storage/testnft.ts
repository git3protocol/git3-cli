import axios from "axios"
import Form from "form-data"
let form = new Form()

form.append("file", Buffer.from("hello world"), {
    filename: "",
    contentType: "image/*",
})
const response = await axios.post(
    "https://api.nft.storage/upload",
    Buffer.from("hello world"),
    {
        headers: {
            "Content-Type": "application/octet-stream",
            Authorization:
                "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGFEQTdCOWFlQTdGNTc2ZDI5NzM0ZWUxY0Q2ODVFMzc2OWNCM2QwRDEiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3NTQ5NDYwMDkzMiwibmFtZSI6ImZ2bS1oYWNrc29uIn0.YBqfsj_LTZSJPKc0OH586avnQNqove_Htzl5rrToXTk",
        },
    }
)

console.log(response.status)
console.log(response.headers)
console.log(response.data)
