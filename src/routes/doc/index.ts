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

export default router;



