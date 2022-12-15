# Install

```
yarn
```

# pkg

```
yarn pkg
```

# mac install

```
yarn install-mac
```

# Git3 URI Protocol

```
git3://[sender_wallet]@[contract_address or NS]:[chain_id]/<repo_name>
```


- [sender_wallet] Optional, address/NS or local wallet name, the default value is `default`.
- [contract_address or NS] Optional, the default value is `git3.w3q`, that's git3 on ETHStorage official contract.
- [chain_id] Optional, chain_id will follow the chain where NS by default, overrides if chain_id is specified
- <repo_name> Required, your repo name

## Example:
- `git3://helloworld`  
select `default` wallet, git3 official contract address, on ETHStorage chainId: 3334, repo name is `helloworld`
It's equl to `git3://default@git3.w3q:3334/helloworld`

- `git3://myname.eth@git3.w3q/helloworld`  
select `myname.eth` wallet, `git3.w3q` contract address, on ETHStorage chainId: 3334, repo name is `helloworld`

- `git3://your_git3.eth:137/helloworld`  
select `default` wallet, `your_git3.eth` contract address, on Polygon chainId: 137, repo name is `helloworld`

- `git3://0x0068bD3ec8D16402690C1Eddff06ACb913A209ef:1/helloworld`  
select `default` wallet, `0x0068...9ef` contract address, on ETH chainId: 1, repo name is `helloworld`




