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
