import * as socketio from "socket.io";
// import { EventEmitter } from "events";
import { Delta } from "edit-ot-quill-delta";
import { User } from "../../Model";
import { Zone } from "./Zone";

export * from "./SharedDoc";

// 协作空间池
export type ZonePool = {
    // 以自定义的 zone id 标识协助空间
    // @ts-ignore
    [zoneId: string]: Zone
}

export type FlushListener = (
    (todo: 'update' | 'exclude-update', userList: User[], delta: Delta) => void
);

export class CoZonePool {
    pool: ZonePool = {};

    createZone<S>(
        zoneId: string,
        ioRoom: socketio.Namespace,
        store: S
    ): Zone<S> {
        if (this.pool[zoneId]) {
            console.log('Zone Exists:', zoneId);
        } else {
            console.log('Zone Init:', zoneId);
            
            this.pool[zoneId] = new Zone(ioRoom, store);
        }

        return this.pool[zoneId];
    }

    removeZone<S>(zoneId: string) {
        const zone = this.pool[zoneId] as Zone<S>;

        if (!zone) return null;
        zone.stopTask();
        delete this.pool[zoneId];

        console.log('Remove Zone:', zoneId);
        console.log('Now Zone Pool:', Object.keys(this.pool));

        return zone;
    }
}

// Std Instance 
export const coZonePool = new CoZonePool();
