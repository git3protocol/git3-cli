import { Ref, Status, Storage } from "./storage.js"
import { ethers } from "ethers"
import { TxManager } from "../common/tx-manager.js"
import { Git3Protocol } from "../common/git3-protocol.js"
import { Retrier } from "../common/queue-task.js"

export class ETHStorage implements Storage {
    repoName: string
    wallet: ethers.Signer
    contract: ethers.Contract
    txManager: TxManager

    constructor(protocol: Git3Protocol) {
        this.repoName = protocol.repoName
        this.contract = protocol.hub
        this.wallet = protocol.wallet
        this.txManager = new TxManager(this.contract, protocol.chainId, protocol.netConfig.txConst)
    }
    async uploadCommit(): Promise<Status> {
        return Promise.resolve(Status.SUCCEED)
    }

    async hasPermission(ref: string): Promise<boolean> {
        let sender = await this.wallet.getAddress()
        let isMember = await this.contract.isRepoMembership(Buffer.from(this.repoName), sender)
        return isMember
    }

    async download(path: string): Promise<[Status, Buffer]> {
        const res = await Retrier(
            async () => await this.contract.download(Buffer.from(this.repoName), Buffer.from(path)),
            { maxRetry: 10 }
        )
        const buffer = Buffer.from(res[0].slice(2), "hex")
        console.error(`=== download file ${path} succeed ===`)
        return [Status.SUCCEED, buffer]
    }

    async upload(path: string, file: Buffer): Promise<Status> {
        try {
            let chunks: Buffer[] = []
            let costs: number[] = []
            const FileChunkSize = 475 * 1024
            const perEthPayStorageSize = 24 * 1024
            const initCodeLen = 280
            if (file.length > FileChunkSize) {
                let uploadedSize = 0
                let nouploadfileSize = file.length
                for (uploadedSize = 0; uploadedSize < file.length; uploadedSize += FileChunkSize) {
                    let newchunk: Buffer
                    let cost: number
                    if (file.length != nouploadfileSize + uploadedSize) {
                        throw new Error(
                            `file.length${file.length} != nouploadfileSize${nouploadfileSize} + uploadedSize${uploadedSize}`
                        )
                    }
                    if (nouploadfileSize < FileChunkSize) {
                        newchunk = Buffer.alloc(nouploadfileSize)
                        file.copy(newchunk, 0, uploadedSize, file.length)
                        cost = Math.ceil((nouploadfileSize + initCodeLen) / perEthPayStorageSize)
                    } else {
                        newchunk = Buffer.alloc(FileChunkSize)
                        file.copy(newchunk, 0, uploadedSize, uploadedSize + FileChunkSize)
                        cost = Math.ceil((FileChunkSize + initCodeLen) / perEthPayStorageSize)
                        nouploadfileSize -= FileChunkSize
                    }
                    chunks.push(newchunk)
                    costs.push(cost)
                }

                chunks.forEach(async (context, index) => {
                    console.error(
                        `=== uploading file chunk ${path} chunkId-${index} chunk_size:${context.length} storage_cost:${costs[index]}-token===`
                    )
                    await this.txManager.SendCall("uploadChunk", [
                        Buffer.from(this.repoName),
                        Buffer.from(path),
                        index,
                        context,
                        { value: ethers.utils.parseEther(costs[index].toString()) },
                    ])
                    console.error(
                        `=== upload file chunk ${path} chunkId-${index} chunk_size:${context.length} storage_cost:${costs[index]}-token Succeed===`
                    )
                })
            } else {
                let cost: number = 0
                if (file.length > perEthPayStorageSize) {
                    cost = Math.ceil(file.length / perEthPayStorageSize)
                }

                console.error(
                    `=== uploading file ${path} file_size ${file.length} storage_cost:${cost}-token===`
                )
                await this.txManager.SendCall("upload", [
                    Buffer.from(this.repoName),
                    Buffer.from(path),
                    file,
                    { value: ethers.utils.parseEther(cost.toString()) },
                ])
                console.error(
                    `=== upload ${path} file_size ${file.length} storage_cost:${cost}-token succeed ===`
                )
            }
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
        const res: string[][] = await Retrier(
            async () => await this.contract.listRepoRefs(Buffer.from(this.repoName)),
            { maxRetry: 3 }
        )
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
            await this.txManager.SendCall("setRepoRef", [
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
