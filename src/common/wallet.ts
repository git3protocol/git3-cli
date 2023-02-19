import { mkdirSync, readFileSync } from "fs"
import { ethers } from "ethers"

export function getWallet(wallet: string | null = "default"): ethers.Wallet {
    if (!wallet) wallet = "default"

    // Todo: 0xaddress find wallet
    const keyPath = process.env.HOME + "/.git3/keys"
    mkdirSync(keyPath, { recursive: true })

    const content = readFileSync(`${keyPath}/${wallet}`).toString()
    const [walletType, key] = content.split("\n")

    let etherWallet =
        walletType === "privateKey" ? new ethers.Wallet(key) : ethers.Wallet.fromMnemonic(key)

    return etherWallet
}

export function setupContract(
    provider: ethers.providers.JsonRpcProvider,
    hubAddress: string,
    abi: string,
    wallet: ethers.Wallet | null = null
): ethers.Contract {
    let contract = new ethers.Contract(hubAddress, abi, provider)
    if (wallet) {
        wallet = wallet.connect(provider)
        contract = contract.connect(wallet)
    }
    return contract
}

export function randomRPC(rpcs: string[]): string {
    return rpcs[Math.floor(Math.random() * rpcs.length)]
}
