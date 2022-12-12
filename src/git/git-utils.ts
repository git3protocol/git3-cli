import childProcess, { spawnSync } from 'child_process'
import bsplit from 'buffer-split'
import * as zlib from "zlib"

export class GitUtils {
    static EMPTY_TREE_HASH: string = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"

    static commandOK(...args: string[]): boolean {
        let res = childProcess.spawnSync("git", args, { encoding: "utf8" })
        return res.status == 0

    }

    static commandOutput(...args: string[]): string {
        try {
            // const { stdout } = exec(`git ${args.join(" ")}`, { encoding: "utf8" })
            const { stdout } = spawnSync("git", args, { encoding: "utf8" })
            return stdout.trim()
        }
        catch (e) {
            return ""
        }
    }

    static commandRaw(...args: string[]): Buffer {
        try {
            const { stdout } = spawnSync("git", args, { encoding: "buffer" })
            return stdout
        }
        catch (e) {
            return Buffer.alloc(0)
        }
    }

    static objectExists(sha: string): boolean {
        return this.commandOK("cat-file", "-e", sha)
    }
    static objectKind(sha: string): string {
        return this.commandOutput("cat-file", "-t", sha)
    }

    static objectData(sha: string, kind: string | null = null): Buffer {
        if (kind) {
            return this.commandRaw("cat-file", kind, sha)
        } else {
            return this.commandRaw("cat-file", "-p", sha)
        }
    }

    static encodeObject(sha: string): Buffer {
        let kind = this.objectKind(sha)
        let size = this.commandOutput("cat-file", "-s", sha)
        let contents = this.objectData(sha, kind)
        const data = Buffer.concat([
            Buffer.from(kind, "utf8"),
            Buffer.from(" "),
            Buffer.from(size, "utf8"),
            Buffer.from("\0"),
            contents,
        ])
        const compressed = zlib.gzipSync(data)
        return compressed
        return data
    }

    static decodeObject(data: Buffer): string {
        const decompressed = zlib.gunzipSync(data)
        // const decompressed = data
        const splits = bsplit(decompressed, Buffer.from("\0"), true)
        const head = bsplit(splits[0], Buffer.from(" "))
        const kind = head[0].toString("utf8")
        const writeData = Buffer.concat(
            splits.slice(1)
        )
        return this.writeObject(kind, writeData)
    }

    static isAncestor(ancestor: string, ref: string): boolean {
        return this.commandOK("merge-base", "--is-ancestor", ancestor, ref)
    }

    static refValue(ref: string): string {
        let sha = this.commandOutput("rev-parse", ref)
        return sha.trim()
    }
    static listObjects(ref: string, excludeList: string[]): string[] {
        let exclude: string[] = []
        for (let obj of excludeList) {
            if (this.objectExists(obj)) {
                exclude.push(`^${obj}`)
            }
        }
        const objects = this.commandOutput("rev-list", "--objects", ref, ...exclude)
        if (!objects) {
            return []
        }
        return objects.split("\n").map((item) => item.split(/\s/)[0]).filter(item => item)
    }

    static symbolicRef(ref: string): string {
        let path = this.commandOutput("symbolic-ref", ref)
        return path.trim()
    }

    static writeObject(kind: string, contents: Buffer): string {
        let res = spawnSync("git", ["hash-object", "-w", "--stdin", "-t", kind], { input: contents, encoding: "buffer" })
        if (res.status != 0) {
            console.error(kind, contents)
            throw new Error("Failed to write object")
        }
        else {
            return res.stdout.toString("utf8").trim()
        }
    }

    static historyExists(sha: string): boolean {
        return this.commandOK("rev-list", "--objects", sha)
    }

    static referencedObjects(sha: string): string[] {
        let kind = this.objectKind(sha)
        if (kind == "blob") {
            // blob objects do not reference any other objects
            return []
        }
        let data = this.objectData(sha).toString("utf8").trim()
        if (kind == "tag") {
            // tag objects reference a single object
            let obj = data.split("\n", 1)[0].split(/\s/)[1]
            return [obj]
        }
        else if (kind == "commit") {
            // commit objects reference a tree and zero or more parents
            let lines = data.split("\n")
            let tree = lines[0].split(/\s/)[1]
            let objs = [tree]
            for (let line of lines.slice(1)) {
                if (line.startsWith("parent ")) {
                    objs.push(line.split(/\s/)[1])
                }
                else {
                    break
                }
            }
            return objs
        }
        else if (kind == "tree") {
            // tree objects reference zero or more trees and blobs, or submodules
            if (!data) {
                // empty tree
                return []
            }
            let lines = data.split("\n")
            // submodules have the mode '160000' and the kind 'commit', we filter them out because
            // there is nothing to download and this causes errors
            return lines.filter(line => !line.startsWith("160000 commit ")).map(line => line.split(/\s/)[2])
        }
        else {
            throw new Error(`unexpected git object type: ${kind}`)
        }
    }
}