import * as express from "express";
import * as md5 from "md5";
import { Table, Model, Column, ForeignKey, CreatedAt, UpdatedAt, BelongsToMany, DataType } from 'sequelize-typescript';
import { User } from './User';
import { Group } from './Group';
import { DocGroup } from './DocGroup';
import { UserDoc } from "./UserDoc";
import { RWDescriptor } from "../utils/RWDescriptor";
import { UserGroup } from "./UserGroup";
import { StdSession } from "utils/StdSession";

export type RWDescriptor = {
    r: boolean,
    w?: boolean
}

export type UserPermissionMap = {
    [key: string]: RWDescriptor
}

@Table
export class Doc extends Model<Doc> {
    @Column
    title: string;

    @Column(DataType.TEXT('long'))
    content: string;

    @Column
    permission: string;

    @Column
    isPublic: boolean;
   
    @CreatedAt
    @Column
    createAt: Date;

    @UpdatedAt
    @Column
    updateAt: Date;

    @ForeignKey(() => User)
    @Column
    owner: string;

    @BelongsToMany(() => Group, () => DocGroup)
    groups: Group[];

    @BelongsToMany(() => User, () => UserDoc)
    users: User[];

    toRoomName() {
        return `doc-${ this.title }-${ this.id }`;
    }
    
    contentHash() {
        return md5(this.content || '');
    }
    
    async getPermissionMap(): Promise< UserPermissionMap > {
        const uds = await UserDoc.findAll({
            where: { docId: this.id }
        });

        const p = uds.reduce((acc, cur) => {
            const rw = new RWDescriptor(cur.permission);
            acc[cur.username] = rw;
            return acc;
        }, {} as UserPermissionMap);

        if (this.isPublic) {
            p['*'] = new RWDescriptor(this.permission);
        }

        return p;
    }

    toStatic() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            
            owner: this.owner,

            permission: this.permission,
            isPublic: this.isPublic,

            createAt: this.createAt,
            updateAt: this.updateAt
        }
    }


    isOwner(username: string): boolean {
        return username === this.owner;
    }

    async ofPermission(username: string): Promise<RWDescriptor> {
        const docId = this.id;

        if (this.isOwner(username)) {
            return new RWDescriptor('rw');
        }

        if (this.isPublic) {
            return new RWDescriptor(this.permission);
        }

        const NO_PERMISSION = new RWDescriptor();
        
        const ud = await UserDoc.findOne({
            where: { docId, username }
        });
    
        if (ud) {
            return new RWDescriptor(ud.permission);
        }
    
        const dgs = await DocGroup.findAll({ where: { docId } });
        if (dgs.length === 0) {
            return NO_PERMISSION;   
        }
    
        for (let i = 0; i < dgs.length; i ++) {
            const dg = dgs[i];
            const ug = await UserGroup.findOne({
                where: { username, groupId: dg.groupId }
            });
    
            if (ug) {
                const rw = new RWDescriptor(ug.permission);
                if (rw.r || rw.w) {
                    return rw;
                }
            }
        }
        
        return NO_PERMISSION;
    } 


    static CreateBlankDoc(req: express.Request): Doc {
        const session = req.session as StdSession;
        const { user } = session;
    
        const theNewDoc = new Doc({
            title: '未命名文档',
            content: '',
            owner: user.username,
            permission: '',
            isPublic: false
        });
    
        return theNewDoc;
    }
}
