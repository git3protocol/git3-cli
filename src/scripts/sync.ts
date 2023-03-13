import {
    FactoryProtocol,
    initFactoryByChainID,
    initNameService,
    parseGit3URI,
} from "../common/git3-protocol.js"
import network from "../config/evm-network.js"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { ethers } from "ethers"
import axios from "axios"
import nameServices from "../config/name-services.js"
import { Retrier } from "../common/queue-task.js"

let cache = loadCache()

export let api = axios.create({
    baseURL: `http://127.0.0.1:${process.env.port || 3331}/api/v1/`,
    responseType: "json",
    headers: {
        "Content-Type": "application/json",
        Authorization: `token ${process.env.TOKEN}`,
    },
    validateStatus: function (status) {
        return status < 500
    },
})

export function loadCache() {
    existsSync("./cache.json") || writeFileSync("./cache.json", "")
    let text = readFileSync("./cache.json").toString()
    if (text == "") {
        return {
            factory: {
                3334: {
                    start: 5413325,
                    last: 5413325,
                },
                421613: {
                    start: 9623490,
                    last: 9623490,
                },
                42170: {
                    start: 2699199,
                    last: 2699199,
                },
            },
            hubs: {},
            ns: {
                start: 9622844,
                last: 9622844,
                nameHub: {},
                hubName: {},
            },
        }
    } else {
        return JSON.parse(text)
    }
}

export function saveCache(cache: any) {
    writeFileSync("./cache.json", JSON.stringify(cache))
}
const RANGE = 1000
const WAIT_SECONDS = 10

export async function eventIterator(
    contract: ethers.Contract,
    filters: any[],
    last: number,
    saveLastCallback: (_last: number) => void,
    eventCallback: (event: any) => void,
    stop: () => boolean = () => false
) {
    let provider = contract.provider

    while (true) {
        if (stop && stop()) break
        let lastBlock = await Retrier(async () => await provider.getBlockNumber(), {
            maxRetry: 100,
            retryInterval: 1000,
        })
        for (let i = last; i < lastBlock; i += RANGE) {
            let end = i + RANGE - 1
            if (end >= lastBlock) end = lastBlock - 1
            console.log(i, end)
            for (const filter of filters) {
                let events = await Retrier(async () => await contract.queryFilter(filter, i, end), {
                    maxRetry: 100,
                    retryInterval: 1000,
                })
                for (const event of events) {
                    await eventCallback(event)
                    //console.log(protocol.chainId, i, end, event.args, event)
                }
            }

            last = end
            saveLastCallback(last)
        }
        await new Promise((resolve) => setTimeout(resolve, WAIT_SECONDS * 1000))
    }
}

export async function syncFactory(protocol: FactoryProtocol) {
    let factory = protocol.factory
    let last = cache.factory[protocol.chainId].last
    console.log("syncFactory", protocol.chainId, last)
    await eventIterator(
        factory,
        [factory.filters.CreateHub()],
        last,
        (_last) => {
            cache.factory[protocol.chainId].last = _last
            saveCache(cache)
        },
        async (event) => {
            let hubAddr = event.args!.hub
            if (cache.ns.hubName[hubAddr]) {
                hubAddr = cache.ns.hubName[hubAddr]
            } else {
                hubAddr = `${hubAddr}:${protocol.chainId}`
            }
            console.log("hub:", hubAddr, "block:", event.blockNumber)
            await createHub(hubAddr)
            syncHub(hubAddr, event.blockNumber)
        }
    )
}

export function Hex0xToStr(hex0x: string) {
    return Buffer.from(hex0x.slice(2), "hex").toString()
}

export async function syncHub(hubAddr: string, start: number) {
    if (start > 0) {
        cache.hubs[hubAddr] = { start, last: start }
    }
    let protocol = await parseGit3URI(hubAddr, { skipRepoName: true, ignoreProtocolHeader: true })
    let hub = protocol.hub
    let last = cache.hubs[hubAddr].last

    await eventIterator(
        hub,
        [hub.filters.RepoCreated(), hub.filters.SetRepoRef()],
        last,
        (_last) => {
            if (cache.hubs[hubAddr]) {
                cache.hubs[hubAddr].last = _last
                saveCache(cache)
            }
        },
        async (event) => {
            if (event.event == "RepoCreated") {
                let repoName = Hex0xToStr(event.args!.repoName)
                console.log("repo:", hubAddr, repoName)
                await mirrorRepo(hubAddr, repoName)
            } else if (event.event == "SetRepoRef") {
                let repoName = Hex0xToStr(event.args!.repoName)
                await pullRepo(hubAddr, repoName)
            }
        },
        () => {
            return !cache.hubs[hubAddr]
        }
    )
}

