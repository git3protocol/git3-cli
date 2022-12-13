export default [
  {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
  },
  {
      "inputs": [
          {
              "internalType": "bytes",
              "name": "name",
              "type": "bytes"
          }
      ],
      "name": "countChunks",
      "outputs": [
          {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "string",
              "name": "name",
              "type": "string"
          }
      ],
      "name": "delRef",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "bytes",
              "name": "path",
              "type": "bytes"
          }
      ],
      "name": "download",
      "outputs": [
          {
              "internalType": "bytes",
              "name": "",
              "type": "bytes"
          },
          {
              "internalType": "bool",
              "name": "",
              "type": "bool"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [],
      "name": "listRefs",
      "outputs": [
          {
              "components": [
                  {
                      "internalType": "bytes20",
                      "name": "hash",
                      "type": "bytes20"
                  },
                  {
                      "internalType": "string",
                      "name": "name",
                      "type": "string"
                  }
              ],
              "internalType": "struct Git3.refData[]",
              "name": "list",
              "type": "tuple[]"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "string",
              "name": "",
              "type": "string"
          }
      ],
      "name": "nameToRefInfo",
      "outputs": [
          {
              "internalType": "bytes20",
              "name": "hash",
              "type": "bytes20"
          },
          {
              "internalType": "uint96",
              "name": "index",
              "type": "uint96"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
          }
      ],
      "name": "refs",
      "outputs": [
          {
              "internalType": "string",
              "name": "",
              "type": "string"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "uint256",
              "name": "val",
              "type": "uint256"
          }
      ],
      "name": "refund",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "inputs": [],
      "name": "refund1",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "bytes",
              "name": "path",
              "type": "bytes"
          }
      ],
      "name": "remove",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "string",
              "name": "name",
              "type": "string"
          },
          {
              "internalType": "bytes20",
              "name": "refHash",
              "type": "bytes20"
          }
      ],
      "name": "setRef",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "bytes",
              "name": "name",
              "type": "bytes"
          }
      ],
      "name": "size",
      "outputs": [
          {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
          },
          {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [],
      "name": "storageManager",
      "outputs": [
          {
              "internalType": "contract IFileOperator",
              "name": "",
              "type": "address"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "bytes",
              "name": "path",
              "type": "bytes"
          },
          {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
          }
      ],
      "name": "upload",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "bytes",
              "name": "path",
              "type": "bytes"
          },
          {
              "internalType": "uint256",
              "name": "chunkId",
              "type": "uint256"
          },
          {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
          }
      ],
      "name": "uploadChunk",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
  }
]