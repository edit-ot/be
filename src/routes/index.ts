import * as express from "express";
import userRouter from "./user";

const router = express.Router();


router.use('/api/user', userRouter);

router.get('/', (req, res, next) => {
    res.json("Hello, World");
});

export default router;
