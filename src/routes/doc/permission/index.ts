import * as express from "express";
// import { User, Doc } from "../../../Model";
import { StdSession } from "utils/StdSession";
import { Doc } from "../../../Model";
import { UserDoc } from "../../../Model/UserDoc";
import { RWDescriptorBase, RWDescriptor } from "../../../utils/RWDescriptor";
import { ioMsg } from "../../../io/routes/msg";

const router = express.Router(); 

router.post('/cancel-share', async (req, res) => {
    const { user } = req.session as StdSession;

    const ud = await UserDoc.findOne({
        where: { username: user.username, docId: req.body.docId || '___' }
    });

    if (!ud) {
        res.json({
            code: 404,
            msg: `user: ${ user.username }; docId: ${ req.body.docId }`
        });
    } else {
        await ud.destroy();

        res.json({
            code: 200,
            data: ud
        });
    }
});


// param 
router.use('*', (req, res, next) => {
    const docId = req.body.docId || req.query.docId;

    if (!docId) {
        res.json({
            code: 403,
            msg: '参数不足'
        });
        return;
    } else {
        next();
    }
});

// owner
router.use('*', (req, res, next) => {
    const { user } = req.session as StdSession;
    const docId = req.body.docId || req.query.docId;

    Doc.findOne({
        where: { id: docId }
    }).then(doc => {
        if (doc) {
            if (doc.owner !== user.username) {
                res.json({
                    code: 403,
                    msg: '只有文档所有人才能修改权限'
                });
            } else {
                // Go Next
                req.body.doc = doc;
                next();
            }
        } else {
            res.json({
                code: 404,
                query: req.query
            });
        }
    }).catch(next);
});


router.post('/toggle', (req, res, next) => {
    const doc = req.body.doc as Doc;

    doc.isPublic = !doc.isPublic;

    if (doc.isPublic) {
        doc.permission = 'r';
    } else {
        doc.permission = '';
    }

    doc.save().then(() => {
        res.json({
            code: 200, 
            data: doc.toStatic()
        });
    }).catch(next);
});

router.get('/', async (req, res, next) => {
    const doc = req.body.doc as Doc;

    const p = await doc.getPermissionMap();
    
    res.json({
        code: 200, 
        data: p
    });
});

const DocSetPerm: express.RequestHandler = async (req, res, next) => {
    const username = req.body.username || req.query.username;
    const doc = (req.body.doc as Doc) || (
        await Doc.findOne({ where: { id: +req.query.docId} })
    );

    const set = (req.body.set || req.query.set || '') as string | RWDescriptorBase;

    if (!doc) {
        res.json({
            code: 404, msg: '找不到 doc'
        })
        return;
    }

    const setString = typeof set === 'string' ?
        set : new RWDescriptor(set).toString();

    if (username === '*') {
        doc.permission = setString;
        await doc.save();
        res.json({ code: 200, doc: doc.toStatic() });
        return;
    }

    const ud = await UserDoc.findOne({
        where: { username, docId: doc.id }
    });

    const { user } = req.session as StdSession;

    if (ud) {
        if (!set) {
            await ud.destroy();
            res.json({ code: 200, doc: doc.toStatic() });

            ioMsg.sendNotification(username, {
                text: `${ user.username } 取消了文档 ${ doc.title } 的分享`, 
                url: `/home/docs?tab=1&activeDocId=${ doc.id }`
            });
        } else {
            ud.permission = setString;
            await ud.save();
            res.json({ code: 200, doc: doc.toStatic() });

            ioMsg.sendNotification(username, {
                text: `${ user.username } 修改了你对文档 ${ doc.title } 的权限`,
                url: `/home/docs?tab=1&activeDocId=${ doc.id }`
            });
        }
    } else {
        if (set) {
            const ud = UserDoc.link(username, doc.id, setString);
            await ud.save();
            res.json({ code: 200, doc: doc.toStatic() });

            ioMsg.sendNotification(username, {
                text: `${ user.username } 分享文档 ${ doc.title } 给你`,
                url: `/home/docs?tab=1&activeDocId=${ doc.id }`
            });
        } else {
            res.json({ code: 200, doc: doc.toStatic() });
        }
    }
}

router.post('/', DocSetPerm);

router.use('/set', DocSetPerm);

export default router;


