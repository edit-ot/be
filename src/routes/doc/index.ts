import * as express from "express";
import { LoginMidWare } from "../user";
import { User, Doc } from "../../Model";
import { StdSession } from "utils/StdSession";

import PermissionRouter from "./permission";
import { DocGroup } from "../../Model/DocGroup";

// import { User } from "../../Model";

// import * as md5 from "md5";

const router = express.Router(); 


router.use('*', LoginMidWare);

router.get('/', async (req, res) => {
    const session = req.session as StdSession;
   
    const user = await User.findOne({
        where: { username: session.user.username },
        include: [{
            model: Doc,
            as: req.query.relatedDocs ?
                'relatedDocs' : 'docs'
        }]
    });

    if (!user) return;

    const docs = req.query.relatedDocs ? user.relatedDocs : user.docs;

    res.json({
        code: 200, 
        msg: 'ok', 
        data: docs.map(d => d.toStatic())
    });
});

router.get('/byId', async (req, res) => {
    const session = req.session as StdSession;
    const { user } = session;
    const { username } = user;
    const { docId, withPmap } = req.query;

    if (!docId) {
        return res.json({
            code: 404
        });
    }

    try {
        const doc = await Doc.findOne({
            where: { id: docId }
        });
    
        if (!doc) {
            return res.json({ code: 404, query: req.query });
        }
        
        const rw = await doc.ofPermission(username);
        console.log('/api/doc/byId', username, rw);
        
        if (rw.r) {
            const pmap = withPmap ? (
                await doc.getPermissionMap()
            ) : undefined;

            return res.json({
                code: 200, 
                data: Object.assign({}, doc.toStatic(), { pmap })
            });
        } else {
            return res.json({
                code: 403
            });
        }
    } catch (err) {
        console.error(err);
        return res.json({
            code: 500,
            err
        });
    }
});

router.post('/create', async (req, res, next) => {
    const doc = Doc.CreateBlankDoc(req);

    try {
        await doc.save();
        res.json({
            code: 200,
            msg: '创建成功'
        });
    } catch (err) {
        next(err);
    }
});

router.post('/create-for-gorup', async (req, res, next) => {
    const doc = Doc.CreateBlankDoc(req);

    try {
        await doc.save();

        const dg = DocGroup.link(doc.id, req.body.groupId, 'rw');
        
        await dg.save();
        
        res.json({ code: 200 });
    } catch (err) {
        next(err);
    }
});


function CreateUpdateTask(
    todo: (doc: Doc, ...args: Parameters<express.RequestHandler>) => void
): express.RequestHandler {
    return async (req, res, next) => {
        const session = req.session as StdSession;
        const { user } = session;

        try {
            const doc = await Doc.findOne({ where: { id: req.body.id }});

            if (!doc) {
                return res.json({
                    code: 404
                });
            }

            const rw = await doc.ofPermission(user.username);

            if (rw && rw.w) {
                todo(doc, req, res, next);

                await doc.save();

                return res.json({ code: 200, data: doc, msg: 'updated' });   
            } else {
                return res.json({
                    code: 403
                });
            }
        } catch (err) {
            return next(err);
        }
    }
}


router.post('/update', CreateUpdateTask((doc, req) => {
    doc.title = req.body.title || '未命名标题';
}))


router.post('/save', CreateUpdateTask((doc, req) => {
    if (req.body.title) {
        doc.title = req.body.title
    }

    if (req.body.content) {
        doc.content = req.body.content;
    }
}))


router.post('/delete', async (req, res, next) => {
    const session = req.session as StdSession;
    const { user } = session;
    
    try {
        const doc = await Doc.findOne({
            where: {
                owner: user.username,
                id: req.body.docId
            }
        })
        
        if (!doc) {
            return res.json({
                code: 404,
                data: null
            });
        } else {
            await doc.destroy()
    
            return res.json({
                code: 200,
                data: doc.toStatic()
            });
        }
    } catch (err) {
        console.error('/doc/delete err', err);
        return next(err);
    }
});

router.use('/permission', PermissionRouter);

export default router;



