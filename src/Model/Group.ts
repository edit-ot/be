import {
    Table, Model, Column, PrimaryKey, ForeignKey,
    DataType, BelongsToMany, IsUUID
} from 'sequelize-typescript';

import * as uuid from "uuid/v4";

import { User } from "./User";
import { UserGroup } from './UserGroup';
import { DocGroup } from './DocGroup';
import { Doc } from './Doc';

@Table
export class Group extends Model<Group> {
    // 名称
    @Column({
        type: DataType.STRING,
        comment: '小组名'
    })
    groupName: string;

    @Column
    groupAvatar: string;

    @Column
    groupIntro: string;

    // 主键
    @IsUUID(4)
    @PrimaryKey
    @Column
    groupId: string;

    @BelongsToMany(() => User, () => UserGroup)
    users: User[];

    @BelongsToMany(() => Doc, () => DocGroup)
    docs: User[];

    // 所有者
    @ForeignKey(() => User)
    @Column
    owner: string;
    static findAllWithOwner(owner: string) {
        return Group.findAll({
            where: { owner },
            include: [{
                model: User
            }]
        });
    }

    static createOne(groupName: string, username: string) {
        const group = new Group();
        group.groupId = uuid();
        group.groupName = groupName;
        group.owner = username;

        return group;
    }

    canWrite(username: string) {
        return this.owner === username;
    }
}
