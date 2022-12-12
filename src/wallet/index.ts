// program stomach view picnic because depth ready sight appear spin cream prefer
// selfAddress = 0xd1a98cD2382B8DA25280B380C0b9D85A63aD2818
// contractAddress = '0x2A9B264471b19bAB5faD04807328F0dd4FD5549c'
import { ethers } from "ethers"
import uploader from './uploader.js'

const mnemonic = 'program stomach view picnic because depth ready sight appear spin cream prefer'
const wallet = ethers.Wallet.fromMnemonic(mnemonic)
const contractAddress = '0x2A9B264471b19bAB5faD04807328F0dd4FD5549c'

async function run () {
  const addr = await wallet.getAddress()
  console.log(addr)

  try {
    const res = await uploader.deploy('/Users/kai/Code/git-remote-git3/src/wallet/git', contractAddress, wallet.privateKey)
    console.log(res)
  } catch (error) {
    console.log(error)
  }
}

run()