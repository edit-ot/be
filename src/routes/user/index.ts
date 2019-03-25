import * as express from "express";
import { User } from "../../Model";
// import * as md5 from "md5";

const router = express.Router();

router.post('/login', (req, res) => {
    const { username, pwd } = req.body;

    if (!username || !pwd) {
        res.json({
            code: 403,
            msg: '参数错误'
        });
    } else {
        User.findOne({
            attributes: { exclude: ['openid'] },
            where: { username }
        }).then(user => {
            if (user && user.pwd === pwd) {
                delete user.pwd;
                res.json({
                    code: 200,
                    data: user
                });
            } else {
                res.json({
                    code: 200, 
                    data: null,
                    msg: '账号密码错误'
                });
            }
        });
    }
});

router.post('/register', (req, res) => {
    const { username, pwd, pwd2 } = req.body;

    if (( // 没输入账号密码
        !username || !pwd
    ) || ( // 或者两次输入不一致
        pwd !== pwd2
    )) {
        res.json({
            code: 403,
            msg: '注册错误, 请检查输入'
        });
    } else {
        const u = new User({
            username, 
            pwd
        });

        u.save().then(() => {
            res.json({
                code: 200, 
                data: { username }
            });
        });
    }
});

export default router;
