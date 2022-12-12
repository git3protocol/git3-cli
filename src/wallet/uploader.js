const fs = require('fs');
const { ethers, ContractFactory } = require("ethers");
const { normalize } = require('eth-ens-namehash');
const sha3 = require('js-sha3').keccak_256;
const { from, mergeMap } = require('rxjs');

const color = require('colors-cli/safe')
const error = color.red.bold;
const notice = color.blue;

const nsAbi = [
  "function pointerOf(bytes memory name) public view returns (address)",
  "function resolver(bytes32 node) public view returns (address)",
];

const resolverAbi = [
  "function webHandler(bytes32 node) external view returns (address)",
  "function text(bytes32 node, string calldata key) external view returns (string memory)"
];

const fileAbi = [
  "function write(bytes memory filename, bytes memory data) public payable",
  "function writeChunk(bytes memory name, uint256 chunkId, bytes memory data) public payable",
  "function files(bytes memory filename) public view returns (bytes memory)",
  "function setDefault(bytes memory _defaultFile) public",
  "function refund() public",
  "function remove(bytes memory name) external returns (uint256)",
  "function countChunks(bytes memory name) external view returns (uint256)",
  "function getChunkHash(bytes memory name, uint256 chunkId) public view returns (bytes32)"
];

const factoryAbi = [
  "event FlatDirectoryCreated(address)",
  "function create() public returns (address)"
];
const flatDirectoryAbi = [
  "constructor(uint8 slotLimit)",
  "function changeOwner(address newOwner) public"
];

const SHORT_NAME_GALILEO = "w3q-g";
const SHORT_NAME_ETHEREUM = "eth";
const SHORT_NAME_GOERLI = "gor";
const SHORT_NAME_SEPOLIA = "sep";
const SHORT_NAME_OPTIMISTIC = "oeth";
const SHORT_NAME_ARBITRUM = "arb1";
const SHORT_NAME_OPTIMISTIC_GOERLI = "ogor";
const SHORT_NAME_ARBITRUM_GOERLI = "arb-goerli";
const SHORT_NAME_EVMOS = "evmos";
const SHORT_NAME_EVMOS_TEST = "evmos-testnet";
const SHORT_NAME_ARBITRUM_NOVE = "arb-nova";
const SHORT_NAME_BINANCE = "bnb";
const SHORT_NAME_BINANCE_TEST = "bnbt";
const SHORT_NAME_AVALANCHE = "avax";
const SHORT_NAME_AVALANCHE_TEST = "fuji";
const SHORT_NAME_FANTOM = "ftm";
const SHORT_NAME_FANTOM_TEST = "tftm";
const SHORT_NAME_HARMONY = "hmy-s0";
const SHORT_NAME_HARMONY_TEST = "hmy-b-s0";
const SHORT_NAME_POLYGON = "matic";
const SHORT_NAME_POLYGON_MUMBAI = "maticmum";
const SHORT_NAME_POLYGON_ZKEVM_TEST = "zkevmtest";
const SHORT_NAME_QUARKCHAIN = "qkc-s0";
const SHORT_NAME_QUARKCHAIN_DEVNET = "qkc-d-s0";

const GALILEO_CHAIN_ID = 3334;
const ETHEREUM_CHAIN_ID = 1;
const GOERLI_CHAIN_ID = 5;
const SEPOLIA_CHAIN_ID = 11155111;
const OPTIMISTIC_CHAIN_ID = 10;
const ARBITRUM_CHAIN_ID = 42161;
const OPTIMISTIC_GOERLI_CHAIN_ID = 420;
const ARBITRUM_GOERLI_CHAIN_ID = 421613;
const EVMOS_CHAIN_ID = 9001;
const EVMOS_TEST_CHAIN_ID = 9000;
const ARBITRUM_NOVE_CHAIN_ID = 42170;
const BINANCE_CHAIN_ID = 56;
const BINANCE_TEST_CHAIN_ID = 97;
const AVALANCHE_CHAIN_ID = 43114;
const AVALANCHE_TEST_CHAIN_ID = 43113;
const FANTOM_CHAIN_ID = 250;
const FANTOM_TEST_CHAIN_ID = 4002;
const HARMONY_CHAIN_ID = 1666600000;
const HARMONY_TEST_CHAIN_ID = 1666700000;
const POLYGON_CHAIN_ID = 137;
const POLYGON_MUMBAI_CHAIN_ID = 80001;
const POLYGON_ZKEVM_TEST_CHAIN_ID = 1402;
const QUARKCHAIN_CHAIN_ID = 100001;
const QUARKCHAIN_DEVNET_CHAIN_ID = 110001;

