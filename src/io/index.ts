import * as socketio from "socket.io";
import docRoute from "./routes/doc";

export function ATTACH_IO(server: any) {
    const io = socketio(server, {
        pingTimeout: 16000, 
        pingInterval: 25000,
        
    });
    // io.attach(server);
    docRoute(io);
}

