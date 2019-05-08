import { Table, Model, Column, ForeignKey } from 'sequelize-typescript';

import { Group } from './Group';
import { Doc } from './Doc';

@Table
export class DocGroup extends Model<DocGroup> {
    // doc id
    @ForeignKey(() => Doc)
    @Column
    docId: number;
    
    // 组织所有
    @ForeignKey(() => Group)
    @Column
    groupId: string;

    @Column
    permission: string;

    static link(docId: number, groupId: string, permission: string) {
        const dg = new DocGroup();
        dg.docId = docId;
        dg.groupId = groupId;
        dg.permission = permission;

        return dg;
    }
}