const NETWORK_MAPING = {
  [SHORT_NAME_GALILEO]: GALILEO_CHAIN_ID,
  [SHORT_NAME_ETHEREUM]: ETHEREUM_CHAIN_ID,
  [SHORT_NAME_GOERLI]: GOERLI_CHAIN_ID,
  [SHORT_NAME_SEPOLIA]: SEPOLIA_CHAIN_ID,
  [SHORT_NAME_OPTIMISTIC]: OPTIMISTIC_CHAIN_ID,
  [SHORT_NAME_ARBITRUM]: ARBITRUM_CHAIN_ID,
  [SHORT_NAME_OPTIMISTIC_GOERLI]: OPTIMISTIC_GOERLI_CHAIN_ID,
  [SHORT_NAME_ARBITRUM_GOERLI]: ARBITRUM_GOERLI_CHAIN_ID,
  [SHORT_NAME_EVMOS]: EVMOS_CHAIN_ID,
  [SHORT_NAME_EVMOS_TEST]: EVMOS_TEST_CHAIN_ID,
  [SHORT_NAME_ARBITRUM_NOVE]: ARBITRUM_NOVE_CHAIN_ID,
  [SHORT_NAME_BINANCE]: BINANCE_CHAIN_ID,
  [SHORT_NAME_BINANCE_TEST]: BINANCE_TEST_CHAIN_ID,
  [SHORT_NAME_AVALANCHE]: AVALANCHE_CHAIN_ID,
  [SHORT_NAME_AVALANCHE_TEST]: AVALANCHE_TEST_CHAIN_ID,
  [SHORT_NAME_FANTOM]: FANTOM_CHAIN_ID,
  [SHORT_NAME_FANTOM_TEST]: FANTOM_TEST_CHAIN_ID,
  [SHORT_NAME_HARMONY]: HARMONY_CHAIN_ID,
  [SHORT_NAME_HARMONY_TEST]: HARMONY_TEST_CHAIN_ID,
  [SHORT_NAME_POLYGON]: POLYGON_CHAIN_ID,
  [SHORT_NAME_POLYGON_MUMBAI]: POLYGON_MUMBAI_CHAIN_ID,
  [SHORT_NAME_POLYGON_ZKEVM_TEST]: POLYGON_ZKEVM_TEST_CHAIN_ID,
  [SHORT_NAME_QUARKCHAIN]: QUARKCHAIN_CHAIN_ID,
  [SHORT_NAME_QUARKCHAIN_DEVNET]: QUARKCHAIN_DEVNET_CHAIN_ID,
}

const PROVIDER_URLS = {
  [GALILEO_CHAIN_ID]: 'https://galileo.web3q.io:8545',
  [GOERLI_CHAIN_ID]: 'https://rpc.ankr.com/eth_goerli',
  [SEPOLIA_CHAIN_ID]: 'https://rpc.sepolia.org',
  [OPTIMISTIC_CHAIN_ID]: 'https://mainnet.optimism.io',
  [ARBITRUM_CHAIN_ID]: 'https://arb1.arbitrum.io/rpc',
  [OPTIMISTIC_GOERLI_CHAIN_ID]: 'https://goerli.optimism.io',
  [ARBITRUM_GOERLI_CHAIN_ID]: 'https://goerli-rollup.arbitrum.io/rpc',
  [EVMOS_CHAIN_ID]: 'https://evmos-evm.publicnode.com',
  [EVMOS_TEST_CHAIN_ID]: 'https://eth.bd.evmos.dev:8545',
  [ARBITRUM_NOVE_CHAIN_ID]: 'https://nova.arbitrum.io/rpc',
  [BINANCE_CHAIN_ID]: 'https://bsc-dataseed2.binance.org',
  [BINANCE_TEST_CHAIN_ID]: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  [AVALANCHE_CHAIN_ID]: 'https://api.avax.network/ext/bc/C/rpc',
  [AVALANCHE_TEST_CHAIN_ID]: 'https://avalanchetestapi.terminet.io/ext/bc/C/rpc',
  [FANTOM_CHAIN_ID]: 'https://rpcapi.fantom.network',
  [FANTOM_TEST_CHAIN_ID]: 'https://rpc.testnet.fantom.network',
  [HARMONY_CHAIN_ID]: 'https://a.api.s0.t.hmny.io',
  [HARMONY_TEST_CHAIN_ID]: 'https://api.s0.b.hmny.io',
  [POLYGON_CHAIN_ID]: 'https://polygon-rpc.com',
  [POLYGON_MUMBAI_CHAIN_ID]: 'https://matic-mumbai.chainstacklabs.com',
  [POLYGON_ZKEVM_TEST_CHAIN_ID]: 'https://rpc.public.zkevm-test.net',
  [QUARKCHAIN_CHAIN_ID]: 'https://mainnet-s0-ethapi.quarkchain.io',
  [QUARKCHAIN_DEVNET_CHAIN_ID]: 'https://devnet-s0-ethapi.quarkchain.io',
}
const NS_ADDRESS = {
  [GALILEO_CHAIN_ID]: '0xD379B91ac6a93AF106802EB076d16A54E3519CED',
  [ETHEREUM_CHAIN_ID]: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
  [GOERLI_CHAIN_ID]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
}
const FACTORY_ADDRESS = {
  [GALILEO_CHAIN_ID]: '0x1CA0e8be165360296a23907BB482c6640D3aC6ad',
}

const REMOVE_FAIL = -1;
const REMOVE_NORMAL = 0;
const REMOVE_SUCCESS = 1;

const SHORT_NAME_DEFAULT = SHORT_NAME_GALILEO;

