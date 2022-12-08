import fs from 'fs'
import { Ref, Status, Storage } from "./storage";
import { superpathjoin as join } from 'superpathjoin';
const mockPath = process.env.HOME + "/.git3/mock"
fs.mkdirSync(mockPath, { recursive: true })
const log = console.error
log("mock path", mockPath)

export class ETHStorage implements Storage {
    repoURI: string;

    constructor(repoURI: string) {
        this.repoURI = repoURI
    }

    async listRefs(): Promise<Ref[]> {
        try {
            let refsJson = fs.readFileSync(join(mockPath, "refs.json"))
            return JSON.parse(refsJson.toString())
        }

        catch (e) {
            log("no refs found")
            return []
        }

    }
    async addRefs(refs: Ref[]): Promise<Status> {
        fs.writeFileSync(join(mockPath, "refs.json"), JSON.stringify(refs))
        return Status.SUCCEED
    }
    delRefs(refs: Ref[]): Promise<Status> {
        throw new Error("Method not implemented.");
    }

    async delete(path: string): Promise<Status> {
        throw new Error("Method not implemented.");
    }
    async download(path: string): Promise<[Status, Buffer]> {
        let buffer = fs.readFileSync(join(mockPath, path))
        return [Status.SUCCEED, buffer]
    }


    async upload(path: string, file: Buffer): Promise<Status> {
        fs.writeFileSync(join(mockPath, path), file)
        return Status.SUCCEED
    }
}
