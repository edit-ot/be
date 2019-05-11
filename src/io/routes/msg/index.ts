import * as socketio from "socket.io";
import { StdSession } from "utils/StdSession";
import { Msg } from "../../../Model/Msg";
import { SocketManager } from "../../utils/SocketManager";
import { IOSessionBridge, IOLoginMiddleware } from "../../wares/IOLogin";



export default (io: socketio.Server) => {
    const msgIo = io.of('/site-msg');
    const sm = new SocketManager(msgIo);

    msgIo.use(IOSessionBridge);
    
    msgIo.use(IOLoginMiddleware);
  
    msgIo.on('connect', socket => {
        const { user } = socket.handshake.session as StdSession;
        console.log('/msg onconnect');

        socket.on('msg-login', () => {
            console.log('Shit');
            Msg.findOne({where: {
                to: user.username, isRead: false
            }}).then(msg => {
                socket.emit('msg-read-state-change', {
                    hasUnRead: !!msg,
                    msg: null
                });
            });
        });

        socket.on('send-msg', async data => {
            const msg = new Msg();

            msg.to = data.to;
            msg.type = data.type
            msg.content = data.content;
            msg.isRead = !!data.isRead; // undefined is false
            msg.jsonData = data.jsonData;

            await msg.save();

            const client = await sm.getClient(data.to);

            if (client) {
                socket.emit('msg-read-state-change', {
                    hasUnRead: true,
                    msg
                });
            }
        });
    });
}