let nonce;

const getNonce = () => {
  return nonce++;
}

// **** utils ****
function namehash(inputName) {
  let node = ''
  for (let i = 0; i < 32; i++) {
    node += '00'
  }

  if (inputName) {
    const labels = inputName.split('.');
    for (let i = labels.length - 1; i >= 0; i--) {
      let normalisedLabel = normalize(labels[i])
      let labelSha = sha3(normalisedLabel)
      node = sha3(Buffer.from(node + labelSha, 'hex'))
    }
  }

  return '0x' + node
}

function get3770NameAndAddress(domain) {
  const domains = domain.split(":");
  if (domains.length > 1) {
    return {shortName: domains[0], address: domains[1]};
  } else if(domain.endsWith(".eth")) {
    return {shortName: SHORT_NAME_ETHEREUM, address: domain};
  }
  return {shortName: SHORT_NAME_DEFAULT, address: domain};
}

function getNetWorkIdByShortName(shortName) {
  let chainId = NETWORK_MAPING[shortName];
  if (chainId) {
    return chainId;
  }
  return 0;
}

// return address or eip3770 address
async function getWebHandler(domain, RPC) {
  // get web handler address, domain is address, xxx.ens, xxx.w3q
  const {shortName, address} = get3770NameAndAddress(domain);
  const chainId = getNetWorkIdByShortName(shortName);
  let providerUrl = RPC ?? PROVIDER_URLS[chainId];
  if (!providerUrl) {
    console.error(error(`ERROR: The network need RPC, please try again after setting RPC!`));
    return;
  }

  // address
  const ethAddrReg = /^0x[0-9a-fA-F]{40}$/;
  if (ethAddrReg.test(address)) {
    return {providerUrl, chainId, address};
  }

  // .w3q or .eth domain
  let nameServiceContract = NS_ADDRESS[chainId];
  if(!nameServiceContract) {
    console.log(error(`Not Support Name Service: ${domain}`));
    return;
  }
  let webHandler;
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  try {
    const nameHash = namehash(address);
    const wnsContract = new ethers.Contract(nameServiceContract, nsAbi, provider);
    const resolver = await wnsContract.resolver(nameHash);
    const resolverContract = new ethers.Contract(resolver, resolverAbi, provider);
    if (chainId === GALILEO_CHAIN_ID) {
      webHandler = await resolverContract.webHandler(nameHash);
    } else {
      webHandler = await resolverContract.text(nameHash, "web3");
    }
  } catch (e){}
  // address
  if (ethAddrReg.test(webHandler)) {
    return {providerUrl, chainId, address: webHandler};
  }
  const shortAdd = get3770NameAndAddress(webHandler);
  const newChainId = getNetWorkIdByShortName(shortAdd.shortName);
  providerUrl = chainId === newChainId ? providerUrl : PROVIDER_URLS[newChainId];
  return {
    providerUrl: providerUrl,
    chainId: newChainId,
    address: shortAdd.address
  };
}

const getTxReceipt = async (fileContract, transactionHash) => {
  const provider = fileContract.provider;
  let txReceipt;
  while (!txReceipt) {
    txReceipt = await isTransactionMined(provider, transactionHash);
    await sleep(5000);
  }
  return txReceipt;
}

const isTransactionMined = async (provider, transactionHash) => {
  const txReceipt = await provider.getTransactionReceipt(transactionHash);
  if (txReceipt && txReceipt.blockNumber) {
    return txReceipt;
  }
}

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const bufferChunk = (buffer, chunkSize) => {
  let i = 0;
  let result = [];
  const len = buffer.length;
  const chunkLength = Math.ceil(len / chunkSize);
  while (i < len) {
    result.push(buffer.slice(i, i += chunkLength));
  }

  return result;
}

const recursiveFiles = (path, basePath) => {
  let filePools = [];
  const fileStat = fs.statSync(path);
  if (fileStat.isFile()) {
    filePools.push({path: path, name: path, size: fileStat.size});
    return filePools;
  }

  const files = fs.readdirSync(path);
  for (let file of files) {
    const fileStat = fs.statSync(`${path}/${file}`);
    if (fileStat.isDirectory()) {
      const pools = recursiveFiles(`${path}/${file}`, `${basePath}${file}/`);
      filePools = filePools.concat(pools);
    } else {
      filePools.push({path: `${path}/${file}`, name: `${basePath}${file}`, size: fileStat.size});
    }
  }
  return filePools;
};