export async function mirrorRepo(hubAddr: string, repoName: string) {
    let uri = `git3://${hubAddr}/${repoName}`
    try {
        let res = await api.post("/repos/migrate", {
            clone_addr: uri,
            mirror: true,
            mirror_interval: "1h",
            private: false,
            repo_name: repoName,
            repo_owner: hubAddr,
            service: "git",
            uid: 0,
        })
        console.log("mirrorRepo", uri, res.status)
    } catch (e) {
        console.error("mirrorRepo", e)
    }
}

export async function pullRepo(hubAddr: string, repoName: string) {
    let uri = `git3://${hubAddr}/${repoName}`
    try {
        let res = await api.post(`/repos/${hubAddr}/${repoName}/mirror-sync`)
        console.log("pullRepo", uri, res.status)
    } catch (e) {
        console.error("pullRepo", e)
    }
}

export async function migrateHub(oldHubAddr: string, newHubAddr: string) {
    console.log("migrateHub:", oldHubAddr, newHubAddr)
    let oldHub = cache.hubs[oldHubAddr]
    if (oldHub) {
        deleteHub(oldHubAddr)
        delete cache.hubs[oldHubAddr]
        await createHub(newHubAddr)
        syncHub(newHubAddr, oldHub.start)
    } else {
        await createHub(newHubAddr)
    }
}

export async function syncNameService() {
    let nsContract = initNameService()
    let last = cache.ns.last

    await eventIterator(
        nsContract,
        [nsContract.filters.RegisterHub()],
        last,
        (_last) => {
            cache.ns.last = _last
            saveCache(cache)
        },
        async (event) => {
            let name = event.args!.name
            let hub = event.args!.hub
            let [_, nsDomain] = name.split(".")
            let ns = nameServices[nsDomain]
            let hubAddr = `${hub}:${ns.chainId}`
            let old = cache.ns.nameHub[name]
            if (!old) {
                await migrateHub(hubAddr, name)
            } else {
                if (old != hub) {
                    // Rebind NS hub address
                    delete cache.ns.hubName[old]
                    await migrateHub(name, name)
                } else {
                    // same name, do nothing
                }
            }
            console.log("ns:", name, hub)
            cache.ns.nameHub[name] = hub
            cache.ns.hubName[hub] = name
            saveCache(cache)
        }
    )
}

export async function deleteHub(hubAddr: string): Promise<boolean> {
    let res = await api.get(`/orgs/${hubAddr}/repos`, { params: { page: 1, limit: 100000 } })
    if (res.status != 200) {
        return false
    }
    for (const repo of res.data) {
        res = await api.delete(`/repos/${hubAddr}/${repo.name}`)
        console.log("delete repo:", `${hubAddr}/${repo.name}`)
    }
    res = await api.delete(`/orgs/${hubAddr}`)
    console.log(res.status, res.data)
    return res.status == 200
}

export async function createHub(hubAddr: string) {
    let res = await api.post(`/orgs`, {
        repo_admin_change_team_access: true,
        username: hubAddr,
        visibility: "public",
    })
    if (res.status != 201) {
        console.log("[ERROR] createHub", hubAddr, res.status, res.data)
    }
    return res.status == 201
}

async function main() {
    let tasks = []
    tasks.push(syncNameService())

    for (const [chainId, _] of Object.entries(network)) {
        let protocol = await initFactoryByChainID(chainId, null)
        tasks.push(syncFactory(protocol))
    }

    for (const [hubAddr, _] of Object.entries(cache.hubs)) {
        tasks.push(syncHub(hubAddr, 0))
    }

    await Promise.all(tasks)
}
import esMain from "es-main"
if (esMain(import.meta)) {
    main()
}
