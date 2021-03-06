import * as express from "express";
import * as multer from "multer";
import { User } from "../../Model";
import { StdSession } from "utils/StdSession";
import { Sequelize } from "sequelize-typescript";
import { FILES_BASE } from "../../config";
import { File } from "../../Model/File";
import { Group } from "../../Model/Group";
import { UserUser } from "../../Model/UserUser";

// import * as md5 from "md5";

const SECURITY_EXCLUDE = ['openid', 'id', 'pwd'];

const router = express.Router();

router.get('/avatar/:username', (req, res) => {
    const { username } = req.params;

    User.findOne({
        attributes: { include: ['avatar']},
        where: { username: username }
    }).then(user => {
        if (!user) {
            res.status(404);
            res.json({ code: 404, msg: 'user not found' });
        } else {
            res.redirect(user.avatar);
        }
    })
});

router.get('/info/:username', (req, res) => {
    const { username } = req.params;

    User.findOne({
        attributes: { exclude: SECURITY_EXCLUDE },
        include: [{ model: Group, as: 'groups' }],
        where: { username: username }
    }).then(user => {
        if (!user) {
            res.status(404);
            res.json({ code: 404, msg: 'user not found' });
        } else {
            res.json({ code: 200, data: user });
        }
    })
});

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

router.get('/logout', (req, res) => {
    const session = req.session as StdSession;
    delete session.user;
    res.json({ code: 200 });
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
});

router.post('/update', (req, res, next) => {
    const { user } = req.session as StdSession;

    User.findOne({ where: { username: user.username } }).then($user => {
        if ($user) {
            const keys = Object.keys(req.body);
            keys.forEach(key => {
                $user[key] = req.body[key];               
            });
            $user.save().then(() => {
                delete $user.pwd;
                req.session && (
                    req.session.user = $user.toStatic()
                );
                res.json({ code: 200 });
            })
        } else {
            res.json({ code: 404 });
        }
    });
});

const upload = multer({
    dest: FILES_BASE
});

router.post('/avatar', upload.single('file'), (req, res, next) => {
    const { user } = req.session as StdSession;
    const url = `/user-files/${ req.file.filename }`;

    // Set Session
    req.session && (
        req.session.user = {
            ...req.session.user, 
            avatar: url
        }
    );

    User.findOne({ where: { username: user.username } }).then(user => {
        if (!user) return;
        user.avatar = url;

        user.save().then(() => {
            res.json({ code: 200 });
        });

        const file = new File();
        file.fileId = req.file.filename;
        file.URL = url;
        file.owner = user.username;
        file.type = req.file.mimetype;
        file.encoding = req.file.encoding;
        file.size = req.file.size;
        file.fileName = req.body.fileName;
        file.save();
    });
});

router.post('/upload-file', upload.single('file'), (req, res, next) => {
    const { user } = req.session as StdSession;
    
    const url = `/user-files/${ req.file.filename }`;
    const f = new File();

    f.owner = user.username;
    f.URL = url;
    f.fileId = req.file.filename;
    f.type = req.file.mimetype;

    f.encoding = req.file.encoding;
    f.size = req.file.size;

    f.fileName = req.body.fileName;

    f.save().then(() => {
        res.json({
            code: 200, data: f
        });
    }).catch(next);
});

router.post('/delete-file', async (req, res) => {
    const { user } = req.session as StdSession;

    const f = await File.findOne({
        where: {
            owner: user.username, fileId: req.body.fileId
        }
    });

    if (f) {
        await f.destroy();
        res.json({
            code: 200, msg: '文件删除成功',
            data: f
        });
    } else {
        res.json({
            code: 404, msg: '找不到这个文件'
        });
    }
});

router.get('/followers', (req, res, next) => {
    UserUser.getUserFollowers(req.query.username).then(users => {
        res.json({
            code: 200, data: users
        });
    }).catch(next);
});

router.get('/followings', (req, res, next) => {
    UserUser.getUserFollowings(req.query.username).then(users => {
        res.json({
            code: 200, data: users
        });
    }).catch(next);
});

// router.get('/my-follow-ers-ings', async (req, res, next) => {
//     const { user } = req.session as StdSession;

//     const [followers, followings] = await Promise.all([
//         UserUser.getUserFollowers(user.username),
//         UserUser.getUserFollowings(user.username)
//     ]);

//     res.json({
//         code: 200,
//         data: { followers, followings }
//     });
// });

router.post('/follow-one', async (req, res, next) => {
    const { user } = req.session as StdSession;
    const { username } = req.body;

    const uu = UserUser.followOne(user.username, username);

    try {
        await uu.save();
        res.json({
            code: 200, msg: 'followed'
        })
    } catch (err) {
        const uu2 = await UserUser.findOne({
            where: { from: user.username, to: username }
        });

        if (uu2) {
            await uu2.destroy();
            // 说明是重复导致的 ERR
            res.json({
                code: 200, msg: 'removed'
            });
        } else {
            console.log('/user/follow-one ERROR', err);
            next(err);
        }
    }
});

export default router;
