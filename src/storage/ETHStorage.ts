import { Ref, Status, Storage } from "./storage"


export class ETHStorage implements Storage {
    repoURI: string

    constructor(repoURI: string) {
        this.repoURI = repoURI
    }
    download(path: string): Promise<[Status, Buffer]> {
        throw new Error("Method not implemented.")
    }
    upload(path: string, file: Buffer): Promise<Status> {
        throw new Error("Method not implemented.")
    }
    remove(path: string): Promise<Status> {
        throw new Error("Method not implemented.")
    }
    listRefs(): Promise<Ref[]> {
        throw new Error("Method not implemented.")
    }
    setRef(path: string, sha: string): Promise<Status> {
        throw new Error("Method not implemented.")
    }
    removeRef(path: string): Promise<Status> {
        throw new Error("Method not implemented.")
    }

}
