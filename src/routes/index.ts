import * as express from "express";
import userRouter from "./user";
import docRouter from "./doc";
import qrRouter from "./qr";
import groupRouter from "./group";
import msgRouter from "./msg";

const router = express.Router();

router.get('/api',
    (req, res) => res.json('hello, world')); 

router.use('/api/user', userRouter);

router.use('/api/doc', docRouter);

router.use('/api/qr', qrRouter);

router.use('/api/msg', msgRouter);

router.use('/api/group', groupRouter);

router.get('/', (req, res, next) => {
    res.json("Hello, World");
});


export default router;
