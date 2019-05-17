import * as socketio from "socket.io";
import { StdSession } from "utils/StdSession";
import * as sharedSession from "express-socket.io-session";

import { User } from "../../Model";
import { session } from "../../before";

export const IOSessionBridge = sharedSession(session, {
    autoSave: true
});

// (socket: socketio.Socket, fn: (err?: any) => void
export const IOLoginMiddleware = (socket: socketio.Socket, next: (err?: any) => void) => {
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
}
