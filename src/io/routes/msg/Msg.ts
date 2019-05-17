import { SocketManager } from "../../utils/SocketManager";
import { Msg } from "../../../Model/Msg";

export class IOMsg extends SocketManager {
    constructor(nsRoom: SocketIO.Namespace) {
        super(nsRoom);
    }

    useNsRoom(nsRoom: SocketIO.Namespace) {
        this.nsRoom = nsRoom;
    }

    sendNotification(to: string, jsonData: any = {}) {
        const msg = Msg.createNotification(to, jsonData);

        msg.save();

        this.getClient(to).then(client => {
            if (client) {
                client.socket.emit('msg-read-state-change', {
                    hasUnRead: true, msg: null
                });
            }
        });
    }
}
