import {
    Table, Model, Column, PrimaryKey, ForeignKey, CreatedAt
} from 'sequelize-typescript';

import { User } from "./User";

@Table
export class Msg extends Model<Msg> {
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

    @Column
    jsonData: string;

    @CreatedAt
    @Column
    createAt: Date;
}
