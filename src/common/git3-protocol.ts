import { ethers } from "ethers"
import nameServices from "../config/name-services.js"
import { ETHStorage } from "../storage/ETHStorage.js"
import { SLIStorage } from "../storage/SLIStorage.js"
import { getWallet, randomRPC, setupContract } from "./wallet.js"
import network from "../config/evm-network.js"
import abis from "../config/abis.js"

export type Git3Protocol = {
    sender: string
    senderAddress: string
    hubAddress: string
    repoName: string
    chainId: number
    netConfig: Record<string, any>
    wallet: ethers.Wallet
    contract: ethers.Contract
    storageClass: any
    ns?: Record<string, any>
    nsName?: string
    nsDomain?: string
}

type Option = {
    skipRepoName: boolean
}

export function parseGit3URI(
    uri: string,
    option: Option = { skipRepoName: false }
): Git3Protocol {
    const url = new URL(uri)
    let sender = url.username || "default"
    let chainId = url.port ? parseInt(url.port) : null
    let hub = url.hostname
    let hubAddress
    let nsName, nsDomain, ns
    if (!hub) throw new Error("invalid git3 uri, no hub address")
    let repoName = url.pathname.slice(1)
    if (!option.skipRepoName && !repoName)
        throw new Error("invalid git3 uri, no repo name")

    if (hub.indexOf(".") < 0) {
        if (url.hostname.startsWith("0x")) {
            hubAddress = url.hostname
        } else {
            throw new Error("invalid git3 uri, hub must be NS or address")
        }
    } else {
        ;[nsName, nsDomain] = url.hostname.split(".")
        ns = nameServices[nsDomain]
        if (!ns) throw new Error("invalid name service")
        chainId = chainId || ns.chainId
        // Todo: resolve name service
        // hubAddress = ns.resolver()
    }

    if (!chainId) throw new Error("invalid git3 uri, no chainId")

    let netConfig = network[chainId]
    if (!netConfig) throw new Error("invalid chainId")

    if (!hubAddress) hubAddress = netConfig.contracts.git3

    let wallet = getWallet(sender)

    let senderAddress = wallet.address

    // route to different storage
    let storageClass, abi
    if (chainId == 3334) {
        storageClass = ETHStorage
        abi = abis.ETHStorage
    } else {
        storageClass = SLIStorage
        abi = abis.SLIStorage
    }
    let rpc = randomRPC(netConfig.rpc)
    const provider = new ethers.providers.JsonRpcProvider(rpc)

    let contract = setupContract(provider, hubAddress, abi, wallet)
    wallet = wallet.connect(contract.provider)

    return {
        sender,
        senderAddress,
        hubAddress,
        repoName,
        chainId,
        netConfig,
        wallet,
        contract,
        storageClass,
        ns,
        nsName,
        nsDomain,
    }
}
