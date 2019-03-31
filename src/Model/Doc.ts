import { Table, Model, Column, ForeignKey, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { User } from './User';

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

    @Column
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
}
