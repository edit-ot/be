import { SocketManager } from "../../utils/SocketManager";
import { Msg, NotificationItem } from "../../../Model/Msg";

export class IOMsg extends SocketManager {
    constructor(nsRoom: SocketIO.Namespace) {
        super(nsRoom);
    }

    useNsRoom(nsRoom: SocketIO.Namespace) {
        this.nsRoom = nsRoom;
    }

    sendNotification(to: string, jsonData: NotificationItem) {
        const msg = Msg.createNotification(to, jsonData);
        msg.save();
        return msg;
    }
    
    changeStateFor(theUser: string, hasUnRead: boolean = true) {
        return this.getClient(theUser).then(client => {
            if (!client) return;
            client.socket.emit('msg-read-state-change', { hasUnRead, msg: null });
        });
    }
}
