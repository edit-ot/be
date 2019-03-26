import { Table, Model, Column, ForeignKey } from 'sequelize-typescript';
import { User } from './User';


@Table
export class Doc extends Model<Doc> {
    @Column
    title: string;

    @Column
    content: string;

    @Column
    permission: string;

    @ForeignKey(() => User)
    @Column
    owner: string;
}

// export class DocStatic {
//     nickname: string;
//     username: string;
//     avatar: string;
// }

