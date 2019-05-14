import { Table, Model, Column, ForeignKey, IsUUID, BelongsTo } from 'sequelize-typescript';
import { User } from './User';
import { Group } from './Group';


@Table
export class UserPunch extends Model<UserPunch> {
    // doc id
    @ForeignKey(() => User)
    @Column
    username: string;

    // 组织所有
    @IsUUID(4)
    @ForeignKey(() => Group)
    @Column
    groupId: string;
    
    @Column
    date: Date;

    @Column
    nDayBefore: number;

    
    @BelongsTo(() => User)
    owner: User;

    static today() {
        const d = Date.now();
        const today = new Date(d - (d % 86400000));

        return today;
    }
}
