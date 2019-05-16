import * as socketio from "socket.io";
import { StdSession } from "../../utils/StdSession";
import { User } from "Model";
import { EventEmitter } from "events";

export type Client = {
    userInfo: User,
    socket: socketio.Socket
}

export class SocketManager extends EventEmitter {
    nsRoom: socketio.Namespace;

    constructor(nsRoom: socketio.Namespace) {
        super();
        this.nsRoom = nsRoom;
    }

    async getClient(username: string): Promise< Client | null > {
        const cs = await this.ofClients();

        const target = cs.find(c => c.userInfo.username === username);

        return target || null;
    }

    /**
     * 获取 room 里的 Clients
     */
    ofClients(): Promise< Client[] > {
        return new Promise((resolve, reject) => {
            this.nsRoom.clients((err: any, list: string[]) => {
                if (err) {
                    reject(err);
                } else {
                    const res = list.filter(sid => {
                        return this.nsRoom.connected[sid].connected;
                    }).map(sid => {
                        const session = this.nsRoom.connected[sid].handshake.session as StdSession;
                        const { userInfo } = session;
    
                        return {
                            userInfo,
                            socket: this.nsRoom.connected[sid]
                        }
                    });
                        resolve(res);
                }
            });
        });
    }

    setLoginedUsersFor(target: socketio.Socket | socketio.Namespace) {
        return this.ofClients().then(cs => {
            const users = cs.map(c => c.userInfo);
            target.emit('setLoginedUsers', users);

            return users;
        });
    }
}
