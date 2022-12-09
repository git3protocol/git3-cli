import util from 'util'
import childProcess from 'child_process'
const exec = util.promisify(childProcess.exec);
import * as zlib from "zlib";

export class GitUtils {
    static async commandOK(...args: string[]): Promise<boolean> {
        try {
            await exec(`git ${args.join(" ")}`)
            return true
        }
        catch (e) {
            return false
        }
    }

    static async commandOutput(...args: string[]): Promise<string> {
        try {
            const { stdout } = await exec(`git ${args.join(" ")}`, { encoding: "utf8" })
            return stdout
        }
        catch (e) {
            return ""
        }
    }

    static async commandRaw(...args: string[]): Promise<Buffer> {
        try {
            const { stdout } = await exec(`git ${args.join(" ")}`, { encoding: "buffer" })
            return stdout
        }
        catch (e) {
            return Buffer.alloc(0)
        }
    }

    static async objectExists(sha: string): Promise<boolean> {
        return await this.commandOK("cat-file", "-e", sha)
    }
    static async objectKind(sha: string): Promise<string> {
        return await this.commandOutput("cat-file", "-t", sha)
    }

    static async objectData(sha: string, kind: string): Promise<Buffer> {
        if (kind) {
            return await this.commandRaw("cat-file", kind, sha)
        } else {
            return await this.commandRaw("cat-file", "-p", sha)
        }
    }

    static async encodeObject(sha: string): Promise<Buffer> {
        let kind = await this.objectKind(sha)
        let size = await this.commandOutput("cat-file", "-s", sha)
        let contents = await this.objectData(sha, kind)
        const data = Buffer.concat([
            Buffer.from(kind, "utf8"),
            Buffer.from(" "),
            Buffer.from(size, "utf8"),
            Buffer.from("\0"),
            contents,
        ]);
        const compressed = zlib.gzipSync(data);
        return compressed
    }

    static async isAncestor(ancestor: string, ref: string): Promise<boolean> {
        return await this.commandOK("merge-base", "--is-ancestor", ancestor, ref)
    }

    static async refValue(ref: string): Promise<string> {
        let sha = await this.commandOutput("rev-parse", ref)
        return sha.trim()
    }
    static async listObjects(ref: string, excludeList: string[]): Promise<string[]> {
        let exclude: string[] = []
        for (let obj of excludeList) {
            if (!await this.objectExists(obj)) {
                exclude.push(`^${obj}`)
            }
        }
        const objects = await this.commandOutput("rev-list", "--objects", ref, ...exclude);
        if (!objects) {
            return [];
        }
        return objects.split("\n").map((item) => item.split(" ")[0]).filter(item => item)
    }

    static async symbolicRef(ref: string): Promise<string> {
        let path = await this.commandOutput("symbolic-ref", ref)
        return path.trim()
    }
}