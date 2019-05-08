import { Table, Model, Column, ForeignKey } from 'sequelize-typescript';
import { User } from './User';
import { Doc } from './Doc';

@Table
export class UserDoc extends Model<UserDoc> {
    // doc id
    @ForeignKey(() => User)
    @Column
    username: string;

    @ForeignKey(() => Doc)
    @Column
    docId: number;

    @Column
    permission: string;

    static link(username: string, docId: number, permission: string) {
        const ud = new UserDoc();
        ud.username = username;
        ud.docId = docId;
        ud.permission = permission;
        
        return ud;
    }
}
