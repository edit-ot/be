import * as socketio from "socket.io";
import { EventEmitter } from "events";
import { Delta } from "edit-ot-quill-delta";
import { User, UserStatic } from "../Model";
import { StdSession } from "utils/StdSession";
import * as md5 from "md5";
import * as JSONStringify from "fast-json-stable-stringify"

export type Patcher = (
    type: 'exclude' | 'include',
    userList: User[],
    delta: Delta,
    hash: string
) => void;

export type UserComment = {
    user: UserStatic,
    text: string,
    createAt: number
}

export class SharedDoc {
    now: Delta;
    zoneComments: {
        line: number;
        comments: UserComment[];
    }[] = [];

    seq: {
        user: User,
        delta: Delta
    }[] = [];

    constructor(sharedDoc: Delta) {
        this.now = sharedDoc;
    }

    pushSeq(user: User, delta: Delta) {
        this.seq.push({
            user,
            delta
        });
    }

    flushSeq = (patcher: Patcher) => {
        if (this.seq.length === 0) {
            return;
        } else if (this.seq.length === 1) {
            const [fir] = this.seq;
            this.now = this.now.compose(fir.delta);
            this.seq = [];

            patcher(
                'exclude',
                [fir.user],
                fir.delta,
                md5(JSONStringify(this.now))
            );
        } else {
            const [fir, sec] = this.seq;

            console.log('fir', fir.user.username, fir.delta);
            console.log('sec', sec.user.username, sec.delta);

            const firShouldUpdate = fir.delta.transform(sec.delta, true);
            console.log('firShouldUpdate', firShouldUpdate);

            const secShouldUpdate = sec.delta.transform(fir.delta, false);
            console.log('secShouldUpdate', secShouldUpdate);
            
            // Update 
            const nextNow = this.now.compose(fir.delta).compose(firShouldUpdate);
            const nextHash = md5(JSONStringify(nextNow));
            this.now = nextNow;
            
            patcher('include', [fir.user], firShouldUpdate, nextHash);
            patcher('include', [sec.user], secShouldUpdate, nextHash);

            this.seq = this.seq.slice(2);
            patcher('exclude', [fir.user, sec.user], fir.delta.compose(sec.delta), nextHash);
        }
    }
}

// 协作空间池
export type ZonePool = {
    // 以自定义的 zone id 标识协助空间
    [zoneId: string]: {
        docMap: {
            [subDocId: string]: SharedDoc
        },
        
        ioRoom: socketio.Namespace,

        patchTask: NodeJS.Timeout
    }
}

export type FlushListener = (
    (todo: 'update' | 'exclude-update', userList: User[], delta: Delta) => void
);

export class CoZonePool extends EventEmitter {
    pool: ZonePool = {};

    createZone(
        zoneId: string,
        ioRoom: socketio.Namespace
    ) {
        console.log('Zone Init:', zoneId);

        return this.pool[zoneId] ? this.pool[zoneId] : {
            docMap: {},
            seq: [],
            ioRoom,
            zoneComments: [],
            patchTask: setInterval(() => {
                this.tickFor(zoneId);
            }, 3000)
        };

        // const nowDelta = doc.content ?
        //     new Delta(JSON.parse(doc.content)) : new Delta().insert('\n');
    }

    addSeqFor(zoneId: string, subDocId: string, user: User, delta: Delta) {
        const doc = this.pool[zoneId].docMap[subDocId];
        doc.pushSeq(user, delta);

        return this;
    }

    createSubDoc(zoneId: string, subDocId: string, initDelta: Delta) {
        const doc = new SharedDoc(initDelta);
        this.pool[zoneId].docMap[subDocId] = doc;

        return doc;
    }    

    findOne(zoneId: string) {
        return this.pool[zoneId] || null;
    }

    tickFor(zoneId: string) {
        if (!this.pool[zoneId]) return console.log(' - tickFor zoneId Not Found');
        const { docMap } = this.pool[zoneId];

        Object.keys(docMap).forEach(key => {
            const doc = docMap[key];

            doc.flushSeq((type, userlist, delta, hash) => {
                this.update(zoneId, type, userlist, delta, hash);
            });
        })
    }

    update(
        zoneId: string,
        type: 'include' | 'exclude',
        users: User[],
        delta: Delta,
        contentHash: string
    ) {
        const refUser = users.map(u => u.username).reduce((acc, cur) => {
            acc[cur] = true;
            return acc;
        }, {} as { [key: string]: true });

        this.getSockets(zoneId).then(sockets => {
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

    getSockets(zoneId: string ): Promise<socketio.Socket[]> {
        if (!this.pool[zoneId]) {
            console.log(' - getSockets zoneId Not Found');
            return Promise.resolve([]);
        }

        const { ioRoom } = this.findOne(zoneId);

        return new Promise((res, rej) => {
            ioRoom.clients((err: any, sids: string[]) => {
                err ? rej(err) :
                    res(sids.map(sid => ioRoom.connected[sid]));
            });
        });
    }
}

export const coZonePool = new CoZonePool();
