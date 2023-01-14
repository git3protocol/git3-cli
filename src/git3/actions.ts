export const generateActions = [
  {
    type: 'list',
    name: 'keyType',
    message: 'Select key type',
    choices: [
      'mnemonic',
      'private key',
    ],
  },
  {
    type: 'input',
    name: 'name',
    message: "give an account name",
    default() {
      return 'default'
    },
  }
]

export const importActions = [
  {
    type: 'list',
    name: 'keyType',
    message: 'Select key type',
    choices: [
      'mnemonic',
      'private key',
    ]
  },
  {
    type: 'input',
    name: 'key',
    message: "type or paste your key or mnemonic"
  },
  {
    type: 'input',
    name: 'name',
    message: "give an account name",
    default() {
      return 'default'
    },
  }
]