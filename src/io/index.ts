import * as socketio from "socket.io";
import docRoute from "./routes/doc";
export const io = socketio();


export function ATTACH_IO(server: any) {
    io.attach(server);
}

docRoute(io);
