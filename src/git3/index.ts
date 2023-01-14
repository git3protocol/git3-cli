import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'fs'
import { ethers } from 'ethers'
import { Command } from 'commander'
import bip39 from 'bip39'
import inquirer from 'inquirer'
import parse from 'parse-git-config'
import { importActions, generateActions } from './actions.js'
import abis from "../config/abis.js"
import network from "../config/evm-network.js"
const program = new Command()

program
  .name('git3')
  .description('git3 mangement tool')
  .version('0.1.0')

program.command('generate')
  .alias('gen')
  .alias('new')
  .description('generate a cryto wallet to use git3')
  .action(() => {
    inquirer.prompt(generateActions).then(answers => {
      const { keyType, name } = answers
      const walletType = keyType === 'private key' ? 'privateKey' : 'mnemonic'

      const keyPath = process.env.HOME + "/.git3/keys"
      mkdirSync(keyPath, { recursive: true })

      if (readdirSync(keyPath).includes(name)) {
        console.error(`wallet ${name} already exists`)
        return
      }

      const mnemonic = bip39.generateMnemonic()
      const wallet = keyType === 'private key'
        ? ethers.Wallet.createRandom()
        : ethers.Wallet.fromMnemonic(mnemonic)

      const content = `${walletType}\n${keyType === 'private key' ? wallet.privateKey : mnemonic}\n`
      writeFileSync(`${keyPath}/${name}`, content)
      return
    })
  })

program.command('list', { isDefault: true })
  .alias('ls')
  .description('list all wallets in user folder ~/.git3/keys')
  .option('-r, --raw', 'output raw wallet data with pravate key / mnemonic')
  .action(params => {

    const keyPath = process.env.HOME + "/.git3/keys"
    mkdirSync(keyPath, { recursive: true })
    const wallets = readdirSync(keyPath)

    if (wallets.length === 0) {
      console.log('No wallet found, you can generate one use <git3 new>')
    }

    wallets.forEach(file => {
      const content = readFileSync(`${keyPath}/${file}`).toString()


      if (params.raw) {
        console.log(`[${file}]`)
        console.log(`  ${content.split('\n')[0]} - ${content.split('\n')[1]}`)
        console.log('\t')
        return
      }

      console.log(`[${file}]`)
      const [walletType, key] = content.split('\n')
      const etherWallet = walletType === 'privateKey'
        ? new ethers.Wallet(key)
        : ethers.Wallet.fromMnemonic(key)
      const address = etherWallet.address
      console.log(`address: ${address}`)
      console.log('\t')
    })
  })

program.command('import')
  .description('import a wallet from a private key or mnemonic')
  .action(() => {
    inquirer.prompt(importActions).then(answers => {
      const { keyType, key, name } = answers
      const walletType = keyType === 'private key' ? 'privateKey' : 'mnemonic'
      const keyPath = process.env.HOME + "/.git3/keys"
      mkdirSync(keyPath, { recursive: true })

      if (readdirSync(keyPath).includes(name)) {
        console.error(`wallet ${name} already exists`)
        return
      }

      const content = `${walletType}\n${key}\n`
      writeFileSync(`${keyPath}/${name}`, content)
      return
    })
  })

program.command('delete')
  .description('delete a wallet')
  .action(() => {
    const keyPath = process.env.HOME + "/.git3/keys"
    mkdirSync(keyPath, { recursive: true })
    const wallets = readdirSync(keyPath)

    if (wallets.length === 0) {
      console.error('No wallet found, you can generate one with `git3 generate`')
      return
    }

    inquirer.prompt([
      {
        type: 'list',
        name: 'wallet',
        message: 'Select wallet to delete',
        choices: wallets
      }
    ]).then(answers => {
      const { wallet } = answers
      rmSync(`${keyPath}/${wallet}`)
    })
  })

program.command('create')
  .argument('[wallet]', 'wallet to use', 'default')
  .argument('[repo]', 'repo name to create')
  .description('create a new repo')
  .action((wallet, repo) => {

    const keyPath = process.env.HOME + "/.git3/keys"
    mkdirSync(keyPath, { recursive: true })
    const content = readFileSync(`${keyPath}/${wallet}`).toString()

    const [walletType, key] = content.split('\n')
    const provider = new ethers.providers.JsonRpcProvider('https://galileo.web3q.io:8545');

    let etherWallet = walletType === 'privateKey'
      ? new ethers.Wallet(key)
      : ethers.Wallet.fromMnemonic(key)

    etherWallet = etherWallet.connect(provider)
    let net = network[3334]
    const contract = new ethers.Contract(
      net.contracts.git3,
      abis.ETHStorage,
      etherWallet)


    contract.repoNameToOwner(Buffer.from(repo))
      .then((res: any) => { console.log(res) })
      .catch((err: any) => { console.error(err) })
    contract.createRepo(Buffer.from(repo))
      .then((res: any) => { console.log(res) })
      .catch((err: any) => { console.error(err) })

  })

program.command('info')
  .argument('[wallet]', 'wallet you want to get info', 'default')
  .description('get info of a wallet')
  .action(wallet => {

    const keyPath = process.env.HOME + "/.git3/keys"
    mkdirSync(keyPath, { recursive: true })

    const content = readFileSync(`${keyPath}/${wallet}`).toString()
    const [walletType, key] = content.split('\n')
    const provider = new ethers.providers.JsonRpcProvider('https://galileo.web3q.io:8545');

    let etherWallet = walletType === 'privateKey'
      ? new ethers.Wallet(key)
      : ethers.Wallet.fromMnemonic(key)

    etherWallet = etherWallet.connect(provider)
    const address = etherWallet.address

    etherWallet.getBalance()
      .then(balance => {
        console.log(`wallet:  ${wallet}`)
        console.log(`address: ${address}`)
        console.log(`balance: ${ethers.utils.formatUnits(balance)} eth`)
      })
      .catch(err => {
        console.error(err)
        return
      })
  })

program.command('set-wallet')
  .alias('set')
  .argument('<git3>', 'git3 remote')
  .argument('[wallet]', 'wallet you want to bind', 'default')
  .description('bind git3 remotes with a wallet')
  .action((git3, wallet) => {
    const currentConfig = parse.sync()

    const existingRemote = currentConfig[`remote "${git3}"`]
    const keyPath = process.env.HOME + "/.git3/keys"
    mkdirSync(keyPath, { recursive: true })

    if (!existsSync(`${keyPath}/${wallet}`)) {
      console.error(`wallet ${wallet} not found, use <git3 new> to generate one`)
      return
    }

    if (existingRemote) {
      const newConfig = {
        ...currentConfig,
        [`remote "${git3}"`]: {
          ...existingRemote,
          wallet
        }
      }

      // console.log(newConfig)
      // const writer = createWriteStream('config', 'w')
      let newConfigText = ''
      Object.keys(newConfig).forEach(key => {
        newConfigText += `[${key}]\n`
        Object.keys(newConfig[key]).forEach(subKey => {
          newConfigText += `\t${subKey} = ${newConfig[key][subKey]}\n`
        })
      })
      let path = parse.resolveConfigPath("global") || ""
      writeFileSync(path, newConfigText)
    } else {
      console.error(`remote ${git3} not found`)
      console.error('you can add a remote with `git remote add <name> <url>')
    }
  })

program.parse()
