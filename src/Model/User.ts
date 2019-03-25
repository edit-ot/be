import { Table, Model, Column } from 'sequelize-typescript';

@Table
export class User extends Model<User> {
    @Column
    nickname: string;

    @Column
    username: string;

    @Column
    pwd: string;
}

