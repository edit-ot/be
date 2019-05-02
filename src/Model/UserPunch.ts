import { Table, Model, Column, ForeignKey, IsUUID, CreatedAt, UpdatedAt } from 'sequelize-typescript';
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

    @CreatedAt
    @Column
    createAt: Date;

    @UpdatedAt
    @Column
    updateAt: Date;
}
