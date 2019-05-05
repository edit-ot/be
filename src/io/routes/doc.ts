import * as socketio from "socket.io";

import * as sharedSession from "express-socket.io-session";
import { session } from "../../app";
import { StdSession } from "utils/StdSession";
import { User, Doc } from "../../Model";
import { Delta } from "edit-ot-quill-delta";
import { DocPool, UserComment } from "./DocPool";

const docPool = new DocPool();

export default (io: socketio.Server) => {
    const docIo = io.of('/doc');

    docIo.use(sharedSession(session, {
        autoSave: true
    }));
    
    docIo.use((socket, next) => {
        const { user } = socket.handshake.session as StdSession;
    
        const cancelConn = () => {
            socket.disconnect(true);
            socket.emit('no-login');
            console.log('A User Want To Login, But Refuse. (he\'s no session)');
        }
        
        if (user) {
            User.findOne({ where: { username: user.username } }).then(userInfo => {
                if (!userInfo) {
                    cancelConn()
                } else {
                    (socket.handshake.session as StdSession).userInfo = userInfo;
                    next();
                }
            });
        } else {
            cancelConn();
        }
    });
    
    docIo.use((socket, next) => {
        const { docId } = socket.handshake.query;
    
        Doc.findOne({
            where: { id: docId }
        }).then(doc => {
            if (!doc) {
                socket.disconnect(true);
                socket.emit('data-error');
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
        const docIoRoom = docIo.to(doc.toRoomName());
    
        docPool.initRoom(doc, docIoRoom);
           
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
            
            // 通知
            socket.emit('i-logined', {
                userInfo, users: __users__, 
                contentHash: doc.contentHash(),
                doc: docPool.findOneStatic(doc.id)
            });
    
            // 通知
            docIo.emit('others-joined', userInfo);
            console.log('clients', err, __users__.map(u => u.username));
        });

        socket.on('disconnect', () => {
            docIo.emit('others-exit', userInfo);
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
    
            const target = docPool.findOne(doc.id);
            const { docComments } = target;
    
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
            const target = docPool.findOne(doc.id);
            if (!target) return console.log('remove-doc-comments not found');
    
            const { docComments } = target;
            const idx = docComments.findIndex(d => d.line === line);
            if (idx === -1) return;
            docComments.splice(idx, 1);
    
            docIoRoom.emit('remove-doc-comments', line);
        })
    
        socket.on('get-docComments', docId => {
            console.log('get-docComments', docId, Object.keys(docPool.pool));
            const target = docPool.findOne(docId);
            socket.emit('reveive-docComments', target.docComments);
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
        })
    
        socket.on('updateContents', async data => {
            console.log('!! updateContents', user.username);
    
            const delta = new Delta(data.delta);
            docPool.addToSeqFor(doc.id, userInfo, delta);
            
            // socket.emit('finishUpdate');
        });
    
        // docIo.sockets
        console.log(user, doc.title);
    });
    
}