const uploadFile = async (chainId = GALILEO_CHAIN_ID, fileContract, fileInfo) => {
  const {path, name, size} = fileInfo;
  const filePath = path;
  const fileName = name;
  let fileSize = size;

  const hexName = '0x' + Buffer.from(fileName, 'utf8').toString('hex');
  const content = fs.readFileSync(filePath);
  let chunks = [];
  if (chainId === GALILEO_CHAIN_ID) {
    // Data need to be sliced if file > 475K
    if (fileSize > 475 * 1024) {
      const chunkSize = Math.ceil(fileSize / (475 * 1024));
      chunks = bufferChunk(content, chunkSize);
      fileSize = fileSize / chunkSize;
    } else {
      chunks.push(content);
    }
  } else {
    // Data need to be sliced if file > 24K
    if (fileSize > 24 * 1024) {
      const chunkSize = Math.ceil(fileSize / (24 * 1024));
      chunks = bufferChunk(content, chunkSize);
      fileSize = fileSize / chunkSize;
    } else {
      chunks.push(content);
    }
  }

  const clearState = await clearOldFile(fileContract, fileName, hexName, chunks.length);
  if (clearState === REMOVE_FAIL) {
    return {upload: 0, fileName: fileName};
  }

  let cost = 0;
  if ((chainId === GALILEO_CHAIN_ID) && (fileSize > 24 * 1024 - 326)) {
    // eth storage need stake
    cost = Math.floor((fileSize + 326) / 1024 / 24);
  }

  let uploadCount = 0;
  const failFile = [];
  for (const index in chunks) {
    const chunk = chunks[index];
    const hexData = '0x' + chunk.toString('hex');

    if (clearState === REMOVE_NORMAL) {
      // check is change
      const localHash = '0x' + sha3(chunk);
      let hash;
      try {
        hash = await fileContract.getChunkHash(hexName, index);
      } catch (e) {
        await sleep(3000);
        hash = await fileContract.getChunkHash(hexName, index);
      }
      if (localHash === hash) {
        console.log(`File ${fileName} chunkId: ${index}: The data is not changed.`);
        continue;
      }
    }

    let estimatedGas;
    try {
      estimatedGas = await fileContract.estimateGas.writeChunk(hexName, index, hexData, {
        value: ethers.utils.parseEther(cost.toString())
      });
    } catch (e) {
      await sleep(3000);
      estimatedGas = await fileContract.estimateGas.writeChunk(hexName, index, hexData, {
        value: ethers.utils.parseEther(cost.toString())
      });
    }

    // upload file
    const option = {
      nonce: getNonce(),
      gasLimit: estimatedGas.mul(6).div(5).toString(),
      value: ethers.utils.parseEther(cost.toString())
    };
    let tx;
    try {
      tx = await fileContract.writeChunk(hexName, index, hexData, option);
    } catch (e) {
      await sleep(5000);
      tx = await fileContract.writeChunk(hexName, index, hexData, option);
    }
    console.log(`${fileName}, chunkId: ${index}`);
    console.log(`Transaction Id: ${tx.hash}`);

    // get result
    let txReceipt;
    try {
      txReceipt = await getTxReceipt(fileContract, tx.hash);
    } catch (e) {}
    if (txReceipt && txReceipt.status) {
      console.log(`File ${fileName} chunkId: ${index} uploaded!`);
      uploadCount++;
    } else {
      failFile.push(index);
      break;
    }
  }

  return {
    upload: 1,
    fileName: fileName,
    cost: cost,
    fileSize: fileSize / 1024,
    uploadCount: uploadCount,
    failFile: failFile
  };
};

const clearOldFile = async (fileContract, fileName, hexName, chunkLength) => {
  let oldChunkLength;
  try {
    oldChunkLength = await fileContract.countChunks(hexName);
  } catch (e) {
    await sleep(3000);
    oldChunkLength = await fileContract.countChunks(hexName);
  }

  if (oldChunkLength > chunkLength) {
    // remove
    const option = {nonce: getNonce()};
    let tx;
    try {
      tx = await fileContract.remove(hexName, option);
    } catch (e) {
      await sleep(3000);
      tx = await fileContract.remove(hexName, option);
    }
    console.log(`Remove Transaction Id: ${tx.hash}`);
    const receipt = await getTxReceipt(fileContract, tx.hash);
    if (receipt.status) {
      console.log(`Remove file: ${fileName}`);
      return REMOVE_SUCCESS;
    } else {
      return REMOVE_FAIL;
    }
  }
  return REMOVE_NORMAL;
}
// **** utils ****

// **** function ****
const deploy = async (path, domain, key, RPC) => {
  const {providerUrl, chainId, address} = await getWebHandler(domain, RPC);
  if (providerUrl && parseInt(address) > 0) {
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(key, provider);

    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    nonce = await wallet.getTransactionCount("pending");

    let failPool = [];
    let totalCost = 0, totalFileCount = 0, totalFileSize = 0;
    // get file and remove old chunk
    console.log("Stark upload File.......");
    from(recursiveFiles(path, ''))
        .pipe(mergeMap(info => uploadFile(chainId, fileContract, info), 15))
        // .returnValue()
        .subscribe(
            (info) => {
              if (info.upload === 1) {
                if (info.failFile && info.failFile.length > 0) {
                  for (const index of info.failFile) {
                    failPool.push(info.fileName + " Chunk:" + index);
                  }
                }
                totalFileCount += info.uploadCount;
                totalCost += info.uploadCount * info.cost;
                totalFileSize += info.uploadCount * info.fileSize;
              } else {
                failPool.push(info.fileName);
              }
            },
            (error) => {
              throw error
            },
            () => {
              if (failPool.length > 0) {
                console.log();
                for (const file of failPool) {
                  console.log(error(`ERROR: ${file} uploaded failed.`));
                }
              }
              console.log();
              console.log(notice(`Total Cost: ${totalCost} W3Q`));
              console.log(notice(`Total File Count: ${totalFileCount}`));
              console.log(notice(`Total File Size: ${totalFileSize} KB`));
            });
  } else {
    console.log(error(`ERROR: ${domain} domain doesn't exist`));
  }
};

