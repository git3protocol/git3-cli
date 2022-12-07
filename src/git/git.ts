import { log } from './log';
import { superpathjoin as join } from 'superpathjoin';
import { ApiBaseParams } from './git-remote-helper';
import { Storage } from '../storage/storage';
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
        let refs = this.get_refs(forPush)
        for (let ref of refs) {
            outLines.push(`${ref.sha} ${ref.ref}`)
        }
        if (!forPush) {
            // head = self.read_symbolic_ref("HEAD")
            // if head:
            //     _write("@%s HEAD" % head[1])
            // else:
            //     self._trace("no default branch on remote", Level.INFO)
            // convert to typescript

            let head = await this.read_symbolic_ref("HEAD")
            if (head) {
                outLines.push(`@${head[1]} HEAD`)
            } else {
                log("no default branch on remote")
            }
        }
        return ""
    }

    async read_symbolic_ref(path: string) {
        path = join(this.gitdir, path)
        log("fetching symbolic ref: ", path)

        try {
            // const [status, resp] = await this.storage.download(path);
            // let ref = resp.content.toString("utf8");
            // ref = ref.slice("ref: ".length).trim();
            // const rev = meta.rev;
            return [];
        } catch (e) {
            return null;
        }
    }

    get_refs(forPush: boolean): { sha: string, ref: string }[] {
        // try {
        //     const loc = join(this.gitdir, "refs")
        //     let res = this._connection.files_list_folder(loc, recursive = true)
        //     let files = res.entries;
        //     while (res.has_more) {
        //         res = this._connection.files_list_folder_continue(res.cursor);
        //         files.extend(res.entries);
        //     }
        // } catch (e) {
        //     if (e instanceof Error) {
        //         throw e;
        //     }
        //     if (forPush) {
        //         //   this._first_push = true;
        //     } else {
        //         log("repository is empty")
        //     }
        //     return [];
        // }
        // files = files.filter((i) => i instanceof dropbox.files.FileMetadata);
        // const paths = files.map((i) => i.path_lower);
        // if (!paths.length) {
        //     return [];
        // }
        // let revs: string[] = [];
        // let data: Uint8Array[] = [];
        // for (let [rev, datum] of this._get_files(paths)) {
        //     revs.push(rev);
        //     data.push(datum);
        // }
        // const refs = [];
        // for (let [path, rev, datum] of zip(paths, revs, data)) {
        //     const name = this._ref_name_from_path(path);
        //     const sha = datum.decode("utf8").strip();
        //     this._refs[name] = [rev, sha];
        //     refs.push([sha, name]);
        // }
        // return refs;

        return []
    }

}

export default Git