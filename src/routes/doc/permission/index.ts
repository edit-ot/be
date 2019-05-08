import * as express from "express";
// import { User, Doc } from "../../../Model";
import { StdSession } from "utils/StdSession";
import { Doc } from "../../../Model";
import { UserDoc } from "../../../Model/UserDoc";
import { RWDescriptorBase, RWDescriptor } from "../../../utils/RWDescriptor";

const router = express.Router(); 

// param 
router.use('*', (req, res, next) => {
    const { docId } = req.body;

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
    const { docId } = req.body;

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

// ENNN
router.post('/', async (req, res, next) => {
    const { username } = req.body;
    const doc = req.body.doc as Doc;
    const set = (req.body.set || '') as string | RWDescriptorBase;

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
    
    if (ud) {
        if (!set) {
            await ud.destroy();
            res.json({ code: 200, doc: doc.toStatic() });
        } else {
            ud.permission = setString;
            await ud.save();
            res.json({ code: 200, doc: doc.toStatic() });
        }
    } else {
        if (set)         {
            const ud = UserDoc.link(username, doc.id, setString);
            await ud.save();
            res.json({ code: 200, doc: doc.toStatic() });
        } else {
            res.json({ code: 200, doc: doc.toStatic() });
        }
    }
});

export default router;


