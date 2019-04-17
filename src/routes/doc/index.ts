import * as express from "express";
import { LoginMidWare } from "../user";
import { User, Doc } from "../../Model";
import { StdSession } from "utils/StdSession";

import PermissionRouter from "./permission";
import { DocGroup } from "../../Model/DocGroup";
import { Group } from "../../Model/Group";
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
            where: { id: docId },
            include: [{ model: Group, include: [{ model: Doc }] }]
        }).then(doc => {
            if (doc) {
                const fromGroup = doc.groups.some(g => {
                    return g.canRead(user.username)
                });

                if ( // 权限
                    doc.canRead(username) || fromGroup
                ) {
                    res.json({
                        code: 200,
                        msg: 'ok' + (fromGroup ? ' from group permission' : ''),
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

const CreateDoc = (req: express.Request): Doc => {
    const session = req.session as StdSession;
    const { user } = session;

    const theNewDoc = new Doc({
        title: '未命名文档',
        content: '',
        owner: user.username,
        permission: '',
        isPublic: false
    });

    return theNewDoc;
}

router.post('/create', (req, res, next) => {
    const doc = CreateDoc(req);

    doc.save().then(() => {
        res.json({
            code: 200,
            msg: '创建成功'
        });
    }).catch(next);
});

router.post('/create-for-gorup', (req, res, next) => {
    const doc = CreateDoc(req);

    doc.save().then(() => {
        const dg = DocGroup.link(doc.id, req.body.groupId);
        dg.save().then(() => {
            res.json({ code: 200 });
        }).catch(next);
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
            if (!doc) {
                res.json({
                    code: 404
                });
            } else if (
                doc.canWrite(user.username)
            ) {
                todo(doc, req, res, next);

                doc.save().then(() => {
                    res.json({ code: 200, data: doc, msg: 'updated' });
                }).catch(next);
            } else {
                res.json({
                    code: 403
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



