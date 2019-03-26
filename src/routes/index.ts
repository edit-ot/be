import * as express from "express";
import userRouter from "./user";
import docRouter from "./doc";


const router = express.Router();


router.use('/api/user', userRouter);

router.use('/api/doc', docRouter);

router.get('/', (req, res, next) => {
    res.json("Hello, World");
});

export default router;
