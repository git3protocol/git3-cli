import { Ref, Status, Storage } from "./storage.js"
import { TxManager } from "../common/tx-manager.js"
import { ethers } from "ethers"
import ipfsConf from "../config/ipfs.js"
import axios from "axios"
import { Git3Protocol } from "../common/git3-protocol.js"
import { QueueTask, Retrier } from "../common/queue-task.js"

export class SLIStorage implements Storage {
    repoName: string
    wallet: ethers.Wallet
    contract: ethers.Contract
    txManager: TxManager
    auth: string[]

    batchQueue: Record<string, string>[] = []
    maxBatchSize = 20
    commitTimer: any

    taskRunning = 0
    waitTasks: Promise<void>
    uploadDone: any

    storageTask: QueueTask

    constructor(protocol: Git3Protocol) {
        this.repoName = protocol.repoName
        this.contract = protocol.contract
        this.wallet = protocol.wallet
        this.txManager = new TxManager(this.contract, protocol.chainId, protocol.netConfig.txConst)
        this.auth = [
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGFEQTdCOWFlQTdGNTc2ZDI5NzM0ZWUxY0Q2ODVFMzc2OWNCM2QwRDEiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3NTQ5NDYwMDkzMiwibmFtZSI6ImZ2bS1oYWNrc29uIn0.YBqfsj_LTZSJPKc0OH586avnQNqove_Htzl5rrToXTk",
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDhmOTY1ZjAyRWY1MzkxODBlNDNiQ0M5M0FkZDJDZDI1RjU5RjRiMzIiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3NjY1NDE1MzExMCwibmFtZSI6ImdpdDMifQ.f7vpBmQCMV3VIqWfPtuDNA5G5ThegjVaO4V-GCmK6wg",
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDhmOTY1ZjAyRWY1MzkxODBlNDNiQ0M5M0FkZDJDZDI1RjU5RjRiMzIiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3Njg4ODAzMzIwMCwibmFtZSI6ImdpdDQifQ.HPa-8s6O-DVkFSzvo9QzhEqKl4Hi06NtgjGhglyuzbQ",
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDhmOTY1ZjAyRWY1MzkxODBlNDNiQ0M5M0FkZDJDZDI1RjU5RjRiMzIiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3Njg4ODMzNDQ4NiwibmFtZSI6ImdpdDUifQ.NvGxjtx048uNb0sZXIN3aJfdldISdDllcQq9xq_gAaI",
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDhmOTY1ZjAyRWY1MzkxODBlNDNiQ0M5M0FkZDJDZDI1RjU5RjRiMzIiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3Njg4ODM4NjkxMiwibmFtZSI6ImdpdDYifQ.C4vSfG_sSSwnOzAMfy2ccvvoh4iiFiiC1-ejU5Vo4ek",
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDhmOTY1ZjAyRWY1MzkxODBlNDNiQ0M5M0FkZDJDZDI1RjU5RjRiMzIiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3Njg5MjQ2NDk3MywibmFtZSI6ImdpdDcifQ.4tXjPZxG99LVqhqCklSfSDTxBDeY2dCSsatcLbmrt0o",
        ]

        this.txManager = new TxManager(this.contract, protocol.chainId, protocol.netConfig.txConst)

        this.waitTasks = new Promise((resolve, reject) => {
            this.uploadDone = resolve
        })

        this.storageTask = new QueueTask({
            maxRetry: 30,
            queueInterval: 400,
            maxPending: 100,
            retryInterval: 500,
        })
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
        const res = await Retrier(
            async () => await this.contract.download(Buffer.from(this.repoName), Buffer.from(path)),
            { maxRetry: 10 }
        )
        const buffer = Buffer.from(res.slice(2), "hex")
        const cid = buffer.toString("utf8")
        for (let i = 0; i < ipfsConf.gateways.length; i++) {
            let gateway = ipfsConf.gateways[Math.floor(Math.random() * ipfsConf.gateways.length)] //random get rpc
            try {
                let resault = await Retrier(
                    async () => {
                        const TIMEOUT = 15
                        let response = await axios.get(gateway + cid, {
                            responseType: "arraybuffer",
                            timeout: TIMEOUT * 1000,
                        })
                        if (response.status === 200) {
                            return Buffer.from(response.data)
                        } else {
                            throw new Error(`download failed: ${response.status}`)
                        }
                    },
                    { maxRetry: 3 }
                )
                return [Status.SUCCEED, resault]
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
                this.commitQueue("full")
            } else {
                this.commitTimer = setTimeout(() => {
                    this.commitQueue("timeout")
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
        await this.waitTasks
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
        this.taskRunning += 1

        let queue = this.batchQueue
        this.batchQueue = []

        console.error(`[${reason}] commit queue length ${queue.length}`)
        if (queue.length === 0) return

        let err
        try {
            await this.txManager.SendCall("batchUpload", [
                Buffer.from(this.repoName),
                queue.map((i) => Buffer.from(i.path)),
                queue.map((i) => Buffer.from(i.cid)),
            ])
            err = null
        } catch (error: any) {
            this.txManager.CancelAll()
            console.error(`upload failed: ${error}`)
            err = error
        }
        this.taskRunning -= 1
        if (this.taskRunning === 0) {
            if (err) this.uploadDone(Status.FAILED)
            else this.uploadDone(Status.SUCCEED)
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

    async storeIPFS(data: Buffer): Promise<string> {
        const TIMEOUT = 15
        try {
            let cid = await this.storageTask.run(async () => {
                // let start = Date.now().valueOf()
                let index = Math.floor(Math.random() * this.auth.length)
                try {
                    let response = await axios.post("https://api.nft.storage/upload", data, {
                        headers: {
                            "Content-Type": "application/octet-stream",
                            Authorization: this.auth[index],
                        },
                        timeout: TIMEOUT * 1000,
                    })
                    // let end = Date.now().valueOf()
                    if (response.status == 200) {
                        // console.error(`nft.storage success ${end - start}ms ${index}`)
                        return response.data.value.cid
                    } else {
                        // console.error(
                        //     `nft.storage status ${response.status} ${end - start}ms ${index}`
                        // )
                        throw new Error(`response code: ${response.status}`)
                    }
                } catch (e) {
                    // let end = Date.now().valueOf()
                    // console.error(`nft.storage failed ${end - start}ms ${e} ${index}`)
                    throw new Error(`nft.storage failed: ${e}`)
                }
            })
            return cid
        } catch (e) {
            throw new Error(`store ipfs failed: ${e}`)
        }
    }
}
