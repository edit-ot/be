import { Table, Model, Column, ForeignKey, IsUUID } from 'sequelize-typescript';

import { Group } from './Group';
import { User } from './User';


@Table
export class UserGroup extends Model<UserGroup> {
    // 名称
    @Column
    groupName: string;

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
    permission: string;

    // static ofGroup(groupId: string) {
    //     return UserGroup.findAll({
    //         where: { groupId },
    //         include: [{
    //             model: User
    //         }, {
    //             model: Group
    //         }]
    //     });
    // }

    // static ofUser(username: string) {
    //     return UserGroup.findAll({
    //         where: { username },
    //         include: [{
    //             model: User
    //         }, {
    //             model: Group
    //         }]
    //     });
    // }
}
