
import GitRemoteHelper from 'git-remote-helper';
import debug from 'debug';
const log = debug('git3');
debug.enable('git3');

GitRemoteHelper({
    env: process.env,
    stdin: process.stdin,
    stdout: process.stdout,
    api: {
        /**
         * This will always be invoked when the remote helper is invoked
         */
        init: async (p: {
            gitdir: string
            remoteName: string
            remoteUrl: string
        }) => {
            log('initlog', p);
            return
        },
        /**
         * This needs to return a list of git refs.
         */
        list: async (p: {
            gitdir: string;
            remoteName: string;
            remoteUrl: string;
            forPush: boolean;
        }) => {
            log('list log', p)
            // 相同 HEAD
            return 'dbeac55f31922c90d34f9e57cc709c2c306c7e2e refs/heads/master\n\n';
            // 不同 HEAD
            return 'dbeac55f31922c90d34f9e57cc709c2c306c7e2f refs/heads/master\n\n';
        },
        /**
         * This should put the requested objects into the `.git`
         */
        handleFetch: async (p: {
            gitdir: string;
            remoteName: string;
            remoteUrl: string;
            refs: { ref: string; oid: string }[];
        }) => {
            return '\n\n';
        },
        /**
         * This should copy objects from `.git`
         */
        handlePush: async (p: {
            gitdir: string;
            remoteName: string;
            remoteUrl: string;
            refs: {
                src: string;
                dst: string;
                force: boolean;
            }[];
        }) => {
            log("push", p)
            return '\n';
        },
    },
}).catch((error: any) => {
    console.error("wtf");
    console.error(error);
});