import * as express from "express";
import { User, Doc } from "../../Model";
import { Group } from "../../Model/Group";
import { Sequelize } from "sequelize-typescript";

const router = express.Router();

export default router;

router.get('/search', async (req, res) => {
    const { q } = req.query;
    const pqp = `%${q}%`;

    const findUsers = User.findAll({
        where: {
            [Sequelize.Op.or]: [
                { username: { $like: pqp }, },
                { intro: { $like: pqp } }
            ]
        }
    });
    const findGroups = Group.findAll({
        where: {
            [Sequelize.Op.or]: [
                { groupName: { $like: pqp } },
                { groupIntro: { $like: pqp } }
            ]
        }
    });
    const findDocs = Doc.findAll({
        where: {
            isPublic: true,
            [Sequelize.Op.or]: {
                title: { $like: pqp }
            }
        }
    });

    const [users, groups, docs] = await Promise.all([
        findUsers, findGroups, findDocs
    ]);

    res.json({
        code: 200,
        data: {
            users, groups, docs
        }
    })
});

