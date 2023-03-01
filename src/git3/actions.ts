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

export const createHubActions = [
  {
    type: 'list',
    name: 'permissionless',
    message: 'can anyone join hub?',
    choices: [
      'yes',
      'no',
    ],
  },
]

export const HubMemberActions = [
  {
    type: 'list',
    name: 'role',
    message: 'add contributor or manager into hub',
    choices: [
      'contribotor',
      'manager',
    ],
  },
]

export const HubGetMemberActions = [
  {
    type: 'list',
    name: 'role',
    message: 'get members corresponding to the role',
    choices: [
      'admin',
      'contribotor',
      'manager',
    ],
  },
]