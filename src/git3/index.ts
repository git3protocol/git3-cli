import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "fs"
import { ethers } from "ethers"
import { Command } from "commander"
import bip39 from "bip39"
import inquirer from "inquirer"
import { importActions, generateActions,createHubActions,HubMemberActions } from "./actions.js"
import network from "../config/evm-network.js"
import { explorerTxUrl, getWallet, randomRPC, setupContract } from "../common/wallet.js"
import { parseGit3URI } from "../common/git3-protocol.js"
import { TxManager } from "../common/tx-manager.js"
import nameServices from "../config/name-services.js"
import abis from "../config/abis.js"

const program = new Command()

program.name("git3").description("git3 mangement tool").version("0.1.0")

let wallet = program
    .command("wallet")
    .description("wallet [create/import/delete/list]")

let hub = program
    .command("hub")
    .description("hub [create/join/list/members/add-member/remove-member]")

let repo = program
    .command("repo")
    .description("repo [create/members/add-member/remove-member]")

wallet
    .command("create")
    .description("generate a cryto wallet to use git3")
    .action(() => {
        inquirer.prompt(generateActions).then((answers) => {
            const { keyType, name } = answers
            const walletType = keyType === "private key" ? "privateKey" : "mnemonic"

            const keyPath = process.env.HOME + "/.git3/keys"
            mkdirSync(keyPath, { recursive: true })

            if (readdirSync(keyPath).includes(name)) {
                console.error(`wallet ${name} already exists`)
                return
            }

            const mnemonic = bip39.generateMnemonic()
            const wallet =
                keyType === "private key"
                    ? ethers.Wallet.createRandom()
                    : ethers.Wallet.fromMnemonic(mnemonic)

            const content = `${walletType}\n${
                keyType === "private key" ? wallet.privateKey : mnemonic
            }\n`
            writeFileSync(`${keyPath}/${name}`, content)
            return
        })
    })

wallet
    .command("list")
    .description("list all wallets in user folder ~/.git3/keys")
    .option("-r, --raw", "output raw wallet data with pravate key / mnemonic")
    .action((params) => {
        const keyPath = process.env.HOME + "/.git3/keys"
        mkdirSync(keyPath, { recursive: true })
        const wallets = readdirSync(keyPath)

        if (wallets.length === 0) {
            console.log("No wallet found, you can generate one use <git3 new>")
        }

        wallets.forEach((file) => {
            const content = readFileSync(`${keyPath}/${file}`).toString()

            if (params.raw) {
                console.log(`[${file}]`)
                console.log(`  ${content.split("\n")[0]} - ${content.split("\n")[1]}`)
                console.log("\t")
                return
            }

            console.log(`[${file}]`)
            const [walletType, key] = content.split("\n")
            const etherWallet =
                walletType === "privateKey"
                    ? new ethers.Wallet(key)
                    : ethers.Wallet.fromMnemonic(key)
            const address = etherWallet.address
            console.log(`address: ${address}`)
            console.log("\t")
        })
    })

