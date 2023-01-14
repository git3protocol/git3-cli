import { Ref, Status, Storage } from "./storage.js"
import { getWallet } from "../wallet/index.js"
import { ethers, Signer } from "ethers"
import { NonceManager } from "@ethersproject/experimental"
import abis from "../config/abis.js"
import network from "../config/evm-network.js"
export class ETHStorage implements Storage {
    repoName: string
    wallet: Signer
    contract: ethers.Contract
    provider: ethers.providers.JsonRpcProvider

    constructor(repoName: string, chainId: number, options: { git3Address: string | null, sender: string | null }) {
        let net = network[chainId]
        if (!net) throw new Error("chainId not supported")

        this.repoName = repoName
        this.wallet = getWallet(options.sender)

        let rpc = net.rpc[Math.floor(Math.random() * net.rpc.length)] //random get rpc

        this.provider = new ethers.providers.JsonRpcProvider(rpc)
        this.wallet = this.wallet.connect(this.provider)
        this.wallet = new NonceManager(this.wallet)

        let repoAddress = options.git3Address || net.contracts.git3
        this.contract = new ethers.Contract(repoAddress, abis.ETHStorage, this.wallet)
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
        const buffer = Buffer.from(res[0].slice(2), 'hex')
        console.error(`=== download file ${path} result ===`)
        // console.error(buffer.toString('utf-8'))
        return [Status.SUCCEED, buffer]
    }

    async upload(path: string, file: Buffer): Promise<Status> {
        try {
            console.error(`=== uploading file ${path} ===`)
            const tx = await this.contract.upload(Buffer.from(this.repoName), Buffer.from(path), file, { gasLimit: 6000000 })
            console.error(`send tx done: ${tx.hash}`)
            await new Promise(r => setTimeout(r, 3000))
            await tx.wait(1)
            console.error(`upload succeed: ${tx.hash}`)
            return Status.SUCCEED
        }
        catch (error: any) {
            console.error(`upload failed ${error.reason ? error.reason : "CALL_EXCEPTION"} : ${path}`)
            return Status.FAILED
        }

    }

    remove(path: string): Promise<Status> {
        throw new Error("Method not implemented.")
    }

    async listRefs(): Promise<Ref[]> {
        const res: string[][] = await this.contract.listRefs(Buffer.from(this.repoName))
        let refs = res.map(i => ({
            ref: Buffer.from(i[1].slice(2), "hex").toString("utf8").slice(this.repoName.length + 1),
            sha: i[0].slice(2)
        }))
        return refs
    }

    async setRef(path: string, sha: string): Promise<Status> {
        try {
            let tx = await this.contract.setRef(Buffer.from(this.repoName), Buffer.from(path), '0x' + sha, { gasLimit: 6000000 })
            await new Promise(r => setTimeout(r, 1000))
            await tx.wait(1)
        }
        catch (error: any) {
            console.error(`ref set failed ${error.reason ? error.reason : "CALL_EXCEPTION"} : ${path}`)
            return Status.FAILED
        }
        return Status.SUCCEED
    }

    async removeRef(path: string): Promise<Status> {
        await this.contract.delRef(Buffer.from(this.repoName), Buffer.from(path))
        return Status.SUCCEED
    }
}
