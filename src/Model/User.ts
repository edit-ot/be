import { Table, Model, Column } from 'sequelize-typescript';

@Table
export class User extends Model<User> {
    @Column
    nickname: string;

    @Column
    username: string;

    @Column
    pwd: string;

    @Column
    avatar: string;

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

