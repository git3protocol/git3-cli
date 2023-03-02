# Git3 Command Line Tool

## Install

```
yarn
```

## mac install

```
yarn install-mac
```

## Git3 URI Protocol

```
git3://[sender_wallet]@[hub_contract_address or NS]:[chain_id]/<repo_name>
```

- [sender_wallet] Optional, address/NS or local wallet name, the default value is `default`.
- [hub_contract_address or NS] Optional, the default value is `git3.w3q`, that's `git3 official hub contract` on ETHStorage .
- [chain_id] Optional, chain_id will follow the chain where NS by default, overrides if chain_id is specified
- <repo_name> Required, your repo name

## Example:
- `git3://git3.w3q/helloworld`
select `default` wallet, `git3 official hub contract` address, on EthStorage w3q network, repo name is 
`helloworld`

- `git3://myname.eth@git3hub.eth/helloworld`  
select `myname.eth` wallet, `git3hub.eth` hub contract address, on ETH Mainnet chainId: 1, repo name is `helloworld`

- `git3://your_git3_hub.eth:137/helloworld`  
select `default` wallet, `your_git3_hub.eth` hub contract address, on Polygon chainId: 137, repo name is `helloworld`

- `git3://0x0068bD3ec8D16402690C1Eddff06ACb913A209ef:56/helloworld`  
select `default` wallet, `0x0068...9ef` hub contract address, on BSC chainId: 56, repo name is `helloworld`




