
export enum Status {
    SUCCEED = "SUCCEED",
    TIMEOUT = "TIMEOUT",
    FAILED = "FAILED",
}

export type Ref = {
    ref: string
    sha: string

}

export interface Storage {
    repoURI: string

    download(path: string): Promise<[Status, Buffer]>
    upload(path: string, file: Buffer): Promise<Status>
    delete(path: string): Promise<void>
    listRefs(): Promise<Ref[]>
    addRefs(refs: Ref[]): Promise<Status>
    delRefs(refs: Ref[]): Promise<Status>

}