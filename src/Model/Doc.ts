import * as md5 from "md5";
import { Table, Model, Column, ForeignKey, CreatedAt, UpdatedAt, BelongsToMany, DataType } from 'sequelize-typescript';
import { User } from './User';
import { Group } from './Group';
import { DocGroup } from './DocGroup';

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

    @ForeignKey(() => User)
    @Column
    owner: string;
    
    @CreatedAt
    @Column
    createAt: Date;

    @UpdatedAt
    @Column
    updateAt: Date;

    @BelongsToMany(() => Group, () => DocGroup)
    groups: Group[];

    toPermissionObj(): UserPermissionMap {
        if (!this.permission) return {};

        return this.permission.split(',').reduce((acc, userLine) => {
            const [username, rw] = userLine.split('|');

            acc[username] =  (rw || 'rw').split('').reduce((acc, cur) => {
                acc[cur] = true;
                return acc;
            }, {} as RWDescriptor);

            return acc; 
        }, {} as UserPermissionMap);
    }

    toRoomName() {
        return `doc-${ this.title }-${ this.id }`;
    }

    contentHash() {
        return md5(this.content || '');
    }

    // someOneCanWrite(username: string): Promise<boolean> {
    //     if (this.canWrite(username)) {
    //         return Promise.resolve(true);
    //     } else {


    //     }
    // }

    pmapToStr(p: UserPermissionMap) {
        return Object.keys(p).map(username => {
            const rwd = p[username];
            let permission = '';
            
            if (rwd.r) permission += 'r';
            if (rwd.w) permission += 'w';
            
            return `${ username }|${ permission }`
        }).join(',');
    }

    toStatic() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            permission: this.permission,
            isPublic: this.isPublic,
            owner: this.owner,
            createAt: this.createAt,
            updateAt: this.updateAt,
            pmap: this.toPermissionObj()
        }
    }


    isOwner(username: string): boolean {
        return username === this.owner;
    }

    canRead(username: string) {
        // 判断传入的用户名是否是 owner
        const isOwner = this.isOwner(username);
        if (isOwner) return true;

        // this.toPermissionObj 会返回 this 的权限定义
        // 其类型为 UserPermissionMap 
        const p = this.toPermissionObj();

        // 如果文档公共且 p 中存在 * 且其权限定义含 r 
        if (this.isPublic && p['*'] && p['*'].r) return true;

        // 否则直接返回权限定义
        return p[username] && p[username].r;
    }

    canWrite(username: string) {
        const isOwner = this.isOwner(username);
        if (isOwner) return true;

        const p = this.toPermissionObj();
        if (this.isPublic && p['*'] && p['*'].w) return true;

        return p[username] && p[username].w;
    }
}
