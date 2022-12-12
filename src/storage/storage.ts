
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
    remove(path: string): Promise<Status>
    listRefs(): Promise<Ref[]>
    setRef(path: string, sha: string): Promise<Status>
    removeRef(path: string): Promise<Status>

}