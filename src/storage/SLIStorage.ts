import { Ref, Status, Storage } from "./storage.js"
import { getWallet } from "../wallet/index.js"
import { TxManager } from "../wallet/tx-manager.js"
import { ethers, Signer } from "ethers"
import { NonceManager } from "@ethersproject/experimental"
import abis from "../config/abis.js"
import network from "../config/evm-network.js"
import ipfsConf from "../config/ipfs.js"
import axios from "axios"

export class SLIStorage implements Storage {
    repoName: string
    wallet: Signer
    contract: ethers.Contract
    provider: ethers.providers.JsonRpcProvider
    auth: string

    txManager: TxManager

    constructor(
        repoName: string,
        chainId: number,
        options: { git3Address: string | null; sender: string | null }
    ) {
        let net = network[chainId]
        if (!net) throw new Error("chainId not supported")

        this.repoName = repoName
        this.wallet = getWallet(options.sender)

        let rpc = net.rpc[Math.floor(Math.random() * net.rpc.length)] //random get rpc

        this.provider = new ethers.providers.JsonRpcProvider(rpc)
        this.wallet = this.wallet.connect(this.provider)
        // this.wallet = new NonceManager(this.wallet)

        let repoAddress = options.git3Address || net.contracts.git3
        this.contract = new ethers.Contract(
            repoAddress,
            abis.SLIStorage,
            this.wallet
        )
        this.auth =
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGFEQTdCOWFlQTdGNTc2ZDI5NzM0ZWUxY0Q2ODVFMzc2OWNCM2QwRDEiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3NTQ5NDYwMDkzMiwibmFtZSI6ImZ2bS1oYWNrc29uIn0.YBqfsj_LTZSJPKc0OH586avnQNqove_Htzl5rrToXTk"

        this.txManager = new TxManager(this.contract, chainId, net.txConst)
    }

    async repoRoles(): Promise<string[]> {
        let owner = await this.contract.repoNameToOwner(
            Buffer.from(this.repoName)
        )
        if (owner === ethers.constants.AddressZero) return []
        return [owner]
    }

    async hasPermission(ref: string): Promise<boolean> {
        let member = await this.repoRoles()
        return member.indexOf(await this.wallet.getAddress()) >= 0
    }

    async download(path: string): Promise<[Status, Buffer]> {
        const res = await this.contract.download(
            Buffer.from(this.repoName),
            Buffer.from(path)
        )
        const buffer = Buffer.from(res[0].slice(2), "hex")
        console.error("buffer", buffer, buffer.toString(), res[0])
        const cid = buffer.toString("utf8")
        for (let i = 0; i < ipfsConf.gateways.length; i++) {
            let gateway =
                ipfsConf.gateways[
                    Math.floor(Math.random() * ipfsConf.gateways.length)
                ] //random get rpc
            try {
                let response = await axios.get(gateway + cid)
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
            await this.txManager.SendCall("upload", [
                Buffer.from(this.repoName),
                Buffer.from(path),
                Buffer.from(cid),
            ])
            console.error(`=== upload ${path} ${cid} succeed ===`)

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
        const res: string[][] = await this.contract.listRefs(
            Buffer.from(this.repoName)
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
        await this.contract.delRef(
            Buffer.from(this.repoName),
            Buffer.from(path)
        )
        return Status.SUCCEED
    }

    async storeIPFS(data: Buffer): Promise<string> {
        let response
        for (let i = 0; i < 10; i++) {
            // Todo: add timeout
            try {
                response = await axios.post(
                    "https://api.nft.storage/upload",
                    data,
                    {
                        headers: {
                            "Content-Type": "application/octet-stream",
                            Authorization: this.auth,
                        },
                    }
                )
                if (response.status == 200) {
                    return response.data.value.cid
                }
            } catch (e) {
                //pass
            }
        }
        throw new Error(`store ipfs failed: ${response?.status}`)
    }
}
