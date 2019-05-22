import * as socketio from "socket.io";
import { User, Doc } from "../../../Model";
import { Delta } from "edit-ot-quill-delta";
import { StdSession } from "utils/StdSession";
import { coZonePool, UserComment } from "../../CoZone";
import { IOSessionBridge, IOLoginMiddleware } from "../../wares/IOLogin";
import * as JSONStringify from "fast-json-stable-stringify"

export default (io: socketio.Server) => {
    const docIo = io.of('/doc');

    docIo.use(IOSessionBridge);
    
    docIo.use(IOLoginMiddleware);

    docIo.use((socket, next) => {
        const { docId } = socket.handshake.query;
    
        Doc.findOne({
            where: { id: docId }
        }).then(doc => {
            if (!doc) {
                socket.emit('data-error');
                socket.disconnect(true);
            } else {
                // @ts-ignore
                socket.doc = doc;
    
                socket.join(doc.toRoomName(), () => {
                    next();
                });
            }
        })
    });
    
    docIo.on('connect', socket => {
        // @ts-ignore
        const doc: Doc = socket.doc;
    
        const { user, userInfo } = socket.handshake.session as StdSession;

        const docRoomName = doc.toRoomName();
        const subDocId = '1';
        const docIoRoom = docIo.to(docRoomName);

        console.log('DocIo On Connect:', userInfo.username);
        
        const zone = coZonePool.createZone(docRoomName, docIoRoom, {});

        const initDelta = doc.content ?
            new Delta(JSON.parse(doc.content)) : new Delta().insert('\n');

        zone.createSubDoc(subDocId, initDelta);

        zone.startTask();
        
        docIoRoom.clients((err: any, list: string[]) => {
            const users: User[] = list.filter(sid => {
                return docIo.connected[sid].connected;
            }).map(sid =>
                // @ts-ignore
                docIo.connected[sid].handshake.session.userInfo
            );
            const map = {};
            users.forEach(u => map[u.username] = true);
            const __users__ = users.filter(u => {
                const r = map[u.username];
                delete map[u.username];
                return r;
            });

            const sharedDoc = zone.findSubDoc(subDocId);

            socket.on('i-login', () => {
                console.log('when i-login', userInfo.username);

                socket.emit('i-logined', {
                    userInfo, users: __users__, 
                    contentHash: doc.contentHash(),
                    doc: {
                        now: sharedDoc.now,
                        docComments: sharedDoc.docComments
                    }
                });

                // 通知
                docIo.emit('others-joined', userInfo);
                console.log('clients', err, __users__.map(u => u.username));
            });
        });

        socket.on('disconnect', reasone => {
            console.log('User Disconnect', userInfo.username, reasone);
            docIo.emit('others-exit', userInfo);

            docIoRoom.clients((err: any, list: string[]) => {
                console.log('exist', list.length);
                if (list.length === 0) {
                    console.log('保存');

                    const sharedDoc = zone.findSubDoc(subDocId);
                    zone.tick();
                    const str = JSONStringify(sharedDoc.now);
                    doc.content = str;
                    doc.save();
                }
            })
        });

        socket.on('ChangePermissionPopup Popped', () => {
            docIo.emit('ChangePermissionPopup Popped');
        });
    
        // Change Line 
        socket.on('change-line', data => {
            socket.emit('others-change-line', {
                idx: data.idx, 
                username: user.username
            });
        });
    
        socket.on('add-user-comment', data => {
            console.log('on add-user-comment', data);
    
            const comment = data.comment as UserComment;
            const line = data.line as number;
    
            const { docComments } = zone.findSubDoc(subDocId);
    
            const idx = docComments.findIndex(d => d.line === line);
    
            if (idx === -1) {
                docComments.push({
                    line, 
                    comments: [comment]
                });
            } else {
                docComments[idx].comments.push(comment);
            }
    
            docIoRoom.emit('add-user-comment', data);
        });
    
        socket.on('remove-doc-comments', line => {
            const sharedDoc = zone.findSubDoc(subDocId);
            sharedDoc.removeComment(d => d.line = line)   
            docIoRoom.emit('remove-doc-comments', line);
        })
    
        socket.on('get-docComments', docId => {
            // console.log('get-docComments');
            const sharedDoc = zone.findSubDoc(subDocId);
            socket.emit('reveive-docComments', sharedDoc.getComments());
        });
    
        socket.on('change-title', data => {
            const { title } = data;
            doc.title = title;
            doc.save().then(() => {
                docIoRoom.emit('owner-change-title', title);
            })
        });
    
        socket.on('say-hello', user => {
            console.log('say-hello', user);
            docIoRoom.emit('say-hello', user);
        });
    
        socket.on('updateContents', async data => {
            console.log('!! updateContents', user.username);

            const delta = new Delta(data.delta);

            zone.addSeqFor(subDocId, userInfo, delta);
            // socket.emit('finishUpdate');
        });
    
        // docIo.sockets
        console.log(user, doc.title);
    });
    
}
