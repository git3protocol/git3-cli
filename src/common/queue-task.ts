export interface QueueTaskOptions {
    maxRetry?: number
    queueInterval?: number
    maxPending?: number
    retryInterval?: number
}

export class QueueTask {
    maxRetry: number = 0
    queueInterval: number = 0
    maxPending: number = 0
    retryInterval: number = 0

    lastTaskScheduled: number = 0
    pending: number = 0

    checkPointWait!: Promise<void>
    checkPointResolve: any

    index: number = 0
    constructor({
        maxRetry = 10,
        queueInterval = 0,
        maxPending = 0,
        retryInterval = 0,
    }: QueueTaskOptions) {
        this.maxRetry = maxRetry
        this.queueInterval = queueInterval
        this.maxPending = maxPending
        this.retryInterval = retryInterval
        this.refreshCheckPoint()
    }

    async refreshCheckPoint() {
        this.checkPointWait = new Promise((resolve) => {
            this.checkPointResolve = resolve
        })
    }

    async tickThread() {
        return new Promise(async (resolve) => {
            let now = Date.now().valueOf()
            if (this.maxPending > 0) {
                while (this.pending >= this.maxPending) {
                    await this.checkPointWait
                    this.checkPointWait = new Promise((resolve) => {
                        this.checkPointResolve = resolve
                    })
                }
            }
            if (now - this.lastTaskScheduled < this.queueInterval) {
                let delta = this.queueInterval - (now - this.lastTaskScheduled)
                setTimeout(() => {
                    resolve(true)
                }, delta)
                // console.error("wait delta", delta, "ms")
                this.lastTaskScheduled = now + delta
                return
            } else {
                this.lastTaskScheduled = now
                resolve(true)
                return
            }
        })
    }

    async run(func: Function, retry: number = this.maxRetry): Promise<any> {
        let lastError
        for (let i = 0; i < retry; i++) {
            this.index++
            // let start = Date.now().valueOf()
            // let index = this.index
            // console.error("wait-" + index)
            await this.tickThread()
            // console.error("run-" + index, Date.now().valueOf() - start, "ms")

            this.pending++
            try {
                // let start = Date.now().valueOf()
                let res = await func()
                // console.error("done-" + index, Date.now().valueOf() - start, "ms")
                this.pending--
                this.checkPointResolve(true)
                return res
            } catch (err: any) {
                lastError = err
                this.pending--
                this.checkPointResolve(true)
                await new Promise((r) => setTimeout(r, this.retryInterval))
            }
        }
        if (lastError) throw lastError
    }
}

export function Retrier(
    func: Function,
    { maxRetry = 10, queueInterval = 0, maxPending = 0, retryInterval = 0 }: QueueTaskOptions
): Promise<any> {
    return new QueueTask({ maxRetry, queueInterval, maxPending, retryInterval }).run(func)
}
