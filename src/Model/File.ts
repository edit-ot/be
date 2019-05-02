import { Table, Model, Column, ForeignKey, PrimaryKey } from 'sequelize-typescript';

import { User } from './User';

@Table
export class File extends Model<File> {
    @PrimaryKey
    @Column
    fileId: string;
    
    @Column
    URL: string;

    @ForeignKey(() => User)
    @Column
    owner: string;
}
