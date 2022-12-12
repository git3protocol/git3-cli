import { promises as fs } from 'fs'
import pathUtil from 'path'
import { Ref, Status, Storage } from "./storage";
import { superpathjoin as join } from 'superpathjoin';
const mockPath = process.env.HOME + "/.git3/mock"
fs.mkdir(mockPath, { recursive: true })
const log = console.error
log("mock path", mockPath)

export class ETHStorage implements Storage {
    repoURI: string;

    constructor(repoURI: string) {
        this.repoURI = repoURI
    }

    async listRefs(): Promise<Ref[]> {
        let stPath = join(mockPath, "refs.json")
        try {
            let refsJson = await fs.readFile(stPath)
            let dict = JSON.parse(refsJson.toString())
            let list = []
            for (let key in dict) {
                list.push({ ref: key, sha: dict[key] })
            }
            return list
        }

        catch (e) {
            return []
        }

    }
    async setRef(path: string, sha: string): Promise<Status> {
        let dict
        let stPath = join(mockPath, "refs.json")
        try {
            let refsJson = await fs.readFile(stPath)
            dict = JSON.parse(refsJson.toString())
        }
        catch (e) {
            dict = {}
            await fs.mkdir(pathUtil.dirname(stPath), { recursive: true })
        }

        dict[path] = sha
        await fs.writeFile(stPath, JSON.stringify(dict))
        return Status.SUCCEED
    }
    async removeRef(path: string): Promise<Status> {
        let stPath = join(mockPath, "refs.json")
        let refsJson = await fs.readFile(stPath)
        let dict = JSON.parse(refsJson.toString())
        delete dict[path]
        await fs.writeFile(stPath, JSON.stringify(dict))
        return Status.SUCCEED
    }

    async remove(path: string): Promise<Status> {
        throw new Error("Method not implemented.");
    }
    async download(path: string): Promise<[Status, Buffer]> {
        let buffer = await fs.readFile(join(mockPath, path))
        return [Status.SUCCEED, buffer]
    }


    async upload(path: string, file: Buffer): Promise<Status> {
        let stPath = join(mockPath, path)
        await fs.mkdir(pathUtil.dirname(stPath), { recursive: true })
        await fs.writeFile(stPath, file)
        return Status.SUCCEED
    }
}
