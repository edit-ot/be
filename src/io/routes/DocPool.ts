import * as socketio from "socket.io";
import { EventEmitter } from "events";
import { Delta } from "edit-ot-quill-delta";
import { User, Doc, UserStatic } from "../../Model";
import { StdSession } from "utils/StdSession";
import * as md5 from "md5";
import * as JSONStringify from "fast-json-stable-stringify"


export type UserDelta = {
    user: User,
    delta: Delta
}

export type UserComment = {
    user: UserStatic,
    text: string,
    createAt: number
}

export class DocComment {
    line: number;
    comments: UserComment[];
}

// 协作空间池
export type DocPoolStatic = {
    // 以自定义的 docId 标识协助空间
    [docId: string]: {
        now: Delta,                  // 当前文档内容
        seq: UserDelta[],            // 任务队列
        docComments: DocComment[],   // 用户评论
        docRoom: socketio.Namespace, // 用户列表
        patchTask: NodeJS.Timeout    // 定时器任务
    }
}

export type FlushListener = (
    (todo: 'update' | 'exclude-update', userList: User[], delta: Delta) => void
);

export class DocPool extends EventEmitter {
    pool: DocPoolStatic = {};

    initRoom(doc: Doc, docRoom: socketio.Namespace) {
        console.log('initRoom', doc.id);
        if (this.pool[doc.id]) {
            return null;
        } else {
            const nowDelta = doc.content ?
                new Delta(JSON.parse(doc.content)) : new Delta().insert('\n');
            
            this.pool[doc.id] = {
                now: nowDelta,
                seq: [],
                docRoom,
                docComments: [],
                patchTask: setInterval(() => {
                    this.flush(doc.id);
                }, 3000)
            }
            
            return this.pool[doc.id];
        }
    }

    findOne(docId: number | string) {
        return this.pool[docId] || null;
    }

    findOneStatic(docId: number | string) {
        const one = this.findOne(docId);

        if (one) {
            return {
                now: one.now,
                docComments: one.docComments
            }
        } else {
            return null;
        }
    }

    addToSeqFor(docId: number | string, user: User, delta: Delta) {
        const { seq } = this.findOne(docId);
        seq.push({ user, delta });
    }

    flush = (docId: number | string) => {
        const doc = this.findOne(docId);
        console.log('To Flush');
        doc.now.forEach(op => {
            console.log(' -', JSON.stringify(op));
        })

        if (doc.seq.length === 0) {
            return;
        } else if (doc.seq.length === 1) {
            const [fir] = doc.seq;
            doc.now = doc.now.compose(fir.delta);
            doc.seq = [];

            this.update(docId, 'exclude', [fir.user], fir.delta,
                md5(JSONStringify(doc.now)));
        } else {
            const [fir, sec] = doc.seq;

            console.log('fir', fir.user.username, fir.delta);
            console.log('sec', sec.user.username, sec.delta);

            const firShouldUpdate = fir.delta.transform(sec.delta, true);
            console.log('firShouldUpdate', firShouldUpdate);
            const secShouldUpdate = sec.delta.transform(fir.delta, false);
            console.log('secShouldUpdate', secShouldUpdate);
            
            // Update 
            const nextNow = doc.now.compose(fir.delta).compose(firShouldUpdate);
            const nextHash = md5(JSONStringify(nextNow));
            doc.now = nextNow;
            

            this.update(docId, 'include', [fir.user], firShouldUpdate, nextHash);
            this.update(docId, 'include', [sec.user], secShouldUpdate, nextHash);

            // Update
            doc.seq = doc.seq.slice(2);
            this.update(docId, 'exclude', [fir.user, sec.user], fir.delta.compose(sec.delta), nextHash);
        }
    }

    update(
        docId: string | number,
        type: 'include' | 'exclude',
        users: User[],
        delta: Delta,
        contentHash: string
    ) {
        const refUser = users.map(u => u.username).reduce((acc, cur) => {
            acc[cur] = true;
            return acc;
        }, {} as { [key: string]: true });

        this.getSockets(docId).then(sockets => {
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

    getSockets(docId: string | number): Promise<socketio.Socket[]> {
        const { docRoom } = this.findOne(docId);

        return new Promise((res, rej) => {
            docRoom.clients((err: any, sids: string[]) => {
                err ? rej(err) :
                    res(sids.map(sid => docRoom.connected[sid]));
            });
        });
    }
}
