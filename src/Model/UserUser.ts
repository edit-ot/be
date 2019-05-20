import { Table, Model, Column, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';

@Table
export class UserUser extends Model<UserUser> {
    @Column
    relation: number;
    // RELATION_FOLLOW === 1

    // doc id
    @ForeignKey(() => User)
    @Column({ primaryKey: true })
    from: string;

    @BelongsTo(() => User, 'from')
    fromUser: User;

    @ForeignKey(() => User)
    @Column({ primaryKey: true })
    to: string;

    @BelongsTo(() => User, 'to')
    toUser: User;

    static RELATION_FOLLOW = 1;

    static getUserFollowers(who: string, loginedUser?: string) {
        return UserUser.findAll({
            where: {
                to: who, relation: UserUser.RELATION_FOLLOW
            },
            include: [{
                model: User, as: 'fromUser'
            }]
        }).then(uus => {
            return uus.map(uu => uu.fromUser);
        });
    }
    
    static followOne(from: string, to: string) {
        const uu = new UserUser({
            from, to, relation: UserUser.RELATION_FOLLOW
        });

        return uu;
    }

    static getUserFollowings(who: string) {
        return UserUser.findAll({
            where: {
                from: who, relation: UserUser.RELATION_FOLLOW
            },
            include: [{
                model: User, as: 'toUser'
            }]
        }).then(uus => {
            return uus.map(uu => uu.toUser);
        });
    }
}
