import * as express from "express";
import { File } from "../../Model/File";
import { StdSession } from "utils/StdSession";
import { LoginMidWare } from "../user";

const router = express.Router(); 

export default router;

router.use('*', LoginMidWare);

router.get('/', (req, res) => {
    const { user } = req.session as StdSession;

    File.findAll({
        where: { owner: user.username }
    }).then(files => {
        res.json({
            code: 200, 
            data: files
        });
    });
});


