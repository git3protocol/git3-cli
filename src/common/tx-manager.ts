import { ethers } from "ethers"

export class TxManager {
    contract: ethers.Contract
    chainId: number
    price: ethers.providers.FeeData | null

    cancel: boolean

    blockTimeSec: number
    gasLimitRatio: number
    minNonce: number = -1
    queueCurrNonce: number = -1
    rbfTimes: number
    boardcastTimes: number
    waitDistance: number
    minRBFRatio: number

    _initialPromise: Promise<number> | null = null
    _deltaCount: number = 0

    constructor(
        contract: ethers.Contract,
        chainId: number,
        constOptions: {
            blockTimeSec?: number
            gasLimitRatio?: number
            rbfTimes?: number
            boardcastTimes?: number
            waitDistance?: number
            minRBFRatio?: number
        }
    ) {
        this.chainId = chainId
        this.contract = contract
        this.price = null
        this.cancel = false
        this.blockTimeSec = constOptions.blockTimeSec || 3
        this.gasLimitRatio = constOptions.gasLimitRatio || 1.2
        this.rbfTimes = constOptions.rbfTimes || 3
        this.boardcastTimes = constOptions.boardcastTimes || 3
        this.waitDistance = constOptions.waitDistance || 10
        this.minRBFRatio = constOptions.minRBFRatio || 1.3
    }

    async FreshBaseGas(): Promise<ethers.providers.FeeData | null> {
        this.price = await this.contract.provider.getFeeData()
        return this.price
    }

    CancelAll() {
        this.cancel = true
        // TODO: cancel all tx sended
    }

    async clearPendingNonce(num: number = 1, rbfRatio: number = 1.5) {
        const signer = this.contract.signer
        let nonce = await this.getNonce()
        this._deltaCount++
        console.error("clearPendingNonce", nonce, num)
        let price = await this.FreshBaseGas()
        let txs = []
        for (let i = 0; i < num; i++) {
            let res = signer.sendTransaction({
                to: await signer.getAddress(),
                nonce: nonce + i,
                gasLimit: 21000,
                type: 2,
                chainId: this.chainId,
                maxFeePerGas: price!.maxFeePerGas!.mul((rbfRatio * 100) | 0).div(100),
                maxPriorityFeePerGas: price!
                    .maxPriorityFeePerGas!.mul((rbfRatio * 100) | 0)
                    .div(100),
            })
            txs.push(res.then((tx) => tx.wait()))
        }
        await Promise.all(txs)
    }

    async getNonce(): Promise<number> {
        if (!this._initialPromise) {
            this._initialPromise = this.contract.signer.getTransactionCount("pending")
        }
        const deltaCount = this._deltaCount
        this._deltaCount++
        return this._initialPromise.then((initial) => initial + deltaCount)
    }

