import * as socketio from "socket.io";
import { IOSessionBridge, IOLoginMiddleware } from "../../wares/IOLogin";
import { Group } from "../../../Model/Group";
import { SocketManager } from "../../utils/SocketManager";
import { coZonePool } from "../../CoZone";
import { WordCard } from "./WordCard";
import { StdSession } from "utils/StdSession";
import { Delta } from "edit-ot-quill-delta";

export default (io: socketio.Server) => {
    const cardIo = io.of('/card');

    cardIo.use(IOSessionBridge);

    cardIo.use(IOLoginMiddleware);

    cardIo.use(IOSessionBridge);
    
    cardIo.use(IOLoginMiddleware);

    cardIo.use((socket, next) => {
        const groupId = socket.handshake.query.groupId;
        const use = socket.handshake.query.use || 'card';
    
        Group.findOne({
            where: { groupId }
        }).then(g => {
            if (!g) {
                socket.emit('data-error');
                socket.disconnect(true);
            } else {
                // @ts-ignore
                socket.group = g;

                socket.join(g.toRoomName(use), () => {
                    next();
                });
            }
        });
    });

    cardIo.on('connect', StdWordCardMiddleware(cardIo));
}

export function StdWordCardMiddleware(cardIo: SocketIO.Namespace) {
    return (socket: SocketIO.Socket) => {
        const use = socket.handshake.query.use || 'card';

        // @ts-ignore
        const group = socket.group as Group;
        // @ts-ignore
        const { user, userInfo } = socket.handshake.session as StdSession;

        const roomName = group.toRoomName(use);

        const IoRoom = cardIo.to(roomName);
        
        const zone = coZonePool.createZone<WordCard>(
            roomName,
            IoRoom,
            new WordCard(group.groupId, group[use] as string, use)
        );

        zone.startTask();

        const sm = new SocketManager(IoRoom);

        const setWordsFor = (s: SocketIO.Namespace | SocketIO.Socket) => {
            s.emit('setWords', zone.store.toArray());
        }

        const setMsg = (msg: string) => {
            console.log(msg);
            IoRoom.emit('setMsg', msg);
        }

        socket.on('addWord', (word: string) => {
            

            zone.store.addBlankWord(word, userInfo.username);
            setWordsFor(IoRoom);

            setMsg(`${ userInfo.username } 添加了一条名为 ${ word } 的单词`);
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

            setMsg(`${ userInfo.username } 开始编辑 ${ t.word }`);
        });

        socket.on('changeWordName', data => {
            const { wordId, word } = data;

            const preName = zone.store.changeWordName(wordId, word);
            setWordsFor(IoRoom);

            if (preName) {
                setMsg(`${ userInfo.username } 修改了单词名: ${ preName } -> ${ word }`);
            }
        });

        socket.on('login', async () => {
            console.log('User Login', userInfo.username, 'Room', roomName);
            sm.setLoginedUsersFor(IoRoom);
            setWordsFor(socket);

            setMsg(`欢迎 ${ userInfo.username } 进入了协作`);
        });

        socket.on('disconnect', reasone => {
            console.log('User Disconnect', userInfo.username, reasone);
            sm.setLoginedUsersFor(IoRoom).then(users => {
                if (users.length === 0) {
                    console.log('No User In IoRoom:', roomName);
                    
                    zone.store.updateFromDocMap(zone.docMap);
                    zone.store.save();

                    coZonePool.removeZone<WordCard>(roomName);
                }
            });

            setMsg(`${ userInfo.username } 离开了协作`);
        });

        socket.on('updateContents', async data => {
            console.log('updateContents', user.username);
            const delta = new Delta(data.delta);
            zone.addSeqFor(data.subDocId, userInfo, delta);
        });
    }
}
