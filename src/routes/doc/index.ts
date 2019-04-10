import * as express from "express";
import { LoginMidWare } from "../user";
import { User, Doc } from "../../Model";
import { StdSession } from "utils/StdSession";

import PermissionRouter from "./permission";
// import { User } from "../../Model";

// import * as md5 from "md5";

const router = express.Router(); 


router.use('*', LoginMidWare);

router.get('/', (req, res) => {
    const session = req.session as StdSession;
    const { user } = session;

    User.findOne({
        where: { username: user.username },
        include: [{
            model: Doc
        }]
    }).then(user => {
        res.json({
            code: 200, 
            msg: 'ok', 
            data: (user && user.docs.map(d => d.toStatic())) || []
        });
    })
});



router.get('/byId', (req, res) => {
    const session = req.session as StdSession;
    const { user } = session;
    const { username } = user;
    const { docId } = req.query;

    if (docId) {
        Doc.findOne({
            where: { id: docId }
        }).then(doc => {
            if (doc) {
                const p = doc.toPermissionObj();
                if ( // 权限
                    doc.permission === '*' ||
                    doc.owner === username ||
                    p[username].r
                ) {
                    res.json({
                        code: 200,
                        msg: 'ok',
                        data: doc.toStatic()
                    });
                } else {
                    res.json({ code: 403, msg: 'no permission' });
                }
            } else {
                res.json({ code: 404, query: req.query });
            }
        })
    } else {
        res.json({
            code: 404
        });
    }
});

router.post('/create', (req, res, next) => {
    const session = req.session as StdSession;
    const { user } = session;

    const theNewDoc = new Doc({
        title: '未命名文档',
        content: '',
        owner: user.username,
        permission: '',
        isPublic: false
    });

    theNewDoc.save().then(doc => {
        res.json({
            code: 200,
            msg: '创建成功',
            data: doc
        })
    }).catch(next);
});

function CreateUpdateTask(
    todo: (doc: Doc, ...args: Parameters<express.RequestHandler>) => void
): express.RequestHandler {
    return (req, res, next) => {
        const session = req.session as StdSession;
        const { user } = session;

        Doc.findOne({
            where: {
                id: req.body.id
            }
        }).then(doc => {
            if (doc && doc.owner === user.username) {
                todo(doc, req, res, next);
                doc.save().then(() => {
                    res.json({ code: 200, data: doc, msg: 'updated' });
                }).catch(next);
            } else {
                res.json({
                    code: 404
                });
            }
        }).catch(next);
    }
}


router.post('/update', CreateUpdateTask((doc, req) => {
    doc.title = req.body.title || '未命名标题';
}))


router.post('/save', CreateUpdateTask((doc, req) => {
    if (req.body.title) {
        doc.title = req.body.title
    }

    if (doc.content) {
        doc.content = req.body.content;
    }
}))


router.post('/delete', (req, res, next) => {
    const session = req.session as StdSession;
    const { user } = session;

    Doc.findOne({
        where: {
            owner: user.username,
            id: req.body.docId
        }
    }).then(doc => {
        if (!doc) {
            res.json({
                code: 200,
                data: null
            });

            return;
        } else {
            return doc.destroy().then(() => {
                res.json({
                    code: 200,
                    data: doc
                })
            });
        }
    }).catch(next);
});

router.use('/permission', PermissionRouter);

export default router;



