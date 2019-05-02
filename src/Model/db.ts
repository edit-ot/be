import { Sequelize } from 'sequelize-typescript';
import { User } from "./User";
import { Doc } from './Doc';
import { Group } from "./Group";
import { DocGroup } from './DocGroup';
import { UserGroup } from './UserGroup';
import { File } from './File';
import { UserPunch } from './UserPunch';
import { DB_CONFIG } from '../config';


export const sequelize = new Sequelize(DB_CONFIG);

sequelize.addModels([
    User,
    Doc,
    Group,
    DocGroup,
    UserGroup,
    File,
    
    UserPunch
]);
