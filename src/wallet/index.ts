import { mkdirSync, readFileSync } from "fs"
import { ethers } from 'ethers'

export function getWallet(sender: string | null): ethers.Wallet {
  // Todo: according sender address to select wallet, if sender==null then use default wallet
  const wallet = 'default'

  const keyPath = process.env.HOME + "/.git3/keys"
  mkdirSync(keyPath, { recursive: true })

  const content = readFileSync(`${keyPath}/${wallet}`).toString()
  const [walletType, key] = content.split('\n')

  let etherWallet = walletType === 'privateKey'
    ? new ethers.Wallet(key)
    : ethers.Wallet.fromMnemonic(key)

  return etherWallet
}