wallet
    .command("import")
    .description("import a wallet from a private key or mnemonic")
    .action(() => {
        inquirer.prompt(importActions).then((answers) => {
            const { keyType, key, name } = answers
            const walletType = keyType === "private key" ? "privateKey" : "mnemonic"
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

wallet
    .command("delete")
    .description("delete a wallet")
    .action(() => {
        const keyPath = process.env.HOME + "/.git3/keys"
        mkdirSync(keyPath, { recursive: true })
        const wallets = readdirSync(keyPath)

        if (wallets.length === 0) {
            console.error("No wallet found, you can generate one with `git3 generate`")
            return
        }

        inquirer
            .prompt([
                {
                    type: "list",
                    name: "wallet",
                    message: "Select wallet to delete",
                    choices: wallets,
                },
            ])
            .then((answers) => {
                const { wallet } = answers
                rmSync(`${keyPath}/${wallet}`)
            })
    })

wallet
    .command("info")
    .argument("[wallet]", "wallet you want to get info", "default")
    .description("get info of a wallet")
    .action((wallet) => {
        let etherWallet = getWallet(wallet)

        const address = etherWallet.address

        console.log(`wallet:  ${wallet}`)
        console.log(`address: ${address}`)

        for (let [_, net] of Object.entries(network)) {
            const provider = new ethers.providers.JsonRpcProvider(randomRPC(net.rpc))
            const balance = provider.getBalance(address)
            balance.then((res) => {
                console.log(
                    `[${net.name}] balance: ${ethers.utils.formatUnits(
                        res,
                        net.nativeCurrency.decimals
                    )} ${net.nativeCurrency.symbol}`
                )
            })
        }
    })


hub
    .command("create")
    .argument("<chain>", "chain name or chain id")
    .description("create a new hub")
    .action(async (chain) => {


        let answers = await inquirer.prompt(createHubActions)
        const {permissionless} = answers
        let isPermissionless = permissionless === "yes"? true:false

        console.log(`creating hub with permissionless:${isPermissionless}  ...`)
        let netConfig, chainId
        chainId = parseInt(chain)
        if (chainId) {
            netConfig = network[chainId]
        } else {
            let ns = nameServices[chain]
            if (!ns) throw new Error(`invalid name service ${chain}`)
            chainId = ns.chainId
            netConfig = network[chainId]
        }

        const wallet = await getWallet()
        let rpc = randomRPC(netConfig.rpc)
        const provider = new ethers.providers.JsonRpcProvider(rpc)

        let factory = setupContract(provider, netConfig.contracts.factory, abis.Factory, wallet)
        let txManager = new TxManager(factory, chainId, netConfig.txConst)
        let receipt = await txManager.SendCall("createHub", [isPermissionless])
        // let CreateHubEvent = factory.interface.getEvent("CreateHub");
        console.log(explorerTxUrl(receipt.transactionHash, netConfig.explorers))

        let events = receipt.logs
            .map((log: any) => {
                try {
                    return factory.interface.parseLog(log)
                } catch (e) {
                    return null
                }
            })
            .filter((item: any) => item !== null && item.name === "CreateHub")

        console.log("hub address:", events[0].args.hub)
        console.log("hub owner:", events[0].args.creator)
    })

wallet
    .command("clear")
    .description("clear pending nonce")
    .argument("<uri>", "ex: default@git3.w3q")
    .argument("[num]", "number of pending nonce to clear", 1)
    .action(async (uri, num) => {
        if (!uri.startsWith("git3://")) {
            uri = "git3://" + uri
        }
        const protocol = await parseGit3URI(uri, { skipRepoName: true })
        const txManager = new TxManager(protocol.hub, protocol.chainId, protocol.netConfig.txConst)
        let nonce = await protocol.wallet.getTransactionCount()
        console.log(`current nonce: ${nonce}`)
        await txManager.clearPendingNonce(num)
        nonce = await protocol.wallet.getTransactionCount()
        console.log(`current nonce: ${nonce}`)
    })

// =============================Hub Commands===================================
hub
    .command("join")
    .argument("<hub>", "hub_name.NS or hub_address:chain_id")
    .description("join a permissionless hub")
    .action(async (hub) => {
        let protocol = await parseGit3URI(hub, { ignoreProtocolHeader: true, skipRepoName: true })
        let isPermissionless = await protocol.hub.permissionless()
        if (!isPermissionless) {
            console.error(`hub ${protocol.hubAddress} is not permissionless`)
            return
        }
        const txManager = new TxManager(protocol.hub, protocol.chainId, protocol.netConfig.txConst)
        let receipt = await txManager.SendCall("permissionlessJoin", [])
        console.log(explorerTxUrl(receipt.transactionHash, protocol.netConfig.explorers))
    })

hub
    .command("add-member")
    .argument("<member address>", "member address which will be added to the hub")
    .option("-u, --uri <uri>", "hub_name.NS or hub_address:chain_id")
    .description("add a manager/contributor into hub")
    .action(async (member,options) => {

        let answers = await inquirer.prompt(HubMemberActions)
        let memberIsManager = answers.role === 'manager' ? true: false
        let protocol = await parseGit3URI(options.uri, { ignoreProtocolHeader: true, skipRepoName: true })

        if (memberIsManager){
            let [isAdmin,isManager,isContributor] = await protocol.hub.memberRole(protocol.wallet.address)
            if (!isAdmin) {
                let hubName = protocol.ns
                    ? `${protocol.nsName}.${protocol.nsDomain}`
                    : protocol.hubAddress
                console.error(`[addManager] can only be executed with the admin authority of this hub: ${hubName}`)
                return
            }

            [isAdmin,isManager,isContributor] = await protocol.hub.memberRole(member)
            if (isManager) {
                let hubName = protocol.ns
                    ? `${protocol.nsName}.${protocol.nsDomain}`
                    : protocol.hubAddress
                console.error(`${member} is already a manager to hub: ${hubName}`)
                return
            }

            const txManager = new TxManager(protocol.hub, protocol.chainId, protocol.netConfig.txConst)
            let receipt = await txManager.SendCall("addManager", [member])
            console.log(explorerTxUrl(receipt.transactionHash, protocol.netConfig.explorers))
        }else{
            let [isAdmin,isManager,isContributor] = await protocol.hub.memberRole(protocol.wallet.address)
            if (!isManager) {
                let hubName = protocol.ns
                    ? `${protocol.nsName}.${protocol.nsDomain}`
                    : protocol.hubAddress
                console.error(`[addContributor] can only be executed with the manager authority of this hub: ${hubName}`)
                return
            }
    
            [isAdmin,isManager,isContributor] = await protocol.hub.memberRole(member)
            if (isContributor) {
                let hubName = protocol.ns
                    ? `${protocol.nsName}.${protocol.nsDomain}`
                    : protocol.hubAddress
                console.error(`${member} is already a contributor to hub: ${hubName}`)
                return
            }
            const txManager = new TxManager(protocol.hub, protocol.chainId, protocol.netConfig.txConst)
            let receipt = await txManager.SendCall("addContributor", [member])
            console.log(explorerTxUrl(receipt.transactionHash, protocol.netConfig.explorers))
        }
    
    })



program
    .command("removeManager")
    .argument("<manager address>", "manager address")
    .option("-u, --uri <uri>", "hub_name.NS or hub_address:chain_id")
    .description("remove a manager/contributor from hub")
    .action(async (member,options) => {

        let answers = await inquirer.prompt(HubMemberActions)
        let memberIsManager = answers.role === 'manager' ? true: false
        let protocol = await parseGit3URI(options.uri, { ignoreProtocolHeader: true, skipRepoName: true })

        if (memberIsManager){
            let [isAdmin,isManager,isContributor] = await protocol.hub.memberRole(protocol.wallet.address)
            if (!isAdmin) {
                let hubName = protocol.ns
                    ? `${protocol.nsName}.${protocol.nsDomain}`
                    : protocol.hubAddress
                console.error(`[removeManager] can only be executed with the admin authority of this hub: ${hubName}`)
                return
            }

            [isAdmin,isManager,isContributor] = await protocol.hub.memberRole(member)
            if (!isManager) {
                let hubName = protocol.ns
                    ? `${protocol.nsName}.${protocol.nsDomain}`
                    : protocol.hubAddress
                console.error(`${member} is not a manager to hub: ${hubName}`)
                return
            }

            const txManager = new TxManager(protocol.hub, protocol.chainId, protocol.netConfig.txConst)
            let receipt = await txManager.SendCall("removeManager", [member])
            console.log(explorerTxUrl(receipt.transactionHash, protocol.netConfig.explorers))
        }else{
            let [isAdmin,isManager,isContributor] = await protocol.hub.memberRole(protocol.wallet.address)
            if (!isManager) {
                let hubName = protocol.ns
                    ? `${protocol.nsName}.${protocol.nsDomain}`
                    : protocol.hubAddress
                console.error(`[removeContributor] can only be executed with the manager authority of this hub: ${hubName}`)
                return
            }

            [isAdmin,isManager,isContributor] = await protocol.hub.memberRole(member)
            if (!isContributor) {
                let hubName = protocol.ns
                    ? `${protocol.nsName}.${protocol.nsDomain}`
                    : protocol.hubAddress
                console.error(`${member} is not a contributor to hub: ${hubName}`)
                return
            }
            const txManager = new TxManager(protocol.hub, protocol.chainId, protocol.netConfig.txConst)
            let receipt = await txManager.SendCall("removeContributor", [member])
            console.log(explorerTxUrl(receipt.transactionHash, protocol.netConfig.explorers))
        }
        
    })

// =============================Repo Commands===================================

repo
    .command("create")
    .argument("<uri>", "ex: git3.w3q/repo_name or hub_addr:chainid/repo_name")
    .description("create a new repo")
    .action(async (uri) => {
        const protocol = await parseGit3URI(uri, { ignoreProtocolHeader: true })

        let isMember = await protocol.hub.membership(protocol.wallet.address)
        if (!isMember) {
            let hubName = protocol.ns
                ? `${protocol.nsName}.${protocol.nsDomain}`
                : protocol.hubAddress
            console.error(`you are not a member of this hub: ${hubName}`)
            let isPermissionless = await protocol.hub.permissionless()
            if (isPermissionless) {
                console.error(
                    `this hub is permissionless, you can join it with: git3 join ${hubName}`
                )
            } else {
                console.error(
                    `this hub is not permissionless, you can ask the hub owner to add you as a member`
                )
            }
            return
        }

        let owner = await protocol.hub.repoOwner(Buffer.from(protocol.repoName))

        if (owner != "0x0000000000000000000000000000000000000000") {
            console.error(`repo ${protocol.repoName} already exists`)
            return
        }

        console.log(`creating repo ${protocol.repoName} on ${protocol.netConfig.name}...`)
        const txManager = new TxManager(protocol.hub, protocol.chainId, protocol.netConfig.txConst)
        let receipt = await txManager.SendCall("createRepo", [Buffer.from(protocol.repoName)])

        console.log(explorerTxUrl(receipt.transactionHash, protocol.netConfig.explorers))
        console.log(`repo ${protocol.repoName} created.`)
    })


repo
    .command("members")
    .argument("<uri>","ex: git3.w3q/repo_name or hub_addr:chainid/repo_name")
    .description("get all members information of the repository")
    .action(async (uri) => {
        let protocol = await parseGit3URI(uri, { ignoreProtocolHeader: true, skipRepoName: true })
        let owner = await protocol.hub.repoOwner(Buffer.from(protocol.repoName))
        let contributors = await protocol.hub.repoContributors(Buffer.from(protocol.repoName))

        console.log(`owner:${owner} \ncontributors:${contributors}`)
    })

repo
    .command("add-member")
    .argument("<con addr>","contributor address")
    .option("-u, --uri <uri>","ex: git3.w3q/repo_name or hub_addr:chainid/repo_name")
    .description("add a contributor into the specified repository")
    .action(async (conAddr,options) => {
        let protocol = await parseGit3URI(options.uri, { ignoreProtocolHeader: true, skipRepoName: true })
        let owner = await protocol.hub.repoOwner(Buffer.from(protocol.repoName))
        if (owner != protocol.wallet.address){
            let hubName = protocol.ns
                ? `${protocol.nsName}.${protocol.nsDomain}`
                : protocol.hubAddress
            console.error(`[repo addContributor] can only be executed with the owner authority of this repository:${protocol.repoName}-hub:${hubName}`)
        }
        const txManager = new TxManager(protocol.hub, protocol.chainId, protocol.netConfig.txConst)
        let receipt = await txManager.SendCall("addRepoContributor", [Buffer.from(protocol.repoName),conAddr])
        console.log(explorerTxUrl(receipt.transactionHash, protocol.netConfig.explorers))
    })

repo
    .command("remove-member")
    .argument("<con addr>","contributor address")
    .option("-u, --uri <uri>","ex: git3.w3q/repo_name or hub_addr:chainid/repo_name")
    .description("remove a contributor from the specified repository")
    .action(async (conAddr,options) => {
        let protocol = await parseGit3URI(options.uri, { ignoreProtocolHeader: true, skipRepoName: true })
        let owner = await protocol.hub.repoOwner(Buffer.from(protocol.repoName))
        if (owner != protocol.wallet.address){
            let hubName = protocol.ns
                ? `${protocol.nsName}.${protocol.nsDomain}`
                : protocol.hubAddress
            console.error(`[repository removeContributor] can only be executed with the owner authority of this repository:${protocol.repoName}-hub:${hubName}`)
        }
        const txManager = new TxManager(protocol.hub, protocol.chainId, protocol.netConfig.txConst)
        let receipt = await txManager.SendCall("removeRepoContributor", [Buffer.from(protocol.repoName),conAddr])
        console.log(explorerTxUrl(receipt.transactionHash, protocol.netConfig.explorers))
    })

// Todo: set-wallet temporarily useless
// program
//     .command("set-wallet")
//     .alias("set")
//     .argument("<git3>", "git3 remote")
//     .argument("[wallet]", "wallet you want to bind", "default")
//     .description("bind git3 remotes with a wallet")
//     .action((git3, wallet) => {
//         const currentConfig = parse.sync()

//         const existingRemote = currentConfig[`remote "${git3}"`]
//         const keyPath = process.env.HOME + "/.git3/keys"
//         mkdirSync(keyPath, { recursive: true })

//         if (!existsSync(`${keyPath}/${wallet}`)) {
//             console.error(
//                 `wallet ${wallet} not found, use <git3 new> to generate one`
//             )
//             return
//         }

//         if (existingRemote) {
//             const newConfig = {
//                 ...currentConfig,
//                 [`remote "${git3}"`]: {
//                     ...existingRemote,
//                     wallet,
//                 },
//             }

//             // console.log(newConfig)
//             // const writer = createWriteStream('config', 'w')
//             let newConfigText = ""
//             Object.keys(newConfig).forEach((key) => {
//                 newConfigText += `[${key}]\n`
//                 Object.keys(newConfig[key]).forEach((subKey) => {
//                     newConfigText += `\t${subKey} = ${newConfig[key][subKey]}\n`
//                 })
//             })
//             let path = parse.resolveConfigPath("global") || ""
//             writeFileSync(path, newConfigText)
//         } else {
//             console.error(`remote ${git3} not found`)
//             console.error(
//                 "you can add a remote with `git remote add <name> <url>"
//             )
//         }
//     })

program.parse()
