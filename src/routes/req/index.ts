import * as express from "express";

import { Msg } from "../../Model/Msg";

import { LoginMidWare } from "../user";
import { StdSession } from "utils/StdSession";
import { Group } from "../../Model/Group";
import { Doc } from "../../Model";

const router = express.Router();

export default router;

router.use('*', LoginMidWare);

router.get('/byId', async (req, res) => {
    const { msgId } = req.query;

    const msgReq = await Msg.findReq(msgId);

    if (!msgReq) {
        return res.json({ code: 404 });
    } else {
        return res.json({
            code: 200, 
            data: msgReq
        });
    }
});

router.post('/group-permission-req', async (req, res) => {
    const { user } = req.session as StdSession;
    const { groupId } = req.body;
    const group = await Group.findOne({ where: { groupId } });

    if (!group) {
        return res.json({ code: 404, msg: '该小组不存在' })
    }

    const reqId = `${user.username}-gp-${groupId}`;

    const $ = await Msg.findReq(reqId)

    if ($) {
        const [$msg, reqBody] = $;

        if (reqBody.state === 'pendding') {
            return res.json({
                code: 201, msg: '先前已提交过该小组的权限申请'
            });
        } else {
            const $oldMsg = Msg.fromStaticObj({
                ...$msg.toStatic(), 
                msgId: $msg + '-' + Date.now()
            });
            
            await $msg.destroy();
            await $oldMsg.save();
        }
    }
    
    const msg = Msg.createReq(
        reqId, group.owner,
        {
            state: 'pendding',
    
            resUrl: `/api/group/set-permission?groupId=${groupId}&username=${user.username}&set=r`,
            resMsg: Msg.createNotification(user.username, {
                text: `你先前想加入小组 ${ group.groupName } 的申请已经通过`,
                url: `/home/group/${ group.groupId }`
            }),
    
            rejUrl: ``,
            rejMsg: Msg.createNotification(user.username, {
                text: `小组 ${ group.groupName } 拒绝了你的权限申请`,
                url: `/home/group/${ group.groupId }`
            })
        }
    );

    msg.content = `${user.username } 申请加入小组 ${ group.groupName }`;

    await msg.save();

    return res.json({
        code: 200, data: msg
    });
    
});



router.post('/doc-permission-req', async (req, res) => {
    const { user } = req.session as StdSession;
    const { docId } = req.body;
    const wantRW = req.body.wantRW || 'r';

    const doc = await Doc.findOne({ where: { id: +docId || -1 } });

    if (!doc) {
        return res.json({ code: 404, msg: '该文档不存在' })
    }

    const reqId = `${user.username}-dp-${doc.id}`;

    const $ = await Msg.findReq(reqId)

    if ($) {
        const [$msg, reqBody] = $;

        if (reqBody.state === 'pendding') {
            return res.json({
                code: 201, msg: '先前已提交过该文档的权限申请'
            });
        } else {
            const $oldMsg = Msg.fromStaticObj({
                ...$msg.toStatic(), 
                msgId: $msg + '-' + Date.now()
            });
            
            await $msg.destroy();
            await $oldMsg.save();
        }
    }
    
    const msg = Msg.createReq(
        reqId, doc.owner,
        {
            state: 'pendding',
    
            resUrl: `/api/doc/permission/set?docId=${doc.id}&username=${user.username}&set=${ wantRW }`,
            resMsg: Msg.createNotification(user.username, {
                text: `你先前想获得的文档权限申请已经通过`,
                url: `/edit/${ doc.id }`
            }),
    
            rejUrl: ``,
            rejMsg: Msg.createNotification(user.username, {
                text: `文档所有者 ${ doc.owner } 拒绝了你的文档权限申请`,
                url: `/edit/${ doc.id }`
            })
        }
    );

    msg.content = `${user.username } 申请文档 ${ doc.title } 的权限, Ta 想要的权限为: ${ wantRW }`;

    await msg.save();

    return res.json({
        code: 200, data: msg
    });
});



router.post('/resolve', async (req, res) => {
    const { reqId } = req.body;
    
    const $ = await Msg.findReq(reqId);

    if (!$) {
        res.json({ code: 404 })
    } else {
        const [msg, reqBody] = $;

        const backMsg = Msg.fromStaticObj(reqBody.resMsg);
        reqBody.state = 'resolved';
        msg.jsonData = JSON.stringify(reqBody);
        msg.isRead = true;
        
        await backMsg.save();
        await msg.save();

        if (reqBody.resUrl) {
            res.redirect(reqBody.resUrl);
        } else {
            res.json({ code: 200 });
        }        
    }
});

router.post('/reject', async (req, res) => {
    const { reqId } = req.body;
    
    const $ = await Msg.findReq(reqId);

    if (!$) {
        res.json({ code: 404 })
    } else {
        const [msg, reqBody] = $;

        const backMsg = Msg.fromStaticObj(reqBody.rejMsg);
        reqBody.state = 'rejected';
        msg.jsonData = JSON.stringify(reqBody);
        msg.isRead = true;
        
        await backMsg.save();
        await msg.save();

        if (reqBody.rejUrl) {
            res.redirect(reqBody.rejUrl);
        } else {
            res.json({ code: 200 });
        }
    }
});
