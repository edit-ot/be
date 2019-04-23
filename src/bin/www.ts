#!/usr/bin/env node

import * as http from "http";
import app from "../app";
import { normalizePort } from "../utils";
import { sequelize } from "../Model";
import { ATTACH_IO } from "../io";

const server = http.createServer(app);
const port = normalizePort(process.env.PORT || '5555');
app.set('port', port);

console.log('Sequelize Syncing ...');

sequelize.sync().then(res => {
    console.log('Sequelize Sync Finish.');

    ATTACH_IO(server);

    server.listen(port);
});

server.on('error', function onError(error) {
    // @ts-ignore
    if (error.syscall !== 'listen') {
        throw error;
    }
  
    const bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;
  
    // @ts-ignore
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
});

server.on('listening', function onListening() {
    const addr = server.address();

    if (!addr) return console.log('Addr Not Found');

    const bind = typeof addr === 'string' ?
        'pipe ' + addr :
        'port ' + addr.port;
    
    console.log('Listening on ' + bind);
});
