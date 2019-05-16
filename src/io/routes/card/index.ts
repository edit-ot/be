import * as socketio from "socket.io";

// import { Delta } from "edit-ot-quill-delta";
// import { StdSession } from "utils/StdSession";
// import { coZonePool } from "../../CoZone";
import { IOSessionBridge, IOLoginMiddleware } from "../../wares/IOLogin";
import { Group } from "../../../Model/Group";
// import { WordCard } from "./WordCard";
import { SocketManager } from "../../utils/SocketManager";
import { coZonePool } from "../../CoZone";
import { WordCard } from "./WordCard";
import { StdSession } from "utils/StdSession";
import { Delta } from "edit-ot-quill-delta";



export default (io: socketio.Server) => {
    const cardIo = io.of('/card');

    io.use(IOSessionBridge);

    io.use(IOLoginMiddleware);

    cardIo.use(IOSessionBridge);
    
    cardIo.use(IOLoginMiddleware);

    cardIo.use((socket, next) => {
        const { groupId } = socket.handshake.query;
    
        Group.findOne({
            where: { groupId }
        }).then(g => {
            if (!g) {
                socket.emit('data-error');
                socket.disconnect(true);
            } else {
                // @ts-ignore
                socket.group = g;

                socket.join(g.toRoomName(), () => {
                    next();
                });
            }
        });
    });

    cardIo.on('connect', socket => {
        // @ts-ignore
        const group = socket.group as Group;
        // @ts-ignore
        const { user, userInfo } = socket.handshake.session as StdSession;

        const roomName = group.toRoomName();

        const IoRoom = cardIo.to(roomName);
        
        const zone = coZonePool.createZone<WordCard>(
            roomName,
            IoRoom,
            new WordCard(group.groupId, group.card)
        );

        zone.startTask();

        const sm = new SocketManager(IoRoom);

        const setWordsFor = (s: SocketIO.Namespace | SocketIO.Socket) => {
            s.emit('setWords', zone.store.toArray());
        }

        socket.on('addWord', (word: string) => {
            zone.store.addBlankWord(word, userInfo.username);
            setWordsFor(IoRoom);
        });

        socket.on('chooseWord', wordId => {
            const t = zone.store.getWordById(wordId);
            if (!t) return;

            const doc = zone.createSubDoc(
                wordId,
                new Delta(t.interpretation)
            );

            // socket.emit('setNowEditWord', t);
            socket.emit('setNowEditWord', {
                word: t,
                now: doc.now,
                nowHash: doc.nowHash
            });
        })

        socket.on('changeWordName', data => {
            const { wordId, word } = data;
            zone.store.changeWordName(wordId, word);
            setWordsFor(IoRoom);
        });

        socket.on('login', async () => {
            console.log('User Login', userInfo.username);
            sm.setLoginedUsersFor(IoRoom);
            setWordsFor(socket);
        });

        socket.on('disconnect', reasone => {
            console.log('User Disconnect', userInfo.username, reasone);
            sm.setLoginedUsersFor(IoRoom).then(users => {
                if (users.length === 0) {
                    console.log('No User In Card IoRoom:', roomName);
                    
                    zone.store.updateFromDocMap(zone.docMap);
                    zone.store.save();

                    coZonePool.removeZone<WordCard>(roomName);
                }
            })
        });


        socket.on('updateContents', async data => {
            console.log('!! updateContents', user.username);

            const delta = new Delta(data.delta);
            zone.addSeqFor(data.subDocId, userInfo, delta);
            // socket.emit('finishUpdate');
        });



        // socket
    });
}
