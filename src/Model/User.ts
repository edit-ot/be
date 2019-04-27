import { Table, Model, Column, PrimaryKey, HasMany, BelongsToMany } from 'sequelize-typescript';
import { Doc } from './Doc';
import { Group } from './Group';
import { UserGroup } from './UserGroup';

@Table
export class User extends Model<User> {
    @Column
    nickname: string;

    @PrimaryKey
    @Column
    username: string;

    @Column
    pwd: string;

    @Column
    avatar: string;

    @Column
    intro: string;

    @HasMany(() => Doc)
    docs: Doc[];

    @BelongsToMany(() => Group, () => UserGroup)
    groups: Group[];

    @HasMany(() => Group, 'owner')
    ownGroups: Group[];

    toStatic(): UserStatic {
        const { nickname, username, avatar, intro } = this;
        return {
            nickname, username, avatar, intro
        }
    }
}

export class UserStatic {
    nickname: string;
    username: string;
    avatar: string;
    intro: string;
}

