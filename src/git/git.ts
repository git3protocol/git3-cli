import { log } from './log'
import { superpathjoin as join } from 'superpathjoin'
import { ApiBaseParams } from './git-remote-helper'
import { Ref, Status, Storage } from '../storage/storage'
import { GitUtils } from './git-utils'
class Git {
    gitdir: string
    remoteName: string
    remoteUrl: string
    storage: Storage
    refs: Map<string, string> = new Map()
    pushed: Map<string, string> = new Map()
    head: string | null

    constructor(info: ApiBaseParams, storage: Storage) {
        this.gitdir = info.gitdir
        this.remoteName = info.remoteName
        this.remoteUrl = info.remoteUrl
        this.storage = storage
        this.refs = new Map()
        this.pushed = new Map()
        this.head = null
    }

    async do_list(forPush: boolean) {
        let outLines: string[] = []
        let refs = await this.get_refs(forPush)
        for (let ref of refs) {
            if (ref.ref == "HEAD") {
                if (!forPush) outLines.push(`@${ref.sha} HEAD\n`)
                this.head = ref.sha
            }
            else {
                outLines.push(`${ref.sha} ${ref.ref}\n`)
                this.refs.set(ref.ref, ref.sha)
            }

        }

        return outLines.join("") + "\n"
    }

    async do_fetch(refs: { ref: string, oid: string }[]) {
        for (let ref of refs) {
            await this.fetch(ref.oid)
        }
        return "\n\n"
    }

    async do_push(refs: {
        src: string
        dst: string
        force: boolean
    }[]): Promise<string> {
        let outLines: string[] = []
        // let remoteHead = null
        for (let ref of refs) {
            if (ref.src == "") {
                if (this.refs.get("HEAD") == ref.dst) {
                    return `error ${ref.dst} refusing to delete the current branch: ${ref.dst}` + "\n\n"
                }
                log("deleting ref", ref.dst)
                this.storage.removeRef(ref.dst)

                this.refs.delete(ref.dst)
                this.pushed.delete(ref.dst)
            } else {
                outLines.push(await this.push(ref.src, ref.dst) + "\n")
            }
        }
        if (this.refs.size == 0) {
            // first push
            let symbolicRef = GitUtils.symbolicRef("HEAD")
            await this.wirteRef(symbolicRef, "HEAD", true)
        }
        return outLines.join("") + "\n\n"

    }

    async fetch(oid: string) {
        let fetching: Promise<void>[] = []
        if (GitUtils.objectExists(oid)) {
            if (oid == GitUtils.EMPTY_TREE_HASH) {
                GitUtils.writeObject("tree", Buffer.from(""))
            }
            if (!GitUtils.historyExists(oid)) {
                log("missing part of history from", oid)
                for (let sha of GitUtils.referencedObjects(oid)) {
                    fetching.push(this.fetch(sha))
                }
            }
            else {
                log("already downloaded", oid)
            }
        }
        else {
            let error = await this.download(oid)
            if (!error) {
                for (let sha of GitUtils.referencedObjects(oid)) {
                    fetching.push(this.fetch(sha))
                }
            } else {
                fetching.push(this.fetch(oid))
            }

        }
        await Promise.all(fetching)
    }

    async download(sha: string): Promise<Error | null> {
        log("fetching...", sha)
        let [status, data] = await this.storage.download(this.objectPath(sha))
        if (status == Status.SUCCEED) {
            let computedSha = GitUtils.decodeObject(data)
            if (computedSha != sha) {
                return new Error(`sha mismatch ${computedSha} != ${sha}`)
            }
        }
        else {
            return new Error(`download failed ${sha}`)
        }
        return null
    }

    async push(src: string, dst: string) {
        let force = false
        if (src.startsWith("+")) {
            src = src.slice(1)
            force = true
        }
        let present = Array.from(this.refs.values())
        present.push(...Array.from(this.pushed.values()))
        let objects = GitUtils.listObjects(src, present)
        let pendings = []
        for (let obj of objects) {
            pendings.push(this.putObject(obj))
        }
        await Promise.all(pendings)
        
        let sha = GitUtils.refValue(src)
        let err = await this.wirteRef(sha, dst, force)
        if (!err) {
            this.pushed.set(dst, sha)
            return `ok ${dst}`
        } else {
            return `error ${dst} ${err}`
        }
    }

    async wirteRef(newSha: string, dst: string, force: boolean): Promise<string | null> {
        let sha = this.refs.get(dst)
        if (sha) {
            if (!GitUtils.objectExists(sha)) {
                return "fetch first"
            }
            let isFastForward = GitUtils.isAncestor(sha, newSha)
            if (!isFastForward && !force) {
                return "non-fast forward"
            }
        }
        let status
        if (dst == "HEAD") {
            status = await this.storage.setRef(`HEAD:${newSha}`, "0000000000000000000000000000000000000000")
        } else {
            status = await this.storage.setRef(dst, newSha)
        }

        if (status == Status.SUCCEED) {
            return null
        }
        else {
            return 'set ref error'
        }

    }

    async putObject(sha: string) {
        let data = GitUtils.encodeObject(sha)
        let path = this.objectPath(sha)
        log("writing...", path, sha)
        let status = await this.storage.upload(path, data)
        log("status", status)
    }

    objectPath(name: string): string {
        const prefix = name.slice(0, 2)
        const suffix = name.slice(2)
        return join("objects", prefix, suffix)
    }

    async get_refs(forPush: boolean): Promise<Ref[]> {
        let refs = await this.storage.listRefs()
        for (let item of refs) {
            if (item.sha == "0000000000000000000000000000000000000000") {
                item.sha = item.ref.split("HEAD:")[1]
                item.ref = "HEAD"
            }
        }
        return refs
    }



}

export default Git