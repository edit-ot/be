import { Sequelize } from 'sequelize-typescript';
import { User } from "./User";

export const sequelize = new Sequelize({
    database: 'edit-ot',
    dialect: 'mysql',
    username: 'root',
    password: 'root'
});

sequelize.addModels([
    User
]);
