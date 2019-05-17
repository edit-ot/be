import * as CreateSession from "express-session";
import { SECRET } from "./server-config";

export const session = CreateSession({
    secret: SECRET
});
