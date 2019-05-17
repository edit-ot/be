import * as express from "express";
import { Msg } from "../../Model/Msg";
import { LoginMidWare } from "../user";
import { StdSession } from "utils/StdSession";

const router = express.Router();

export default router;

router.use('*', LoginMidWare);


router.get('/notification', async (req, res) => {
    const { user } = req.session as StdSession;

    const msgs = await Msg.findAll({
        where: {
            to: user.username, 
            type: 'notification'
        }
    });

    res.json({
        code: 200, 
        data: msgs
    });
});

router.post('/has-been-read', async (req, res) => {
    const { user } = req.session as StdSession;
    const { msgId } = req.body;

    const msg = await Msg.findOne({
        where: { msgId }
    });

    if (!msg) {
        return res.json({
            code: 404, msg: '找不到这条消息'
        });
    }

    if (msg.to !== user.username) {
        return res.json({
            code: 403, msg: '你不是这条消息的所有者'
        })
    }

    msg.isRead = true;

    await msg.save();

    return res.json({
        code: 200, 
        msg: '好了，已读了~',
        data: msg
    });
});
