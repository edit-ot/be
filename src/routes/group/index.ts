import * as express from "express";
import { Group } from "../../Model/Group";
import { LoginMidWare } from "../../routes/user";
import { StdSession } from "utils/StdSession";
import { CreateGroupUpdateTask } from "./group-util";
import { User, Doc } from "../../Model";
import { RWDescriptor, RWDescriptorBase } from "../../utils/RWDescriptor";
import { UserGroup } from "../../Model/UserGroup";
import { DocGroup } from "../../Model/DocGroup";
import { ioMsg } from "../../io/routes/msg";

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

router.get('/byId', async (req, res) => {
    const { user } = req.session as StdSession;
    const { groupId } = req.query;

    const groupInclude = [{
        model: Doc
    }, {
        model: User,
        as: 'users' 
    }, {
        model: User,
        as: 'ownerInfo'
    }]

    const group = await Group.findOne({
        where: {
            groupId
        },
        include: groupInclude
    });
    
    if (!group) {
        res.json({ code: 404 });
    } else {
        const pmap = await group.getPermissionMap();

        if (pmap[user.username] || group.owner === user.username) {
            res.json({ code: 200, data: Object.assign({}, group.toStatic(), { pmap }) });
        } else {
            res.json({ code: 403, msg: '暂无该小组的权限' });
        }
    }
})

router.get('/joined', (req, res) => {
    const { user } = req.session as StdSession;

    User.findOne({
        where: { username: user.username },
        include: [{
            model: Group,
            as: 'groups'
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

// 个人把文档分享给小组
router.post('/doc-link-group', async (req, res, next) => {
    const { user } = req.session as StdSession;
    const { permission, docId, groupId } = req.body;

    const setString = typeof permission === 'string' ?
        permission :
        new RWDescriptor(permission as RWDescriptorBase).toString();
    
    const doc = await Doc.findOne({ where: { id: docId } });

    if (!doc) {
        res.json({ code: 404 });
    } else if (!doc.isOwner(user.username)) {
        res.json({ code: 403 });
    }

    const dg = await DocGroup.findOne({
        where: { docId, groupId }
    });

    if (dg) {
        if (permission) {
            dg.permission = setString;
            await dg.save();
        } else {
            await dg.destroy();
        }
    } else {
        if (permission) {
            const newDg = DocGroup.link(docId, groupId, setString);
            await newDg.save();
        } else {
            // not thing 
        }
    }

    res.json({ code: 200 });
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

router.use('/set-permission', async (req, res) => {
    const { user } = req.session as StdSession;

    const groupId = req.body.groupId || req.query.groupId;
    const username = req.body.username || req.query.username;
    const set = req.body.set || req.query.set;

    const setString = typeof set === 'string' ?
        set : new RWDescriptor(set as RWDescriptorBase).toString();

    console.log('Set Permission', {
        groupId, username, setString, set
    });

    const [group, ug] = await Promise.all([
        Group.findOne({
            where: { groupId }
        }),
        UserGroup.findOne({
            where: { username, groupId }
        })
    ]);

    if (!group) {
        res.json({ code: 404, msg: 'group not found' });
        return;
    }

    if (group.owner !== user.username) {
        res.json({ code: 403, msg: '仅有所有者才可以修改权限' });
        return;
    }
    
    if (ug) {
        if (!set) {
            await ug.destroy();
            res.json({ code: 200, msg: '移除权限' });
            ioMsg.sendNotification(ug.username, {
                text: `你已被移出小组 ${ group.groupName }`, 
                url: `/home/group/${ group.groupId }`
            });
        } else {
            ug.permission = setString;
            await ug.save();
            res.json({ code: 200, msg: '已设置权限为' + setString });

            ioMsg.sendNotification(ug.username, {
                text: `你在小组 ${ group.groupName } 中的权限被设置为 ` + setString, 
                url: `/home/group/${ group.groupId }`
            });
        }
    } else {
        if (set) {
            const newUg = UserGroup.link(username, groupId, setString);
            await newUg.save();
            res.json({ code: 200, msg: '已分配权限' });

            ioMsg.sendNotification(newUg.username, {
                text: `你已被拉进小组 ${ group.groupName }, 权限为 ` + setString, 
                url: `/home/group/${ group.groupId }`
            });
        } else {
            res.json({ code: 200, msg: '这种情况没有意义' });
        }
    }
})


router.post('/name', CreateGroupUpdateTask((group, req, res) => {
    group.groupName = req.body.groupName || '未设置小组名';
}));

router.post('/update-all', CreateGroupUpdateTask((group, req, res) => {
    if (req.body.groupName) {
        group.groupName = req.body.groupName;
    }
    if (req.body.groupIntro) {
        group.groupIntro = req.body.groupIntro;
    }
    
    if (req.body.groupAvatar) {
        group.groupAvatar = req.body.groupAvatar;

        if (req.body.groupAvatar === 'remove') {
            group.groupAvatar = '';
        }
    }
}));

router.post('/delete', async (req, res, next) => {
    const session = req.session as StdSession;
    const { user } = session;

    const group = await Group.findOne({
        where: { groupId: req.body.groupId }
    });

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
});