const createDirectory = async (key, chainId, RPC) => {
  chainId = chainId ?? GALILEO_CHAIN_ID;

  if (FACTORY_ADDRESS[chainId]) {
    // Galileo
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URLS[chainId]);
    const wallet = new ethers.Wallet(key, provider);

    const factoryAddress = FACTORY_ADDRESS[chainId];
    const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, wallet);
    const tx = await factoryContract.create();
    console.log(`Transaction: ${tx.hash}`);
    let txReceipt;
    while (!txReceipt) {
      txReceipt = await isTransactionMined(provider, tx.hash);
      await sleep(5000);
    }
    if (txReceipt.status) {
      let iface = new ethers.utils.Interface(factoryAbi);
      let log = iface.parseLog(txReceipt.logs[0]);
      console.log(`FlatDirectory Address: ${log.args[0]}`);
    } else {
      console.error(`ERROR: transaction failed!`);
    }
  } else {
    // other network
    const providerUrl = RPC ?? PROVIDER_URLS[chainId];
    if (!providerUrl) {
      console.error(error(`ERROR: The network need RPC, please try again after setting RPC!`));
      return;
    }

    const contractByteCode = '0x60c06040819052600060a08190526200001b916003916200008e565b503480156200002957600080fd5b5060405162001f4e38038062001f4e8339810160408190526200004c9162000134565b60f81b7fff000000000000000000000000000000000000000000000000000000000000001660805260028054336001600160a01b03199091161790556200019d565b8280546200009c9062000160565b90600052602060002090601f016020900481019282620000c057600085556200010b565b82601f10620000db57805160ff19168380011785556200010b565b828001600101855582156200010b579182015b828111156200010b578251825591602001919060010190620000ee565b50620001199291506200011d565b5090565b5b808211156200011957600081556001016200011e565b6000602082840312156200014757600080fd5b815160ff811681146200015957600080fd5b9392505050565b600181811c908216806200017557607f821691505b602082108114156200019757634e487b7160e01b600052602260045260246000fd5b50919050565b60805160f81c611d8b620001c3600039600081816104040152610b650152611d8b6000f3fe6080604052600436106200012e5760003560e01c806358edef4c11620000af578063a6f9dae1116200006d578063a6f9dae114620004fc578063caf128361462000521578063d84eb56c146200055c578063dd473fae1462000581578063f916c5b0146200059f576200012e565b806358edef4c146200043a578063590e1ae3146200045f5780635ba1d9e514620004775780638bf4515c146200049c5780638da5cb5b14620004c1576200012e565b80631c993ad511620000fd5780631c993ad5146200036c5780632b68b9c6146200039157806342216bed14620003a9578063492c7b2a14620003dd5780634eed7cf114620003f4576200012e565b8063038cd79f14620002b35780630936286114620002cc5780631a7237e014620002fc5780631c5ee10c1462000331575b3480156200013b57600080fd5b50600036606080826200015f575050604080516020810190915260008152620002a8565b8383600081811062000175576200017562001af2565b9050013560f81c60f81b6001600160f81b031916602f60f81b14620001c157505060408051808201909152600e81526d0d2dcc6dee4e4cac6e840e0c2e8d60931b6020820152620002a8565b8383620001d060018262001a3e565b818110620001e257620001e262001af2565b9050013560f81c60f81b6001600160f81b031916602f60f81b1415620002495762000240620002158460018188620019d4565b60036040516020016200022b9392919062001893565b604051602081830303815290604052620005c4565b5090506200029b565b620002976200025c8460018188620019d4565b8080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250620005c492505050565b5090505b620002a681620005e3565b505b915050805190602001f35b620002ca620002c436600462001735565b62000624565b005b348015620002d957600080fd5b50620002e462000676565b604051620002f3919062001970565b60405180910390f35b3480156200030957600080fd5b50620003216200031b366004620017a5565b6200070c565b604051620002f392919062001985565b3480156200033e57600080fd5b506200035662000350366004620016f4565b6200072f565b60408051928352602083019190915201620002f3565b3480156200037957600080fd5b50620002ca6200038b366004620016f4565b62000744565b3480156200039e57600080fd5b50620002ca6200078a565b348015620003b657600080fd5b50620003ce620003c8366004620017a5565b620007c5565b604051908152602001620002f3565b620002ca620003ee366004620017ee565b620007e7565b3480156200040157600080fd5b507f000000000000000000000000000000000000000000000000000000000000000060ff1615155b6040519015158152602001620002f3565b3480156200044757600080fd5b50620003ce62000459366004620016f4565b62000830565b3480156200046c57600080fd5b50620002ca62000874565b3480156200048457600080fd5b506200042962000496366004620017a5565b620008de565b348015620004a957600080fd5b5062000321620004bb366004620016f4565b620005c4565b348015620004ce57600080fd5b50600254620004e3906001600160a01b031681565b6040516001600160a01b039091168152602001620002f3565b3480156200050957600080fd5b50620002ca6200051b366004620016c9565b62000928565b3480156200052e57600080fd5b506200054662000540366004620017a5565b62000977565b60408051928352901515602083015201620002f3565b3480156200056957600080fd5b50620003ce6200057b366004620017a5565b6200098d565b3480156200058e57600080fd5b50651b585b9d585b60d21b620003ce565b348015620005ac57600080fd5b50620003ce620005be366004620016f4565b620009d0565b60606000620005da8380519060200120620009e4565b91509150915091565b600081516040620005f5919062001a00565b9050601f196200060782602062001a00565b6200061490601f62001a00565b1690506020808303528060208303f35b6002546001600160a01b031633146200065a5760405162461bcd60e51b81526004016200065190620019ab565b60405180910390fd5b620006718380519060200120600084843462000b55565b505050565b60038054620006859062001a87565b80601f0160208091040260200160405190810160405280929190818152602001828054620006b39062001a87565b8015620007045780601f10620006d85761010080835404028352916020019162000704565b820191906000526020600020905b815481529060010190602001808311620006e657829003601f168201915b505050505081565b606060006200072384805190602001208462000c3f565b915091505b9250929050565b600080620005da838051906020012062000cb8565b6002546001600160a01b03163314620007715760405162461bcd60e51b81526004016200065190620019ab565b8051620007869060039060208401906200153b565b5050565b6002546001600160a01b03163314620007b75760405162461bcd60e51b81526004016200065190620019ab565b6002546001600160a01b0316ff5b600080620007d484846200070c565b5080516020909101209150505b92915050565b6002546001600160a01b03163314620008145760405162461bcd60e51b81526004016200065190620019ab565b6200082a84805190602001208484843462000b55565b50505050565b6002546000906001600160a01b03163314620008605760405162461bcd60e51b81526004016200065190620019ab565b620007e18280519060200120600062000d0f565b6002546001600160a01b03163314620008a15760405162461bcd60e51b81526004016200065190620019ab565b6002546040516001600160a01b03909116904780156108fc02916000818181858888f19350505050158015620008db573d6000803e3d6000fd5b50565b6002546000906001600160a01b031633146200090e5760405162461bcd60e51b81526004016200065190620019ab565b6200092183805190602001208362000dd7565b9392505050565b6002546001600160a01b03163314620009555760405162461bcd60e51b81526004016200065190620019ab565b600280546001600160a01b0319166001600160a01b0392909216919091179055565b6000806200072384805190602001208462000ec7565b6002546000906001600160a01b03163314620009bd5760405162461bcd60e51b81526004016200065190620019ab565b6200092183805190602001208362000d0f565b6000620007e1828051906020012062000f1f565b60606000806000620009f68562000cb8565b91509150806000141562000a3f5760005b6040519080825280601f01601f19166020018201604052801562000a32576020820181803683370190505b5095600095509350505050565b60008267ffffffffffffffff81111562000a5d5762000a5d62001b08565b6040519080825280601f01601f19166020018201604052801562000a88576020820181803683370190505b5090506020810160005b8381101562000b46576000888152602081815260408083208484529091528120549062000abf8262000f5e565b1562000b015762000ad08260e01c90565b60008b8152600160209081526040808320878452909152902090915062000af990838662000f73565b505062000b20565b8162000b0d8162001027565b50915062000b1c818662001099565b5050505b62000b2c818562001a00565b93505050808062000b3d9062001abe565b91505062000a92565b50909660019650945050505050565b62000b618585620010f8565b60ff7f00000000000000000000000000000000000000000000000000000000000000001682111562000bc85762000baa62000b9e84848462001210565b6001600160a01b031690565b60008681526020818152604080832088845290915290205562000c38565b60008581526001602090815260408083208784528252918290208251601f860183900483028101830190935284835262000c1f9290918690869081908401838280828437600092019190915250620012cc92505050565b6000868152602081815260408083208884529091529020555b5050505050565b6000828152602081815260408083208484529091528120546060919062000c668162000f5e565b1562000ca0576000858152600160209081526040808320878452909152812062000c91908362001371565b93506001925062000728915050565b8062000cac816200140d565b93509350505062000728565b6000806000805b60008062000cce878462000ec7565b915091508062000ce057505062000d05565b62000cec828562001a00565b93508262000cfa8162001abe565b935050505062000cbf565b9094909350915050565b60005b6000838152602081815260408083208584529091529020548062000d37575062000dd1565b62000d428162000f5e565b62000da3576000819050806001600160a01b0316632b68b9c66040518163ffffffff1660e01b8152600401600060405180830381600087803b15801562000d8857600080fd5b505af115801562000d9d573d6000803e3d6000fd5b50505050505b6000848152602081815260408083208684529091528120558262000dc78162001abe565b9350505062000d12565b50919050565b6000828152602081815260408083208484529091528120548062000e00576000915050620007e1565b60008481526020819052604081208162000e1c86600162001a00565b8152602001908152602001600020541462000e3c576000915050620007e1565b62000e478162000f5e565b62000ea8576000819050806001600160a01b0316632b68b9c66040518163ffffffff1660e01b8152600401600060405180830381600087803b15801562000e8d57600080fd5b505af115801562000ea2573d6000803e3d6000fd5b50505050505b5050600091825260208281526040808420928452919052812055600190565b60008281526020818152604080832084845290915281205481908062000ef557600080925092505062000728565b62000f008162000f5e565b1562000f1357600062000c918260e01c90565b8062000cac8162001027565b6000805b6000838152602081815260408083208484529091529020548062000f485750620007e1565b8162000f548162001abe565b9250505062000f23565b60008062000f6c8360e01c90565b1192915050565b600080600062000f8385620014b4565b808652909350905083601c8411156200101957601c81016000805b6020600162000faf601c8a62001a3e565b62000fbc90602062001a00565b62000fc8919062001a3e565b62000fd4919062001a1b565b8110156200101557600081815260208b8152604090912054808552925062000ffe90849062001a00565b9250806200100c8162001abe565b91505062000f9e565b5050505b600192505050935093915050565b6000806001600160a01b0383166200104457506000928392509050565b600080604051806101600160405280610126815260200162001c306101269139519050843b91508082101562001081575060009485945092505050565b6200108d818362001a3e565b95600195509350505050565b600080600080620010aa8662001027565b9150915080620010c35760008093509350505062000728565b6000604051806101600160405280610126815260200162001c306101269139519050828187893c509095600195509350505050565b6000828152602081815260408083208484529091529020548062001194578115806200114d57506000838152602081905260408120816200113b60018662001a3e565b81526020019081526020016000205414155b620011945760405162461bcd60e51b81526020600482015260166024820152751b5d5cdd081c995c1b1858d9481bdc88185c1c195b9960521b604482015260640162000651565b6200119f8162000f5e565b6200067157806001600160a01b038116156200082a57806001600160a01b0316632b68b9c66040518163ffffffff1660e01b8152600401600060405180830381600087803b158015620011f157600080fd5b505af115801562001206573d6000803e3d6000fd5b5050505050505050565b600080604051806101600160405280610126815260200162001c3061012691398585604051602001620012469392919062001946565b60408051601f1981840301815291905290506000620012686043602062001a00565b308382015290506200127d608c602062001a00565b9050308183015250600083826040516200129790620015ca565b620012a3919062001970565b6040518091039082f0905080158015620012c1573d6000803e3d6000fd5b509695505050505050565b805160208083015160e083901b911c1790601c8111156200136a576000603c8401815b6020600162001300601c8762001a3e565b6200130d90602062001a00565b62001319919062001a3e565b62001325919062001a1b565b8110156200136657815192506200133e82602062001a00565b60008281526020899052604090208490559150806200135d8162001abe565b915050620012ef565b5050505b5092915050565b606060006200138083620014cf565b92509050601c8111156200136a57603c82016000805b60206001620013a7601c8762001a3e565b620013b490602062001a00565b620013c0919062001a3e565b620013cc919062001a1b565b8110156200136657600081815260208881526040909120548085529250620013f690849062001a00565b925080620014048162001abe565b91505062001396565b606060008060006200141f8562001027565b91509150806200143157600062000a07565b60008267ffffffffffffffff8111156200144f576200144f62001b08565b6040519080825280601f01601f1916602001820160405280156200147a576020820181803683370190505b5090506000604051806101600160405280610126815260200162001c306101269139519050838160208401893c5095600195509350505050565b600080620014c28360e01c90565b9360209390931b92915050565b60006060620014de8360e01c90565b9150602083901b92508167ffffffffffffffff81111562001503576200150362001b08565b6040519080825280601f01601f1916602001820160405280156200152e576020820181803683370190505b5060208101939093525091565b828054620015499062001a87565b90600052602060002090601f0160209004810192826200156d5760008555620015b8565b82601f106200158857805160ff1916838001178555620015b8565b82800160010185558215620015b8579182015b82811115620015b85782518255916020019190600101906200159b565b50620015c6929150620015d8565b5090565b6101118062001b1f83390190565b5b80821115620015c65760008155600101620015d9565b60008083601f8401126200160257600080fd5b50813567ffffffffffffffff8111156200161b57600080fd5b6020830191508360208285010111156200072857600080fd5b600082601f8301126200164657600080fd5b813567ffffffffffffffff8082111562001664576200166462001b08565b604051601f8301601f19908116603f011681019082821181831017156200168f576200168f62001b08565b81604052838152866020858801011115620016a957600080fd5b836020870160208301376000602085830101528094505050505092915050565b600060208284031215620016dc57600080fd5b81356001600160a01b03811681146200092157600080fd5b6000602082840312156200170757600080fd5b813567ffffffffffffffff8111156200171f57600080fd5b6200172d8482850162001634565b949350505050565b6000806000604084860312156200174b57600080fd5b833567ffffffffffffffff808211156200176457600080fd5b620017728783880162001634565b945060208601359150808211156200178957600080fd5b506200179886828701620015ef565b9497909650939450505050565b60008060408385031215620017b957600080fd5b823567ffffffffffffffff811115620017d157600080fd5b620017df8582860162001634565b95602094909401359450505050565b600080600080606085870312156200180557600080fd5b843567ffffffffffffffff808211156200181e57600080fd5b6200182c8883890162001634565b95506020870135945060408701359150808211156200184a57600080fd5b506200185987828801620015ef565b95989497509550505050565b600081518084526200187f81602086016020860162001a58565b601f01601f19169290920160200192915050565b828482376000838201600080825280855482600182811c915080831680620018bc57607f831692505b6020808410821415620018dd57634e487b7160e01b87526022600452602487fd5b818015620018f45760018114620019065762001934565b60ff1986168952848901965062001934565b60008c815260209020885b868110156200192c5781548b82015290850190830162001911565b505084890196505b50949c9b505050505050505050505050565b600084516200195a81846020890162001a58565b8201838582376000930192835250909392505050565b60208152600062000921602083018462001865565b6040815260006200199a604083018562001865565b905082151560208301529392505050565b6020808252600f908201526e36bab9ba10333937b69037bbb732b960891b604082015260600190565b60008085851115620019e557600080fd5b83861115620019f357600080fd5b5050820193919092039150565b6000821982111562001a165762001a1662001adc565b500190565b60008262001a3957634e487b7160e01b600052601260045260246000fd5b500490565b60008282101562001a535762001a5362001adc565b500390565b60005b8381101562001a7557818101518382015260200162001a5b565b838111156200082a5750506000910152565b600181811c9082168062001a9c57607f821691505b6020821081141562000dd157634e487b7160e01b600052602260045260246000fd5b600060001982141562001ad55762001ad562001adc565b5060010190565b634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052604160045260246000fdfe60806040526040516101113803806101118339810160408190526100229161002b565b80518060208301f35b6000602080838503121561003e57600080fd5b82516001600160401b038082111561005557600080fd5b818501915085601f83011261006957600080fd5b81518181111561007b5761007b6100fa565b604051601f8201601f19908116603f011681019083821181831017156100a3576100a36100fa565b8160405282815288868487010111156100bb57600080fd5b600093505b828410156100dd57848401860151818501870152928501926100c0565b828411156100ee5760008684830101525b98975050505050505050565b634e487b7160e01b600052604160045260246000fdfe6080604052348015600f57600080fd5b506004361060325760003560e01c80632b68b9c61460375780638da5cb5b14603f575b600080fd5b603d6081565b005b60657f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b03909116815260200160405180910390f35b336001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000161460ed5760405162461bcd60e51b815260206004820152600e60248201526d3737ba10333937b69037bbb732b960911b604482015260640160405180910390fd5b33fffea2646970667358221220fc66c9afb7cb2f6209ae28167cf26c6c06f86a82cbe3c56de99027979389a1be64736f6c63430008070033a2646970667358221220c3dd469a4d26a637917f856673fb5070f5c4085a99c67991f38b1a48dc3b7b8a64736f6c63430008070033';
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(key, provider);
    const factory = new ContractFactory(flatDirectoryAbi, contractByteCode, wallet);
    const contract = await factory.deploy(0);
    await contract.deployed();
    if (contract) {
      console.log(`FlatDirectory Address: ${contract.address}`);
      const tx = await contract.changeOwner(wallet.address);
      await tx.wait();
      console.log(`Change Owner: ${contract.address}`);
    } else {
      console.error(`ERROR: transaction failed!`);
    }
  }
};

