import { SharedDoc } from "./SharedDoc";
import * as socketio from "socket.io";
import { User } from "../../Model";
import { Delta } from "edit-ot-quill-delta";
import { StdSession } from "utils/StdSession";

export class Zone {
    docMap: {
        [subDocId: string]: SharedDoc
    } = {};
    
    ioRoom: socketio.Namespace;

    patchTask: NodeJS.Timeout;

    constructor(ioRoom: socketio.Namespace) {
        this.ioRoom = ioRoom;
    }

    addSeqFor(subDocId: string, user: User, delta: Delta) {
        const sharedDoc = this.docMap[subDocId];
        if (sharedDoc) {
            sharedDoc.pushSeq(user, delta);
            return sharedDoc;
        } else {
            return null;
        }
    }

    createSubDoc(subDocId: string, initDelta: Delta) {
        if (this.docMap[subDocId]) {
            return this.docMap[subDocId];
        } else {
            const sharedDoc = new SharedDoc(initDelta);
            this.docMap[subDocId] = sharedDoc;
            return sharedDoc;
        }
    }

    findSubDoc(subDocId: string) {
        return this.docMap[subDocId] || null;
    }

    startTask() {
        this.patchTask = setInterval(() => {
            this.tick();
        }, 3000);
    }

    stopTask() {
        clearInterval(this.patchTask);
        // @ts-ignore
        this.patchTask = null;
    }

    tick() {
        const { docMap } = this;

        Object.keys(docMap).forEach(key => {
            const doc = docMap[key];
            doc.flushSeq(this.update);
        });
    }

    update = (
        type: 'include' | 'exclude',
        users: User[],
        delta: Delta,
        contentHash: string
    ) => {
        const refUser = users.map(u => u.username).reduce((acc, cur) => {
            acc[cur] = true;
            return acc;
        }, {} as { [key: string]: true });

        this.getSockets().then(sockets => {
            sockets.forEach(s => {
                const { userInfo } = s.handshake.session as StdSession;
                if (
                    ( refUser[userInfo.username] && type === 'include') || 
                    (!refUser[userInfo.username] && type === 'exclude')
                ) {
                    s.emit('update', {
                        delta, contentHash
                    });
                }

                // 匹配
                if (refUser[userInfo.username] && type === 'exclude') {
                    s.emit('finishUpdate', { contentHash });
                }
            });
        });
    }

    getSockets(): Promise<socketio.Socket[]> {
        const { ioRoom } = this;
        return new Promise((res, rej) => {
            ioRoom.clients((err: any, sids: string[]) => {
                err ? rej(err) :
                    res(sids.map(sid => ioRoom.connected[sid]));
            });
        });
    }
}

