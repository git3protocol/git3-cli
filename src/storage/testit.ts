import axios from "axios"
import FormData from "form-data"

async function main() {
    let auth =
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGFEQTdCOWFlQTdGNTc2ZDI5NzM0ZWUxY0Q2ODVFMzc2OWNCM2QwRDEiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3NTQ5NDYwMDkzMiwibmFtZSI6ImZ2bS1oYWNrc29uIn0.YBqfsj_LTZSJPKc0OH586avnQNqove_Htzl5rrToXTk"

    let data = new FormData()
    data.append("file", Buffer.from("hello world1"), {
        filename: "hello.txt",
    })

    data.append("file", Buffer.from("hello world2"), {
        filename: "hello.txt",
    })

    let response = await axios.post("https://api.nft.storage/upload", data, {
        headers: {
            "Content-Type": "multipart/form-data",
            Authorization: auth,
        },
    })
    console.log(response.status, JSON.stringify(response.data))
}

main()
