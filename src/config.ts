import * as path from "path";
import * as fs from "fs-extra";

export const DB_CONFIG = {
    database: 'edit-ot',
    dialect: 'mysql',
    username: 'root',
    password: 'root'
}



export const PUBLIC_BASE = path.join(__dirname, 'public');
export const AVATAR_BASE = path.join(PUBLIC_BASE, 'user-avatar');

fs.ensureDirSync(AVATAR_BASE);

