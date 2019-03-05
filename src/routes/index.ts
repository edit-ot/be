import * as express from "express";
import { User, sequelize } from "../Model";

const router = express.Router();

router.get('/', (req, res, next) => {
    sequelize.sync().then(() => {  
        User.findAll().then(users => {
            console.log('users', users);
        });
    });
    res.json("Hello, World");
});

export default router;
