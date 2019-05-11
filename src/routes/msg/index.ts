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
