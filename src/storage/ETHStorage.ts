import { Ref, Status, Storage } from "./storage.js"
import { ethers } from "ethers"
import { TxManager } from "../common/tx-manager.js"
import { Git3Protocol } from "../common/git3-protocol.js"

export class ETHStorage implements Storage {
    repoName: string
    wallet: ethers.Signer
    contract: ethers.Contract
    txManager: TxManager

    constructor(protocol: Git3Protocol) {
        this.repoName = protocol.repoName
        this.contract = protocol.contract
        this.wallet = protocol.wallet
        this.txManager = new TxManager(this.contract, protocol.chainId, protocol.netConfig.txConst)
    }
    async uploadCommit(): Promise<Status> {
        return Promise.resolve(Status.SUCCEED)
    }

    async repoRoles(): Promise<string[]> {
        let owner = await this.contract.repoNameToOwner(Buffer.from(this.repoName))
        if (owner === ethers.constants.AddressZero) return []
        return [owner]
    }

    async hasPermission(ref: string): Promise<boolean> {
        let member = await this.repoRoles()
        return member.indexOf(await this.wallet.getAddress()) >= 0
    }

    async download(path: string): Promise<[Status, Buffer]> {
        const res = await this.contract.download(Buffer.from(this.repoName), Buffer.from(path))
        const buffer = Buffer.from(res[0].slice(2), "hex")
        console.error(`=== download file ${path} succeed ===`)
        return [Status.SUCCEED, buffer]
    }

    async upload(path: string, file: Buffer): Promise<Status> {
        try {
            console.error(`=== uploading file ${path} ===`)
            await this.txManager.SendCall("upload", [
                Buffer.from(this.repoName),
                Buffer.from(path),
                file,
            ])
            console.error(`=== upload ${path} succeed ===`)

            return Status.SUCCEED
        } catch (error: any) {
            this.txManager.CancelAll()
            console.error(`upload failed: ${error}`)
            return Status.FAILED
        }
    }

    remove(path: string): Promise<Status> {
        throw new Error("Method not implemented.")
    }

    async listRefs(): Promise<Ref[]> {
        const res: string[][] = await this.contract.listRefs(Buffer.from(this.repoName))
        let refs = res.map((i) => ({
            ref: Buffer.from(i[1].slice(2), "hex")
                .toString("utf8")
                .slice(this.repoName.length + 1),
            sha: i[0].slice(2),
        }))
        return refs
    }

    async setRef(path: string, sha: string): Promise<Status> {
        try {
            console.error(`=== setting ref ${path} ===`)
            await this.txManager.SendCall("setRef", [
                Buffer.from(this.repoName),
                Buffer.from(path),
                "0x" + sha,
            ])

            console.error(`ref set succeed ${path}`)
            return Status.SUCCEED
        } catch (error: any) {
            console.error(`ref set failed ${error} : ${path}`)
            return Status.FAILED
        }
    }

    async removeRef(path: string): Promise<Status> {
        await this.contract.delRef(Buffer.from(this.repoName), Buffer.from(path))
        return Status.SUCCEED
    }
}
