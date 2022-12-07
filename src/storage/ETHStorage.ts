import { Level } from "level";
import { Ref, Status, Storage } from "./storage";
const db = new Level('mock')

export class ETHStorage implements Storage {
    repoURI: string;

    constructor(repoURI: string) {
        this.repoURI = repoURI
    }

    listRefs(): Promise<Ref[]> {
        throw new Error("Method not implemented.");
    }
    addRefs(refs: Ref[]): Promise<Status> {
        throw new Error("Method not implemented.");
    }
    delRefs(refs: Ref[]): Promise<Status> {
        throw new Error("Method not implemented.");
    }

    async delete(path: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async download(path: string): Promise<[Status, Buffer]> {
        const prefix = "file:"
        let value = await db.get(prefix + path)
        return [Status.SUCCEED, Buffer.from(value)]
    }


    async upload(path: string, file: Buffer): Promise<Status> {
        const prefix = "file:"
        await db.put(prefix + path, file.toString())
        return Status.SUCCEED
    }
}
