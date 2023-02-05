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
    highestNonce: number = -1
    rbfTimes: number
    boardcastTimes: number
    waitDistance: number
    minRBFRatio: number

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

    async SendCall(_method: string, _args: any[]): Promise<any> {
        let unsignedTx = await this.contract.populateTransaction[_method](
            ..._args
        )
        unsignedTx.chainId = this.chainId
        if (this.highestNonce < 0) {
            this.highestNonce = await this.contract.signer.getTransactionCount()
        }
        const nonce = this.highestNonce
        unsignedTx.nonce = nonce
        this.highestNonce += 1

        // estimateGas check
        let gasLimit = await this.contract.provider.estimateGas(unsignedTx)
        unsignedTx.gasLimit = gasLimit
            .mul((this.gasLimitRatio * 100) | 0)
            .div(100)
        let retryRBF = this.rbfTimes

        let lastPrice = null
        while (retryRBF > 0 && !this.cancel) {
            // set gas price
            let price
            try {
                price = await this.FreshBaseGas()
            } catch (e) {
                price = this.price
            } finally {
                if (
                    !price ||
                    !price.maxFeePerGas ||
                    !price.maxPriorityFeePerGas
                ) {
                    throw new Error("get fee data failed")
                }
            }
            if (lastPrice) {
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
            let signedTx = await this.contract.signer.signTransaction(
                unsignedTx
            )

            let retryBoardcast = this.boardcastTimes
            let txRes = null
            while (retryBoardcast > 0 && !this.cancel) {
                if (
                    this.queueCurrNonce < 0 ||
                    this.queueCurrNonce + 1 == nonce
                ) {
                    // Arrive in line
                    retryBoardcast--
                } else if (nonce - this.queueCurrNonce > this.waitDistance) {
                    // Too far away don't boardcast, waitTime = int(distance / groupSize) * blockTime + 1s
                    const waitTime =
                        (((nonce - this.queueCurrNonce) / this.waitDistance) |
                            0) *
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
                    txRes = await this.contract.provider.sendTransaction(
                        signedTx
                    )
                    await new Promise((r) =>
                        setTimeout(r, (this.blockTimeSec / 2) * 1000)
                    )
                } catch (e: Error | any) {
                    if (e.code == ethers.errors.NONCE_EXPIRED) {
                        // ignore if tx already in mempool
                    } else {
                        console.error(
                            "[tx-manager] sendTransaction",
                            nonce,
                            e.code,
                            e.message
                        )
                    }
                }
                if (txRes) {
                    // wait
                    try {
                        let receipt =
                            await this.contract.provider.waitForTransaction(
                                txRes.hash,
                                1,
                                this.blockTimeSec * 1000 + 1000
                            )
                        if (receipt) {
                            this.queueCurrNonce =
                                txRes.nonce > this.queueCurrNonce
                                    ? txRes.nonce
                                    : this.queueCurrNonce
                            return receipt
                        }
                    } catch (e: Error | any) {
                        if (e.code == ethers.errors.TIMEOUT) {
                            // ignore timeout
                        } else {
                            console.error(
                                "[tx-manager] waitForTransaction",
                                nonce,
                                txRes.hash,
                                e.code,
                                e.reason
                            )
                        }
                    }
                } else {
                    await new Promise((r) => setTimeout(r, 1000))
                }
            }
            retryRBF--
        }

        throw new Error("send tx failed")
    }
}