const refund = async (domain, key, RPC) => {
  const {providerUrl, address} = await getWebHandler(domain, RPC);
  if (providerUrl && parseInt(address) > 0) {
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(key, provider);
    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    const tx = await fileContract.refund();
    console.log(`Transaction: ${tx.hash}`);
    let txReceipt;
    while (!txReceipt) {
      txReceipt = await isTransactionMined(provider, tx.hash);
      await sleep(5000);
    }
    if (txReceipt.status) {
      console.log(`Refund succeeds`);
    } else {
      console.error(`ERROR: transaction failed!`);
    }
  } else {
    console.log(error(`ERROR: ${domain} domain doesn't exist`));
  }
};

const setDefault = async (domain, filename, key, RPC) => {
  const {providerUrl, address} = await getWebHandler(domain, RPC);
  if (providerUrl && parseInt(address) > 0) {
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(key, provider);

    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    const defaultFile = '0x' + Buffer.from(filename, 'utf8').toString('hex');
    const tx = await fileContract.setDefault(defaultFile);
    console.log(`Transaction: ${tx.hash}`);
    let txReceipt;
    while (!txReceipt) {
      txReceipt = await isTransactionMined(provider, tx.hash);
      await sleep(5000);
    }
    if (txReceipt.status) {
      console.log(`Set succeeds`);
    } else {
      console.error(`ERROR: transaction failed!`);
    }
  } else {
    console.log(error(`ERROR: ${domain} domain doesn't exist`));
  }
};
// **** function ****

module.exports.deploy = deploy;
module.exports.create = createDirectory;
module.exports.refund = refund;
module.exports.setDefault = setDefault;