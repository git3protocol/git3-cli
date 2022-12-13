import { Ref, Status, Storage } from "./storage"
import { getWallet } from "../wallet/index"
import { ethers, Signer } from "ethers"
import { NonceManager } from "@ethersproject/experimental"

const abi = '[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"bytes","name":"name","type":"bytes"}],"name":"countChunks","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"name","type":"string"}],"name":"delRef","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"path","type":"bytes"}],"name":"download","outputs":[{"internalType":"bytes","name":"","type":"bytes"},{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"listRefs","outputs":[{"components":[{"internalType":"bytes20","name":"hash","type":"bytes20"},{"internalType":"string","name":"name","type":"string"}],"internalType":"struct Git3.refData[]","name":"list","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"nameToRefInfo","outputs":[{"internalType":"bytes20","name":"hash","type":"bytes20"},{"internalType":"uint96","name":"index","type":"uint96"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"refs","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"val","type":"uint256"}],"name":"refund","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"refund1","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"path","type":"bytes"}],"name":"remove","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"bytes20","name":"refHash","type":"bytes20"}],"name":"setRef","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"name","type":"bytes"}],"name":"size","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"storageManager","outputs":[{"internalType":"contract IFileOperator","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upload","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"uint256","name":"chunkId","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uploadChunk","outputs":[],"stateMutability":"payable","type":"function"}]'
export class ETHStorage implements Storage {
    repoURI: string
    wallet: Signer
    contract: ethers.Contract
    provider: ethers.providers.JsonRpcProvider

    constructor(repoURI: string) {
        this.repoURI = repoURI
        this.wallet = getWallet()
        this.provider = new ethers.providers.JsonRpcProvider('https://galileo.web3q.io:8545')
        this.wallet = this.wallet.connect(this.provider)
        this.wallet = new NonceManager(this.wallet)
        this.contract = new ethers.Contract('0xb940B75947F64C9fe0b4B2b6c56Fc9DEF03bBb5F', abi, this.wallet)
    }

    async download(path: string): Promise<[Status, Buffer]> {
        const res = await this.contract.download(Buffer.from(path))
        const buffer = Buffer.from(res[0].slice(2), 'hex')
        console.error(`=== download file ${path} result ===`)
        console.error(buffer.toString('utf-8'))
        return [Status.SUCCEED, buffer]
    }

    async upload(path: string, file: Buffer): Promise<Status> {
        const uploadResult = await this.contract.upload(Buffer.from(path), file)
        console.error(`=== upload file ${path} result ===`)
        console.error(uploadResult)
        return Status.SUCCEED
    }

    remove(path: string): Promise<Status> {
        throw new Error("Method not implemented.")
    }

    async listRefs(): Promise<Ref[]> {
        const res: string[][] = await this.contract.listRefs()
        let refs = res.map(i => ({
            ref: i[1],
            sha: i[0].slice(2)
        }))
        return refs
    }

    async setRef(path: string, sha: string): Promise<Status> {
        await this.contract.setRef(path, '0x' + sha)
        return Status.SUCCEED
    }

    removeRef(path: string): Promise<Status> {
        throw new Error("Method not implemented.")
    }
}
