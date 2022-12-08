import { log } from './log';
import { superpathjoin as join } from 'superpathjoin';
import { ApiBaseParams } from './git-remote-helper';
import { Ref, Storage } from '../storage/storage';
class Git {
    gitdir: string
    remoteName: string
    remoteUrl: string
    storage: Storage

    constructor(info: ApiBaseParams, storage: Storage) {
        this.gitdir = info.gitdir
        this.remoteName = info.remoteName
        this.remoteUrl = info.remoteUrl
        this.storage = storage
    }

    async do_list(forPush: boolean) {
        let outLines: string[] = []
        let refs = await this.get_refs(forPush)
        for (let ref of refs) {
            outLines.push(`${ref.sha} ${ref.ref}`)
        }
        if (!forPush) {
            let head = await this.read_symbolic_ref("HEAD")
            if (head) {
                outLines.push(`@${head} HEAD`)
            } else {
                log("no default branch on remote")
            }
        }
        return outLines.join("\n") + "\n"
    }

    async do_fetch(refs: { ref: string; oid: string }[]) {

    }

    async do_push(refs: {
        src: string;
        dst: string;
        force: boolean;
    }[]) {
        // let remoteHead = null
        for (let ref of refs) {
            if (ref.src == "") {
                this.storage.delete(ref.dst)
            } else {
                this.push(ref.src, ref.dst)

            }
        }
        return '\n\n'

    }

    async push(src: string, dst: string) {

    }
    async read_symbolic_ref(path: string) {
        path = join(this.gitdir, path)
        log("fetching symbolic ref: ", path)

        try {
            const [_, resp] = await this.storage.download(path)
            let ref = resp.toString()
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