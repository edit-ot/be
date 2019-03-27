import * as express from "express";
import { LoginMidWare } from "../user";
import { User, Doc } from "../../Model";
import { StdSession } from "utils/StdSession";
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
            data: (user && user.docs) || []
        });
    })
});

router.post('/create', (req, res, next) => {
    const session = req.session as StdSession;
    const { user } = session;

    const theNewDoc = new Doc({
        title: '未命名文档',
        content: '',
        owner: user.username,
        permission: ''
    });

    theNewDoc.save().then(doc => {
        res.json({
            code: 200,
            msg: '创建成功',
            data: doc
        })
    }).catch(next);
});

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
})

export default router;



