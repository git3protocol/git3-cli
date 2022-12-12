
import GitRemoteHelper from './git/git-remote-helper'
import { ApiBaseParams } from './git/git-remote-helper'
import Git from './git/git'
import { log } from './git/log'
import { MockStorage } from './storage/MockStorage'

let git: Git;
GitRemoteHelper({
    env: process.env,
    stdin: process.stdin,
    stdout: process.stdout,
    api: {
        /**
         * This will always be invoked when the remote helper is invoked
         */
        init: async (p: ApiBaseParams) => {
            git = new Git(p, new MockStorage(p.remoteUrl))
            return
        },
        /**
         * This needs to return a list of git refs.
         */
        list: async (p: {
            gitdir: string
            remoteName: string
            remoteUrl: string
            forPush: boolean
        }) => {
            log('list', p)

            let out = await git.do_list(p.forPush)
            log("list out:\n", out)
            return out
        },
        /**
         * This should put the requested objects into the `.git`
         */
        handleFetch: async (p: {
            gitdir: string
            remoteName: string
            remoteUrl: string
            refs: { ref: string, oid: string }[]
        }) => {
            log("fetch", p)
            let out = await git.do_fetch(p.refs)
            log("fetch out:\n", out)
            return out
        },
        /**
         * This should copy objects from `.git`
         */
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
            log("push", p)
            let out = await git.do_push(p.refs)
            log("push out:\n", out)
            return out
        },
    },
}).catch((error: any) => {
    console.error("wtf");
    console.error(error);
});
