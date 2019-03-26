import { Sequelize } from 'sequelize-typescript';
import { User } from "./User";
import { Doc } from './Doc';

export const sequelize = new Sequelize({
    database: 'edit-ot',
    dialect: 'mysql',
    username: 'root',
    password: 'root'
});



sequelize.addModels([
    User,
    Doc
]);
