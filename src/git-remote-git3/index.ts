import GitRemoteHelper from "./git-remote-helper.js"
import { ApiBaseParams } from "./git-remote-helper.js"
import Git from "./git.js"
import { parseGit3URI } from "../common/git3-protocol.js"
// https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
let git: Git
GitRemoteHelper({
    env: process.env,
    stdin: process.stdin,
    stdout: process.stdout,
    api: {
        init: async (p: ApiBaseParams) => {
            const protocol = parseGit3URI(p.remoteUrl)
            const storage = new protocol.storageClass(protocol)
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
