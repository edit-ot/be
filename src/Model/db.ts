import { Sequelize } from 'sequelize-typescript';
import { User } from "./User";
import { Doc } from './Doc';
import { Group } from "./Group";
import { DocGroup } from './DocGroup';
import { UserGroup } from './UserGroup';
import { File } from './File';
import { UserPunch } from './UserPunch';
import { DB_CONFIG } from '../config';
import { UserDoc } from './UserDoc';
import { Msg } from './Msg';

export const sequelize = new Sequelize(DB_CONFIG);

sequelize.addModels([
    User,
    Doc,
    UserDoc,
    Group,
    DocGroup,
    UserGroup,
    File,
    
    Msg,
    UserPunch
]);
