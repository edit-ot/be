import * as socketio from "socket.io";
import * as sharedSession from "express-socket.io-session";
import { session } from "../app";
import { StdSession } from "utils/StdSession";
import { User, Doc } from "../Model";
import { Delta } from "edit-ot-quill-delta";
import { DocPool } from "./DocPool";

const docPool = new DocPool();

const io = socketio();
// Attach To Express Server 
export function ATTACH_IO(server: any) {
    io.attach(server);
}

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
        attributes: { exclude: ['openid', 'id', 'pwd'] },
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
        const users: User[] = list.map(sid =>
            // @ts-ignore
            docIo.connected[sid].handshake.session.userInfo);
        
        // 通知
        socket.emit('i-logined', {
            userInfo, users, 
            contentHash: doc.contentHash()
        });

        // 通知
        docIo.emit('others-joined', userInfo);
        
        console.log('clients', err, users.map(u => u.username));
    });

    // Change Line 
    socket.on('change-line', data => {
        socket.emit('others-change-line', {
            idx: data.idx, 
            username: user.username
        });
    });


    socket.on('updateContents', async data => {
        console.log('!! updateContents', user.username);

        const delta = new Delta(data.delta);
        docPool.addToSeqFor(doc.id, userInfo, delta);
        
        // socket.emit('finishUpdate');
    });

    // docIo.sockets
    console.log(user, doc.title);
});



