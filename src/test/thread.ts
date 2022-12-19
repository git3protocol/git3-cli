import { ETHStorage } from "../storage/ETHStorage";


let es = new ETHStorage("test123", 3334, { git3Address: null, sender: null })
let main = async () => {
    let data = Buffer.from(Array.from({ length: 1024 }, () =>
        Math.floor(Math.random() * 256)
    ))
    console.log(data.length)
    // return
    let pending = []
    for (let i = 0; i < 20; i++) {
        pending.push(es.upload(`bbb-${i}`, data))
    }
    let resaults = await Promise.all(pending)
    for (let res of resaults) {
        console.log(res)
    }

    console.log(await es.download("bbb-9"))
}


main()
