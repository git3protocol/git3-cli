import { ethers } from "ethers"
import nameServices from "../config/name-services.js"
import { ETHStorage } from "../storage/ETHStorage.js"
import { SLIStorage } from "../storage/SLIStorage.js"
import { getWallet, randomRPC, setupContract } from "./wallet.js"
import Url from "url-parse"
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
    hub: ethers.Contract
    storageClass: any
    ns?: Record<string, any>
    nsName?: string
    nsDomain?: string
}

type Option = {
    skipRepoName?: boolean
    ignoreProtocolHeader?: boolean
}

export async function parseGit3URI(
    uri: string,
    option: Option = { skipRepoName: false, ignoreProtocolHeader: false }
): Promise<Git3Protocol> {
    if (option.ignoreProtocolHeader) {
        if (!uri.startsWith("git3://")) {
            uri = "git3://" + uri
        }
    }
    console.error("uri", uri)
    const url = new Url(uri)
    let sender = url.username || "default"
    let chainId = url.port ? parseInt(url.port) : null
    let hostname = url.hostname
    let hubAddress
    let nsName, nsDomain, ns
    if (!hostname) throw new Error("invalid git3 uri, no hub address")
    let repoName = url.pathname.slice(1)
    if (!option.skipRepoName && !repoName) throw new Error("invalid git3 uri, no repo name")

    if (hostname.indexOf(".") < 0) {
        if (hostname.startsWith("0x")) {
            hubAddress = hostname
        } else {
            throw new Error("invalid git3 uri, hub must be NS or address")
        }
    } else {
        ;[nsName, nsDomain] = hostname.split(".")
        ns = nameServices[nsDomain]
        if (!ns) throw new Error(`invalid name service ${nsDomain}`)
        chainId = chainId || ns.chainId
        // Todo: temporary resolve name service

        let resolverAddress = ns["resolver"]
        let nsContract = setupContract(
            new ethers.providers.JsonRpcProvider("https://goerli-rollup.arbitrum.io/rpc"),
            resolverAddress,
            abis.NameService
        )
        hubAddress = await nsContract.nameHub([nsName, nsDomain].join("."))
        if (hubAddress == "0x0000000000000000000000000000000000000000")
            throw new Error(`${nsName} not found`)
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
        abi = abis.Hub
    } else {
        storageClass = SLIStorage
        abi = abis.Hub
    }
    let rpc = randomRPC(netConfig.rpc)
    const provider = new ethers.providers.JsonRpcProvider(rpc)

    let hub = setupContract(provider, hubAddress, abi, wallet)
    wallet = wallet.connect(hub.provider)

    return {
        sender,
        senderAddress,
        hubAddress,
        repoName,
        chainId,
        netConfig,
        wallet,
        hub: hub,
        storageClass,
        ns,
        nsName,
        nsDomain,
    }
}
