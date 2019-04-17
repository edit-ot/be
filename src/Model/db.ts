import { Sequelize } from 'sequelize-typescript';
import { User } from "./User";
import { Doc } from './Doc';
import { Group } from "./Group";
import { DocGroup } from './DocGroup';
import { UserGroup } from './UserGroup';


export const sequelize = new Sequelize({
    database: 'edit-ot',
    dialect: 'mysql',
    username: 'root',
    password: 'root'
});

sequelize.addModels([
    User,
    Doc,
    Group,
    DocGroup,
    UserGroup
]);