    async SendCall(_method: string, _args: any[]): Promise<any> {
        const nonce = await this.getNonce()
        if (this.queueCurrNonce < 0) this.queueCurrNonce = nonce

        let unsignedTx = await this.contract.populateTransaction[_method](..._args)
        unsignedTx.nonce = nonce
        unsignedTx.chainId = this.chainId
        // estimateGas check
        let gasLimit = await this.contract.provider.estimateGas(unsignedTx)
        unsignedTx.gasLimit = gasLimit.mul((this.gasLimitRatio * 100) | 0).div(100)
        let retryRBF = this.rbfTimes
        let rbfCount = 0
        let lastPrice = null

        let waitTxs: Record<string, any> = {}
        while (retryRBF > 0 && !this.cancel) {
            // set gas price
            let price
            try {
                price = await this.FreshBaseGas()
            } catch (e) {
                price = this.price
            } finally {
                if (!price || !price.maxFeePerGas || !price.maxPriorityFeePerGas) {
                    throw new Error("get fee data failed")
                }
            }
            if (lastPrice) {
                // RBF
                console.error("[tx-manager] RBF", "nonce:", nonce, "cnt:", rbfCount)
                let maxFeePerGasMin = lastPrice
                    .maxFeePerGas!.mul((this.minRBFRatio * 100) | 0)
                    .div(100)
                if (price.maxFeePerGas.lt(maxFeePerGasMin)) {
                    price.maxFeePerGas = maxFeePerGasMin
                }
                let maxPriorityFeePerGasMin = lastPrice
                    .maxPriorityFeePerGas!.mul((this.minRBFRatio * 100) | 0)
                    .div(100)
                if (price.maxPriorityFeePerGas.lt(maxPriorityFeePerGasMin)) {
                    price.maxPriorityFeePerGas = maxPriorityFeePerGasMin
                }
            }
            lastPrice = price
            if (price && price.maxFeePerGas && price.maxPriorityFeePerGas) {
                unsignedTx.type = 2
                unsignedTx.maxFeePerGas = price.maxFeePerGas
                unsignedTx.maxPriorityFeePerGas = price.maxPriorityFeePerGas
            } else {
                throw new Error("get fee data failed")
            }

            // sign
            let signedTx = await this.contract.signer.signTransaction(unsignedTx)

            let retryBoardcast = this.boardcastTimes
            let txRes: ethers.providers.TransactionResponse | null = null
            while (retryBoardcast > 0 && !this.cancel) {
                if (nonce <= this.queueCurrNonce + 1) {
                    // Arrive in line
                    retryBoardcast--
                } else if (nonce - this.queueCurrNonce > this.waitDistance) {
                    // Too far away don't boardcast, waitTime = int(distance / groupSize) * blockTime + 1s
                    const waitTime =
                        (((nonce - this.queueCurrNonce) / this.waitDistance) | 0) *
                            this.blockTimeSec *
                            1000 +
                        1000
                    await new Promise((r) => setTimeout(r, waitTime))
                    continue
                } else {
                    // Broadcast first anyway
                }

                try {
                    // send
                    txRes = await this.contract.provider.sendTransaction(signedTx)
                    await new Promise((r) => setTimeout(r, (this.blockTimeSec / 2) * 1000))
                } catch (e: Error | any) {
                    if (e.code == ethers.errors.NONCE_EXPIRED) {
                        // ignore if tx already in mempool
                    } else if (e.code == ethers.errors.SERVER_ERROR) {
                        // ignore if tx already in mempool
                    } else if (e.code == ethers.errors.REPLACEMENT_UNDERPRICED) {
                        // gas price too low, rbf++ but total rbf times < rbfTimes*2
                        if (rbfCount < this.rbfTimes * 2) {
                            retryRBF++
                        }
                    } else if (e.code == ethers.errors.INSUFFICIENT_FUNDS) {
                        console.error("insufficient funds!")
                        throw Error("insufficient funds!")
                    } else {
                        console.error("[tx-manager] sendTransaction", nonce, e.code, e.message)
                    }
                    // console.error(
                    //     "[tx-manager] sendTransaction",
                    //     nonce,
                    //     this.queueCurrNonce,
                    //     e.code,
                    //     e.message
                    // )
                }
                if (txRes) {
                    // wait
                    waitTxs[txRes.hash] = txRes
                    let done = new Promise((resolve, reject) => {
                        let errCnt = 0
                        let reportError = (e: Error) => {
                            errCnt++
                            if (errCnt >= Object.keys(waitTxs).length) {
                                reject(new Error("all timeout"))
                            }
                        }
                        for (let hash of Object.keys(waitTxs)) {
                            // console.error("wait start", nonce, hash)
                            this.contract.provider
                                .waitForTransaction(hash, 1, this.blockTimeSec * 1000 + 1000)
                                .then((receipt) => {
                                    resolve(receipt)
                                    return receipt
                                })
                                .catch((e) => {
                                    if (e.code == ethers.errors.TIMEOUT) {
                                        // ignore timeout
                                    } else {
                                        console.error(
                                            "[tx-manager] waitForTransaction",
                                            nonce,
                                            hash,
                                            e.code,
                                            e.reason
                                        )
                                    }
                                    // console.error(
                                    //     "[tx-manager] waitForTransaction",
                                    //     nonce,
                                    //     hash,
                                    //     e.code,
                                    //     e.reason
                                    // )
                                    // console.error("wait", nonce, hash, e.code)
                                    reportError(e)
                                })
                        }
                    })
                    try {
                        let receipt = await done
                        this.queueCurrNonce =
                            nonce > this.queueCurrNonce ? nonce : this.queueCurrNonce
                        // console.error("wait done", nonce)
                        return receipt
                    } catch (e) {
                        // ignore
                    }
                } else {
                    // send first time failed, wait 1s then try again
                    await new Promise((r) => setTimeout(r, 1000))
                }
            }
            retryRBF--
            rbfCount++
        }

        throw new Error(`send tx failed: ${nonce}`)
    }
}
