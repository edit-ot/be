import * as express from "express";
import { User } from "../../Model";
import { StdSession } from "utils/StdSession";
import { Sequelize } from "sequelize-typescript";

// import * as md5 from "md5";

const SECURITY_EXCLUDE = ['openid', 'id', 'pwd'];

const router = express.Router();

router.get('/me', (req, res) => {
    if (req.session && req.session.user) {
        const session = req.session as StdSession;
        res.json({
            code: 200, 
            data: session.user,
            msg: '~'
        });
    } else {
        res.json({
            code: 200,
            data: null,
            msg: '请登录'
        });
    }
});

router.post('/login', (req, res) => {
    const { username, pwd } = req.body;

    if (!username || !pwd) {
        res.json({
            code: 403,
            msg: '参数错误'
        });
    } else {
        User.findOne({
            attributes: { exclude: ['openid', 'id'] },
            where: { username }
        }).then(user => {
            if (user && user.pwd === pwd) {
                delete user.pwd;

                // Set Session
                req.session && (
                    req.session.user = user.toStatic()
                );

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
            pwd,
            avatar: '/default.png'
        });

        u.save().then(() => {
            res.json({
                code: 200, 
                data: { username }
            });
        });
    }
});

export const LoginMidWare = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req && req.session && req.session.user) {
        next();
    } else {
        res.json({
            code: 403,
            msg: '请登录'
        });
    }
}

router.use('*', LoginMidWare);

router.get('/search', (req, res, next) => {
    if (req.query.keyword) {
        User.findAll({
            attributes: { exclude: SECURITY_EXCLUDE },
            
            where: {
                username: {
                    [Sequelize.Op.like]: '%' + req.query.keyword + '%'
                }
            },
            
        }).then(users => {
            res.json({
                code: 200,
                data: users
            });
        }).catch(next);
    } else {
        res.json({
            code: 403
        });
    }
})

export default router;
