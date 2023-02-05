// from https://chainid.network/chains.json

const evmNetworks: Record<number, any> = {
    1: {
        name: "ethereum",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
        },
        rpc: [
            "https://rpc.flashbots.net",
            "https://singapore.rpc.blxrbdn.com",
            "https://rpc.ankr.com/eth",
        ],
        explorers: [
            {
                name: "etherscan",
                url: "https://etherscan.io",
                standard: "EIP3091",
            },
        ],
        txConst: {
            blockTimeSec: 15,
        },
        contracts: { git3: "" },
    },
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
            blockTimeSec: 6,
        },
        contracts: { git3: "0x59ef6b2dbfE86CcAaD84E2d8e78177f528521Da9" },
    },
    3141: {
        name: "Filecoin - Hyperspace testnet",
        nativeCurrency: {
            name: "testnet filecoin",
            symbol: "tFIL",
            decimals: 18,
        },
        rpc: [
            "https://api.hyperspace.node.glif.io/rpc/v1",
            //   "https://filecoin-hyperspace.chainstacklabs.com/rpc/v1",
        ],
        explorers: [
            {
                name: "Filfox - Hyperspace",
                url: "https://hyperspace.filfox.info/en",
                standard: "none",
            },
        ],
        txConst: {
            blockTimeSec: 30,
        },
        contracts: { git3: "0xF56A1dd941667911896B9B872AC79E56cfc6a3dB" },
    },
}

export default evmNetworks
