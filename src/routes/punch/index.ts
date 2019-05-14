import * as express from "express";
import { StdSession } from "utils/StdSession";
import { UserPunch } from "../../Model/UserPunch";
import { User } from "../../Model";
import { Group } from "../../Model/Group";

const router = express.Router();

export default router;

router.get('/', (req, res) => {
    // const { user } = req.session as StdSession;
    const { username } = req.query;
    const { groupId } = req.query;

    UserPunch.findAll({
        where: { username, groupId },
        order: [
            ['date', 'DESC']
        ]
    }).then(punches => {
        res.json({
            code: 200,
            data: punches,
            msg: '查询个人签到记录'
        });
    });
});

router.get('/all', async (req, res) => {
    // const { user } = req.session as StdSession;
    const { groupId } = req.query;

    const g = await Group.findOne({
        where: { groupId },
        include: [
            { model: User, as: 'users' },
            { model: User, as: 'ownerInfo' }
        ]
    });

    if (!g) {
        res.json({
            code: 404, msg: '找不到这个 group'
        });
        return;
    }
   
    
    const ups = await Promise.all(
        g.users.concat(g.ownerInfo).map(user => {
            return UserPunch.findOne({
                where: { groupId, username: user.username },
                order: [['date', 'DESC']]
            }).then(up => {
                return {
                    user, up
                }
            })
        })
    );
    
    const dataMap = {} as { [key: string]: {
        username: string, 
        avatar: string,
        n: number
    } };

    ups.forEach(({ user, up }) => {
        if (!dataMap[user.username]) {
            dataMap[user.username] = {
                username: user.username,
                avatar: user.avatar,
                n: 0
            }
        }

        if (up) {
            dataMap[user.username].n = up.nDayBefore;
        }
    });

    res.json({
        code: 200, 
        data: Object.keys(dataMap).map(k => dataMap[k])
    });

    // UserPunch.findAll({
    //     where: { groupId },
    //     include: [{ model: User }]
    // }).then(ups => {
    //     const userMap = {};
    //     const dataMap = {};

    //     ups.forEach(up => {
    //         userMap[up.username] = up.owner;
    //         if (dataMap[up.username]) {
    //             dataMap[up.username] ++;
    //         } else {
    //             dataMap[up.username] = 1;
    //         }
    //     });

    //     res.json({
    //         code: 200, 
    //         data: {
    //             userMap, 
    //             dataMap
    //         }
    //     })
    // })
})

router.post('/', async (req, res) => {
    const { user } = req.session as StdSession;
    const { groupId } = req.body;

    const todayDate = UserPunch.today();
    const lastDate = new Date((+todayDate) - 86400000);

    const [today, lastDay] = await Promise.all([
        UserPunch.findOne({
            where: { username: user.username, groupId, date: todayDate }
        }),
        UserPunch.findOne({
            where: { username: user.username, groupId, date: lastDate }
        })
    ]);

    if (today) {
        // 今日已签到
        res.json({
            code: 403, msg: '今日已签到'
        });
    } else {
        // 今日已签到
        const up = new UserPunch();
        up.date = todayDate;
        up.username = user.username;
        up.groupId = groupId;

        // 看昨天有没有，有的话昨天的基础上 +1 
        // 否则设为 1
        up.nDayBefore = lastDay ? 
            (lastDay.nDayBefore + 1) : 1;

        await up.save();

        res.json({
            code: 200, msg: '已签到'
        });
    }
});


