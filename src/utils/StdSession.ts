import { UserStatic, User } from "../Model";

export interface MySessionContent {
    user: UserStatic,
    userInfo: User
}

interface SessionData extends MySessionContent {
    [key: string]: any;
    cookie: SessionCookieData;
}

interface SessionCookieData {
    originalMaxAge: number;
    path: string;
    maxAge: number | null;
    secure?: boolean;
    httpOnly: boolean;
    domain?: string;
    expires: Date | boolean;
    sameSite?: boolean | string;
}

interface SessionCookie extends SessionCookieData {
  serialize(name: string, value: string): string;
}

export interface StdSession extends SessionData {
    id: string;
    regenerate(callback: (err: any) => void): void;
    destroy(callback: (err: any) => void): void;
    reload(callback: (err: any) => void): void;
    save(callback: (err: any) => void): void;
    touch(callback: (err: any) => void): void;
    cookie: SessionCookie;
}

