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

    @HasMany(() => Doc)
    docs: Doc[];

    @BelongsToMany(() => Group, () => UserGroup)
    groups: Group[];

    toStatic(): UserStatic {
        const { nickname, username, avatar } = this;
        return {
            nickname, username, avatar
        }
    }
}

export class UserStatic {
    nickname: string;
    username: string;
    avatar: string;
}

