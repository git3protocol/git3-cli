// from https://chainid.network/chains.json

const evmNetworks: Record<number, any> = {
    // 1: {
    //     name: "Ethereum",
    //     nativeCurrency: {
    //         name: "Ether",
    //         symbol: "ETH",
    //         decimals: 18,
    //     },
    //     rpc: [
    //         "https://rpc.flashbots.net",
    //         "https://singapore.rpc.blxrbdn.com",
    //         "https://rpc.ankr.com/eth",
    //     ],
    //     explorers: [
    //         {
    //             name: "etherscan",
    //             url: "https://etherscan.io",
    //             standard: "EIP3091",
    //         },
    //     ],
    //     txConst: {
    //         blockTimeSec: 15,
    //     },
    //     contracts: { git3: "" },
    // },
    // 5: {
    //     name: "Goerli",
    //     rpc: ["https://eth-goerli.g.alchemy.com/v2/asrXwNuiK9my-cZJYZ_ooo4q-lDw8HLm"],
    //     nativeCurrency: {
    //         name: "Goerli Ether",
    //         symbol: "ETH",
    //         decimals: 18,
    //     },
    //     explorers: [
    //         {
    //             name: "etherscan-goerli",
    //             url: "https://goerli.etherscan.io",
    //             standard: "EIP3091",
    //         },
    //     ],
    //     txConst: {
    //         blockTimeSec: 12,
    //         rbfTimes: 6,
    //         boardcastTimes: 5,
    //     },
    //     contracts: { git3: "0x51bb7F23193b88696D25EAec7E3293a2C96e55Ee" },
    // },
    // 3141: {
    //     name: "Filecoin - Hyperspace testnet",
    //     nativeCurrency: {
    //         name: "testnet filecoin",
    //         symbol: "tFIL",
    //         decimals: 18,
    //     },
    //     rpc: [
    //         "https://api.hyperspace.node.glif.io/rpc/v1",
    //         //   "https://filecoin-hyperspace.chainstacklabs.com/rpc/v1",
    //     ],
    //     explorers: [
    //         {
    //             name: "Filfox - Hyperspace",
    //             url: "https://hyperspace.filfox.info/en",
    //             standard: "none",
    //         },
    //     ],
    //     txConst: {
    //         blockTimeSec: 30,
    //         boardcastTimes: 5,
    //     },
    //     contracts: { git3: "0xF56A1dd941667911896B9B872AC79E56cfc6a3dB" },
    // },
    3334: {
        name: "Web3Q Galileo",
        nativeCurrency: {
            name: "Web3Q",
            symbol: "W3Q",
            decimals: 18,
        },
        rpc: ["https://galileo.web3q.io:8545"],
        explorers: [
            {
                name: "w3q-galileo",
                url: "https://explorer.galileo.web3q.io",
                standard: "EIP3091",
            },
        ],
        txConst: {
            blockTimeSec: 7,
            rbfTimes: 5,
            boardcastTimes: 15,
        },
        contracts: { factory: "0x96f7849C6D0EB09024e482Cc9c249096e3368a16" },
    },
    421613: {
        name: "Arbitrum - Goerli",
        nativeCurrency: {
            name: "Arbitrum Ether",
            symbol: "ETH",
            decimals: 18,
        },
        rpc: [
            "https://goerli-rollup.arbitrum.io/rpc",
            "https://arb-goerli.g.alchemy.com/v2/XT-0xyP5nTP1ltJ0MRBzvO-K9taRwt9o",
        ],
        explorers: [
            {
                name: "arbiscan-goerli",
                url: "https://goerli.arbiscan.io",
                standard: "none",
            },
        ],
        txConst: {
            blockTimeSec: 3,
            rbfTimes: 5,
            boardcastTimes: 10,
        },
        contracts: { factory: "0x6b7f49b32131288D1833929FBa35bb29d384c3D3" },
    },
}

export default evmNetworks
