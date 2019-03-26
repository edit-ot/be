import { Table, Model, Column, PrimaryKey, HasMany } from 'sequelize-typescript';
import { Doc } from './Doc';

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

