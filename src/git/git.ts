import { log } from './log';
import { superpathjoin as join } from 'superpathjoin';
import { ApiBaseParams } from './git-remote-helper';
import { Ref, Status, Storage } from '../storage/storage';
import { GitUtils } from './git-utils';
class Git {
    gitdir: string
    remoteName: string
    remoteUrl: string
    storage: Storage
    refs: Map<string, string> = new Map();
    pushed: Map<string, string> = new Map();

    constructor(info: ApiBaseParams, storage: Storage) {
        this.gitdir = info.gitdir
        this.remoteName = info.remoteName
        this.remoteUrl = info.remoteUrl
        this.storage = storage
        this.refs = new Map()
        this.pushed = new Map()
    }

    async do_list(forPush: boolean) {
        let outLines: string[] = []
        let refs = await this.get_refs(forPush)
        for (let ref of refs) {
            if (ref.ref == "HEAD") {
                if (!forPush) outLines.push(`@${ref.sha} HEAD\n`)
            }
            else {
                outLines.push(`${ref.sha} ${ref.ref}\n`)
            }
            this.refs.set(ref.ref, ref.sha)
        }

        log("outLines", outLines)
        return outLines.join("") + "\n"
    }

    async do_fetch(refs: { ref: string; oid: string }[]) {
        for (let ref of refs) {
            await this.fetch(ref.oid)
        }
    }

    async fetch(oid: string) {
        let downloaded = new Set<string>()
        let pending = new Set<string>()
        let queue = [oid]

        while (queue.length > 0 || pending.size > 0) {
            if (queue.length > 0) {
                let sha = queue.pop() || ""
                if (downloaded.has(sha) || pending.has(sha)) continue
                if (GitUtils.objectExists(sha)) {
                    if (sha == GitUtils.EMPTY_TREE_HASH) {
                        GitUtils.writeObject("tree", Buffer.from(""))
                    }
                    if (!GitUtils.historyExists(sha)) {
                        log("missing part of history from", sha)
                        queue.push(...GitUtils.referencedObjects(sha))
                    }
                    else {
                        log("already downloaded", sha)
                    }
                }
                else {
                    pending.add(sha)
                }
            }
            else {

            }
        }
    }

    async do_push(refs: {
        src: string;
        dst: string;
        force: boolean;
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
        log("outLines", outLines)
        return outLines.join("") + "\n\n"

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
        log("listObjects", objects)
        for (let obj of objects) {
            await this.putObject(obj)
        }
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
        log("setRef", dst, newSha)
        let status = await this.storage.setRef(dst, newSha)
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
        const prefix = name.slice(0, 2);
        const suffix = name.slice(2);
        return join("objects", prefix, suffix);
    }

    async read_symbolic_ref(path: string) {
        path = join(this.gitdir, path)
        log("fetching symbolic ref: ", path)

        try {
            const [_, data] = await this.storage.download(path)
            let ref = data.toString()
            ref = ref.slice("ref: ".length).trim();
            return ref;
        } catch (e) {
            return null;
        }
    }

    async get_refs(forPush: boolean): Promise<Ref[]> {
        let refs = await this.storage.listRefs()
        return refs
    }



}

export default Git