import * as socketio from "socket.io";
// import { EventEmitter } from "events";
import { Delta } from "edit-ot-quill-delta";
import { User } from "../../Model";
import { Zone } from "./Zone";

export * from "./SharedDoc";

// 协作空间池
export type ZonePool = {
    // 以自定义的 zone id 标识协助空间
    [zoneId: string]: Zone
}

export type FlushListener = (
    (todo: 'update' | 'exclude-update', userList: User[], delta: Delta) => void
);

export class CoZonePool {
    pool: ZonePool = {};

    createZone(
        zoneId: string,
        ioRoom: socketio.Namespace
    ): Zone {
        if (this.pool[zoneId]) {
            console.log('Zone Exists:', zoneId);
        } else {
            console.log('Zone Init:', zoneId);
            this.pool[zoneId] = new Zone(ioRoom);
        }

        return this.pool[zoneId];
    }
}

// Std Instance 
export const coZonePool = new CoZonePool();
