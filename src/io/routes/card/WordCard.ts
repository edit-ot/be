import { Delta } from "edit-ot-quill-delta";
import * as JSONStringify from "fast-json-stable-stringify"
import { Group } from "../../../Model/Group";
import { EventEmitter } from "events";
import { SharedDoc } from "io/CoZone";

export type Word = {
    id: string;
    word: string;
    interpretation: Delta;
    creator: string;
}

export type WordMap = {
    [wordId: string]: Word
}

export class WordCard extends EventEmitter {
    groupId: string;
    text: string;
    map: WordMap;
    use: string;

    getRandomId() {
        return Date.now().toString(36);
    }

    constructor(groupId: string, initText: string, use: string) {
        super();
        
        this.groupId = groupId;
        this.text = initText;
        this.use = use;
        this.initMapFromText();
    }

    save() {
        this.text = JSONStringify(this.map);

        return Group.findOne({
            where: { groupId: this.groupId }
        }).then(g => {
            if (!g) {
                throw new Error(
                    `Invalid groupId Not Found: ${ this.groupId }`
                );
            }

            // g.card = this.text;
            g[this.use] = this.text;

            return g.save();
        });
    }

    updateFromDocMap(docMap: {
        [key: string]: SharedDoc
    }) {
        Object.keys(this.map).forEach(key => {
            const w = this.map[key];

            w.interpretation = docMap[key] ? 
                docMap[key].now :
                new Delta().insert('\n');
        });
    }

    initMapFromText() {
        try {
            const m: WordMap = JSON.parse(this.text);
            Object.keys(m).forEach(id => {
                m[id] = {
                    id,
                    word: m[id].word,
                    interpretation: new Delta( m[id].interpretation ),
                    creator: m[id].creator
                }
            });
            this.map = m;
        } catch (err) {
            this.map = {};
        }
    }

    getWordById(id: string): Word | null {
        return this.map[id] || null;
    }

    getWord(word: string): Word | null {
        const results = Object.keys(this.map)
          .map(k => this.map[k])
          .filter(w => w.word === word);
        
        return results[0] || null;
    }

    addBlankWord(word: string, creator: string) {
        const id = this.getRandomId();
        
        if (this.map[id]) return;

        this.map[id] = {
            word,
            interpretation: new Delta().insert('\n'),
            creator,
            id
        };
    }

    // removeWord(wordId: string, creator: string) {
    // }

    changeWordName(wordId: string, newWord: string) {
        const w = this.map[wordId];
        if (!w) return;

        const preName = w.word;
        w.word = newWord;

        return preName;
    }

    getMap() {
        return this.map;
    }

    toArray(): Word[] {
        return Object.keys(this.map).map(k => this.map[k]);
    }
}
