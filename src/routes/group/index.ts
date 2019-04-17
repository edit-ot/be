import * as express from "express";
import { Group } from "../../Model/Group";
import { LoginMidWare } from "../../routes/user";
import { StdSession } from "utils/StdSession";
import { CreateGroupUpdateTask } from "./group-util";
import { User, Doc } from "../../Model";
import { DocGroup } from "../../Model/DocGroup";

const router = express.Router();

export default router;

router.use('*', LoginMidWare);

router.get('/', (req, res) => {
    const { user } = req.session as StdSession;

    Group.findAllWithOwner(user.username).then(groups => {
        res.json({
            code: 200,
            data: groups || []
        });
    });
});

router.get('/byId', (req, res) => {
    const { user } = req.session as StdSession;

    Group.findOne({
        where: { groupId: req.query.groupId, owner: user.username },
        include: [{
            model: Doc
        }, {
            model: User
        }]
    }).then(group => {
        res.json({ code: 200, data: group || null });
    })
})

router.get('/joined', (req, res) => {
    const { user } = req.session as StdSession;

    User.findOne({
        where: { username: user.username },
        include: [{
            model: Group
        }]
    }).then(user => {
        if (!user) {
            res.json({ code: 404 });
        } else {
            res.json({ code: 200, data: user.groups });
        }
    })
});

router.get('/docs', (req, res) => {
    const { user } = req.session as StdSession;

    User.findOne({
        where: { username: user.username },
        include: [{
            model: Doc
        }]
    }).then(user => {
        if (!user) {
            res.json({ code: 404 });
        } else {
            res.json({ code: 200, data: user.docs });
        }
    });
});

function GetDocAndGroup(docId: number | string, groupId: string) {
    return Promise.all([
        Doc.findOne({ where: { id: docId } }),
        Group.findOne({ where: { groupId } })
    ]);
}

router.post('/doc-link-group', (req, res, next) => {
    const { user } = req.session as StdSession;

    GetDocAndGroup(req.body.docId, req.body.groupId).then(results => {
        const [doc, group] = results;
        if (!(doc && group)) {
            res.json({ code: 404 });
        } else if (doc.owner !== user.username) {
            res.json({ code: 403 })
        } else {
            const dg = DocGroup.link(req.body.docId, req.body.groupId);

            dg.save().then(() => {
                res.json({ code: 200 });
            }).catch(() => {
                res.json({ code: 405, msg: `该文档已添加至 ${ group.groupName }, 无需重复` });
            });
        }
    }).catch(next);
});

router.post('/doc-unlink-group', (req, res, next) => {
    const { user } = req.session as StdSession;
    const { docId, groupId } = req.body;

    GetDocAndGroup(docId, groupId).then(results => {
        const [doc, group] = results;
        if (!(doc && group)) {
            res.json({ code: 404 });
        } else if (doc.owner === user.username || group.owner === user.username) {
            DocGroup.findOne({ where: { docId, groupId: groupId } }).then(dg => {
                if (!dg) res.json({ code: 404 });
                else dg.destroy().then(ok => {
                    res.json({ code: 200 });
                })
            })
        } else {
            res.json({ code: 403 });
        }
    });
});


router.post('/', (req, res) => {
    const { user } = req.session as StdSession;

    if (!req.body.groupName) {
        res.json({
            code: 403,
            msg: '请检查参数'
        });
        return;
    }

    const group = Group.createOne(req.body.groupName, user.username);

    group.save().then(() => {
        res.json({
            code: 200,
            msg: '小组创建成功'
        });
    });
});




router.post('/name', CreateGroupUpdateTask((group, req, res) => {
    group.groupName = req.body.groupName || '未设置小组名';
}));

router.post('/delete', (req, res, next) => {
    const session = req.session as StdSession;
    const { user } = session;

    Group.findOne({
        where: {
            groupId: req.body.groupId
        }
    }).then(group => {
        if (!group) {
            res.json({ code: 404 });
        } else {
            if (group.owner === user.username) {
                group.destroy().then(() => {
                    res.json({ code: 200, data: group });
                }).catch(next)
            } else {
                res.json({ code: 403, msg: '你不是该组所有者，所以不能删除' });
            }
        }
    }).catch(next);
})


