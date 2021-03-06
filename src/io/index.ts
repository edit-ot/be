import * as socketio from "socket.io";
import docRoute from "./routes/doc";
import msgRoute from "./routes/msg";
import cardRoute from "./routes/card";

export function ATTACH_IO(server: any) {
    // const io = socketio(server, {
    //     pingTimeout: 16000, 
    //     pingInterval: 25000,
    //     transports: ['websocket']
    // });
    const io = socketio();
    io.listen(5556);
    // io.attach(server);

    docRoute(io);    
    msgRoute(io);
    cardRoute(io);
}
