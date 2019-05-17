import { Table, Model, Column, ForeignKey, PrimaryKey, CreatedAt } from 'sequelize-typescript';

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

    @Column
    type: string;

    @CreatedAt
    @Column
    cratedAt: Date;

    @Column
    fileName: string;

    @Column
    encoding: string;

    @Column
    size: number;
}
