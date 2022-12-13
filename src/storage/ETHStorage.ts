import { Ref, Status, Storage } from "./storage"
import { callContractMethod } from "../wallet/index"

export class ETHStorage implements Storage {
    repoURI: string

    constructor(repoURI: string) {
        this.repoURI = repoURI
    }

    async download(path: string): Promise<[Status, Buffer]> {
        const buffer = await callContractMethod({
            method: 'download',
            path,
            file: null,
            sha: null
        })
        return [Status.SUCCEED, buffer] 
    }

    async upload(path: string, file: Buffer): Promise<Status> {
        await callContractMethod({
            method: 'upload',
            path,
            file,
            sha: null
        })
        return Status.SUCCEED
    }

    remove(path: string): Promise<Status> {
        throw new Error("Method not implemented.")
    }

    async listRefs(): Promise<Ref[]> {
        const result = await callContractMethod({
            method: 'listRefs',
            path: null,
            file: null,
            sha: null
        })
        return result
    }

    async setRef(path: string, sha: string): Promise<Status> {
        await callContractMethod({
            method: 'setRef',
            path,
            file: null,
            sha
        })
        return Status.SUCCEED
    }

    removeRef(path: string): Promise<Status> {
        throw new Error("Method not implemented.")
    }
}
