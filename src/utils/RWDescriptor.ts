export interface RWDescriptorBase {
    r: boolean,
    w?: boolean
}

export type UserPermissionMap = {
    [key: string]: RWDescriptor
}

export class RWDescriptor implements RWDescriptorBase {
    r: boolean;
    w?: boolean;

    constructor(permissionStr: string) {
        const rw = RWDescriptor.parse(permissionStr);

        this.r = rw.r;
        this.w = rw.w;
    }

    toString() {
        let permission = '';
        
        if (this.r) permission += 'r';
        if (this.w) permission += 'w';

        return permission;
    }

    static parse(permissionStr: string): RWDescriptor {
        return (permissionStr || 'r').split('').reduce((acc, cur) => {
            acc[cur] = true;
            return acc;
        }, {} as RWDescriptor);
    }
}


export function toPermissionObj(permission: string): UserPermissionMap {
    if (!permission) return {};

    return permission.split(',').reduce((acc, userLine) => {
        const [username, rw] = userLine.split('|');

        acc[username] =  (rw || 'rw').split('').reduce((acc, cur) => {
            acc[cur] = true;
            return acc;
        }, {} as RWDescriptor);

        return acc; 
    }, {} as UserPermissionMap);
}

export function pmapToStr(p: UserPermissionMap) {
    return Object.keys(p).map(username => {
        const rwd = p[username];
        let permission = '';
        
        if (rwd.r) permission += 'r';
        if (rwd.w) permission += 'w';
        
        return `${ username }|${ permission }`
    }).join(',');
}
