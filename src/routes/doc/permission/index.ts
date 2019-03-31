import * as express from "express";
// import { User, Doc } from "../../../Model";
import { StdSession } from "utils/StdSession";
import { Doc, RWDescriptor, UserPermissionMap } from "../../../Model";

const router = express.Router(); 

// param 
router.use('*', (req, res, next) => {
    const { docId, username } = req.body;

    if (!docId || !username) {
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
    })
});

// ENNN
router.post('/', (req, res, next) => {
    const { username } = req.body;
    const doc = req.body.doc as Doc;
    const set = (req.body.set) as RWDescriptor | '' | null;

    const p = doc.toPermissionObj();

    let new_p: UserPermissionMap;

    // Set It 
    if (set) {
        new_p = Object.assign(p, {
            [username]: set
        });
    } else {
        // delete 
        delete p[username];
        new_p = p;
    }

    doc.permission = doc.pmapToStr(new_p);

    doc.save().then(() => {
        res.json({ code: 200, data: doc.toStatic() });
    }).catch(next);

});

export default router;


