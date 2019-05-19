import {
    Table, Model, Column, PrimaryKey, ForeignKey, CreatedAt, DataType, AfterSave
} from 'sequelize-typescript';

import { User } from "./User";
import { ioMsg } from "../io/routes/msg";

export type MsgStatic = {
    msgId: string; 
    to: string;
    type: string;
    content: string;
    isRead: boolean;
    jsonData: string; // NotificationItem
    createAt: Date; // Date
}

@Table
export class Msg extends Model<Msg> {
    @AfterSave
    static G(m: Msg) {
        console.log('Before Save Msg', m.to)
        setTimeout(() => ioMsg.changeStateFor(m.to), 500);
    }

    @PrimaryKey
    @Column
    msgId: string;

    @ForeignKey(() => User)
    @Column
    to: string;

    @Column
    type: string;

    @Column
    content: string;

    @Column
    isRead: boolean;

    @Column(DataType.TEXT('long'))
    jsonData: string;

    @Column
    reserved: number;

    @CreatedAt
    @Column
    createAt: Date; 

    static createNotification(
        to: string, jsonData: NotificationItem
    ) {
        const msg = new Msg();
        
        msg.msgId = Date.now().toString(32);
        msg.type = 'notification';
        msg.to = to;
        msg.isRead = false;
        
        msg.jsonData = JSON.stringify(jsonData);

        return msg;
    }

    static createReq(
        reqId: string, to: string, jsonData: ReqBody
    ) {
        const msg = new Msg();
        msg.msgId = reqId;
        msg.type = 'request';
        msg.to = to;
        msg.isRead = false;

        msg.jsonData = JSON.stringify(jsonData);

        return msg;
    }

    static async findReq(reqId: string): Promise<[ Msg, ReqBody ] | null> {
        const msg = await Msg.findOne({ where: { msgId: reqId } });

        return (msg && msg.type === 'request') ?
            [msg, JSON.parse(msg.jsonData) as ReqBody] : 
            null;
    }

    static fromStaticObj(obj: Partial<MsgStatic>) {
        const msg = new Msg();
        Object.assign(msg, obj);
        return msg;
    }

    toStatic(): MsgStatic {
        return {
            msgId: this.msgId,
            to: this.to,
            type: this.type,
            content: this.content,
            isRead: this.isRead,
            jsonData: this.jsonData, // NotificationItem
            createAt: this.createAt // Date
        }
    }
}

export type NotificationItem = {
    text: string, url?: string
}

export type ReqBody = {
    state: 'pendding' | 'resolved' | 'rejected';
    resUrl: string;
    rejUrl: string;

    resMsg: MsgStatic;
    rejMsg: MsgStatic;
}
