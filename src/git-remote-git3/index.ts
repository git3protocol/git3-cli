import GitRemoteHelper from "./git-remote-helper.js"
import { ApiBaseParams } from "./git-remote-helper.js"
import Git from "./git.js"
import { ETHStorage } from "../storage/ETHStorage.js"

import nameServices from "../config/name-services.js"
import { SLIStorage } from "../storage/SLIStorage.js"
// https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
let git: Git
GitRemoteHelper({
    env: process.env,
    stdin: process.stdin,
    stdout: process.stdout,
    api: {
        init: async (p: ApiBaseParams) => {
            const url = new URL(p.remoteUrl)
            let repoName
            let git3Address
            let chainId = url.port ? parseInt(url.port) : null
            if (url.hostname.indexOf(".") < 0) {
                if (url.hostname.startsWith("0x")) {
                    git3Address = url.hostname
                    repoName = url.pathname.slice(1)
                } else {
                    // use Default git3Address
                    git3Address = null
                    repoName = url.hostname.startsWith("/")
                        ? url.hostname.slice(1)
                        : url.hostname
                }
            } else {
                let nsSuffix = url.hostname.split(".")[1] // Todo: support sub domain
                let ns = nameServices[nsSuffix]
                if (!ns) throw new Error("invalid name service")
                // Todo: resolve name service
                git3Address = null // ns parse address

                chainId = chainId || ns.chainId
                repoName = url.pathname.slice(1)
            }
            chainId = chainId || 3334
            let sender = url.username || null
            let storage
            if (chainId == 3334) {
                storage = new ETHStorage(repoName, chainId, {
                    git3Address,
                    sender,
                })
            } else {
                storage = new SLIStorage(repoName, chainId, {
                    git3Address,
                    sender,
                })
            }

            git = new Git(p, storage)
            return
        },
        list: async (p: {
            gitdir: string
            remoteName: string
            remoteUrl: string
            forPush: boolean
        }) => {
            // log('list', p)
            let out = await git.doList(p.forPush)
            // log("list out:\n", out)
            return out
        },
        handleFetch: async (p: {
            gitdir: string
            remoteName: string
            remoteUrl: string
            refs: { ref: string; oid: string }[]
        }) => {
            // log("fetch", p)
            let out = await git.doFetch(p.refs)
            // log("fetch out:\n", out)
            return out
        },
        handlePush: async (p: {
            gitdir: string
            remoteName: string
            remoteUrl: string
            refs: {
                src: string
                dst: string
                force: boolean
            }[]
        }) => {
            // log("push", p)
            let out = await git.doPush(p.refs)
            // log("push out:\n", out)
            return out
        },
    },
}).catch((error: any) => {
    console.error("wtf")
    console.error(error)
})
