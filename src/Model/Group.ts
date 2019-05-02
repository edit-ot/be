import {
    Table, Model, Column, PrimaryKey, ForeignKey,
    DataType, BelongsToMany, IsUUID, BelongsTo
} from 'sequelize-typescript';

import * as uuid from "uuid/v4";

import { User } from "./User";
import { UserGroup } from './UserGroup';
import { DocGroup } from './DocGroup';
import { Doc } from './Doc';
import { toPermissionObj } from '../utils/RWDescriptor';

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


    @Column
    permission: string;

    
    // 所有者
    @ForeignKey(() => User)
    @Column
    owner: string;

    @BelongsTo(() => User, 'owner')
    ownerInfo: User

    @Column(DataType.TEXT('long'))
    calendar: string;

    @Column(DataType.TEXT('long'))
    card: string;
    

    static findAllWithOwner(owner: string) {
        return Group.findAll({
            where: { owner },
            include: [{
                model: User,
                as: 'ownerInfo'
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

    toStatic() {

        return {
            groupName: this.groupName, 
            groupIntro: this.groupIntro,
            groupAvatar: this.groupAvatar,
            groupId: this.groupId,
            users: this.users,
            docs: this.docs,
            ownerInfo: this.ownerInfo,
            owner: this.owner,
            pmap: toPermissionObj(this.permission)
        }
    }


    isOwner(username: string): boolean {
        return username === this.owner;
    }

    canRead(username: string) {
        const isOwner = this.isOwner(username);
        if (isOwner) return true;

        const p = toPermissionObj(this.permission);

        if (p['*'] && p['*'].r) return true;

        return p[username] && p[username].r;
    }

    canWrite(username: string) {
        const isOwner = this.isOwner(username);
        if (isOwner) return true;

        const p = toPermissionObj(this.permission);

        if (p['*'] && p['*'].w) return true;

        return p[username] && p[username].w;
    }
}
