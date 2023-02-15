import { Ref, Status, Storage } from "./storage.js"
import { TxManager } from "../common/tx-manager.js"
import { ethers } from "ethers"
import ipfsConf from "../config/ipfs.js"
import axios from "axios"
import { Git3Protocol } from "../common/git3-protocol.js"

export class SLIStorage implements Storage {
    repoName: string
    wallet: ethers.Wallet
    contract: ethers.Contract
    txManager: TxManager
    auth: string

    batchQueue: Record<string, string>[] = []
    maxBatchSize = 20
    commitTimer: any

    storageIntervalLimit = 500
    storageCallLastTime = 0

    constructor(protocol: Git3Protocol) {
        this.repoName = protocol.repoName
        this.contract = protocol.contract
        this.wallet = protocol.wallet
        this.txManager = new TxManager(this.contract, protocol.chainId, protocol.netConfig.txConst)
        this.auth =
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGFEQTdCOWFlQTdGNTc2ZDI5NzM0ZWUxY0Q2ODVFMzc2OWNCM2QwRDEiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3NTQ5NDYwMDkzMiwibmFtZSI6ImZ2bS1oYWNrc29uIn0.YBqfsj_LTZSJPKc0OH586avnQNqove_Htzl5rrToXTk"

        this.txManager = new TxManager(this.contract, protocol.chainId, protocol.netConfig.txConst)
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
        const buffer = Buffer.from(res.slice(2), "hex")
        const cid = buffer.toString("utf8")
        for (let i = 0; i < ipfsConf.gateways.length; i++) {
            let gateway = ipfsConf.gateways[Math.floor(Math.random() * ipfsConf.gateways.length)] //random get rpc
            try {
                let response = await axios.get(gateway + cid, {
                    responseType: "arraybuffer",
                })
                if (response.status === 200) {
                    console.error(`=== download file ${path} succeed ===`)
                    return [Status.SUCCEED, Buffer.from(response.data)]
                }
            } catch (e) {
                //pass
            }
        }

        console.error(`=== download file ${cid} failed ===`)
        // console.error(buffer.toString('utf-8'))
        return [Status.FAILED, Buffer.from("")]
    }

    async upload(path: string, file: Buffer): Promise<Status> {
        try {
            console.error(`=== uploading file ${path} ===`)
            const cid = await this.storeIPFS(file)
            console.error(`ipfs cid: ${cid}`)
            this.batchQueue.push({ path, cid })

            if (this.commitTimer) clearTimeout(this.commitTimer)

            if (this.batchQueue.length >= this.maxBatchSize) {
                await this.commitQueue("full")
            } else {
                this.commitTimer = setTimeout(async () => {
                    await this.commitQueue("timeout")
                }, 3000)
            }

            // await this.txManager.SendCall("upload", [
            //     Buffer.from(this.repoName),
            //     Buffer.from(path),
            //     Buffer.from(cid),
            // ])
            console.error(`=== upload ${path} ${cid.slice(-6, -1)} succeed ===`)

            return Status.SUCCEED
        } catch (error: any) {
            this.txManager.CancelAll()
            console.error(`upload failed: ${error}`)
            return Status.FAILED
        }
    }

    async uploadCommit(): Promise<Status> {
        return Status.SUCCEED
        // try {
        //     await this.commitQueue("uploadCommit")
        //     return Status.SUCCEED
        // } catch (error: any) {
        //     this.txManager.CancelAll()
        //     console.error(`uploadCommit failed: ${error}`)
        //     return Status.FAILED
        // }
    }

    async commitQueue(reason: string) {
        let queue = this.batchQueue
        this.batchQueue = []

        console.error(`[${reason}] commit queue length ${queue.length}`)
        if (queue.length === 0) return
        await this.txManager.SendCall("batchUpload", [
            Buffer.from(this.repoName),
            queue.map((i) => Buffer.from(i.path)),
            queue.map((i) => Buffer.from(i.cid)),
        ])
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

    async storeIPFS(data: Buffer): Promise<string> {
        const RETRY_TIMES = 10
        const TIMEOUT = 30
        let response
        let lastError

        // while (this.storageAPICallCount >= this.storageAPILimit) {
        //     await new Promise((r) => setTimeout(r, 1000))
        // }

        for (let i = 0; i < RETRY_TIMES; i++) {
            try {
                while (
                    Date.now().valueOf() - this.storageCallLastTime <
                    this.storageIntervalLimit
                ) {
                    await new Promise((r) => setTimeout(r, this.storageIntervalLimit / 2))
                }
                this.storageCallLastTime = Date.now().valueOf()

                response = await axios.post("https://api.nft.storage/upload", data, {
                    headers: {
                        "Content-Type": "application/octet-stream",
                        Authorization: this.auth,
                    },
                    timeout: TIMEOUT * 1000,
                })
                if (response.status == 200) {
                    return response.data.value.cid
                } else {
                    lastError = response.status
                }
            } catch (e) {
                //pass
                lastError = e
                new Promise((r) => setTimeout(r, 1000))
            }
        }
        throw new Error(`store ipfs failed: ${response?.status} ${lastError}`)
    }
}
