import * as md5 from "md5";
import * as JSONStringify from "fast-json-stable-stringify"
import { Delta } from "edit-ot-quill-delta";
import { User, UserStatic } from "../../Model";

export type UserComment = {
    user: UserStatic,
    text: string,
    createAt: number
}

export type Patcher = (
    type: 'exclude' | 'include',
    userList: User[],
    delta: Delta,
    hash: string
) => void;

export type DocComment = {
    line: number;
    comments: UserComment[];
}

export class SharedDoc {
    now: Delta;

    docComments: DocComment[] = [];

    seq: {
        user: User,
        delta: Delta
    }[] = [];

    constructor(initDelta?: Delta) {
        this.now = initDelta ?
            initDelta : 
            new Delta().insert('\n');
    }

    pushSeq(user: User, delta: Delta) {
        this.seq.push({
            user,
            delta
        });
        return this;
    }

    removeComment(howToFind: (value: DocComment, index: number, arr: DocComment[]) => boolean) {
        const idx = this.docComments.findIndex(howToFind);
        if (idx === -1) return null;
        this.docComments.splice(idx, 1);
        return this;
    }

    getComments() {
        return this.docComments;
    }

    flushSeq = (patcher: Patcher) => {
        if (this.seq.length === 0) {
            return;
        } else if (this.seq.length === 1) {
            const [fir] = this.seq;
            this.now = this.now.compose(fir.delta);
            this.seq = [];

            patcher(
                'exclude',
                [fir.user],
                fir.delta,
                md5(JSONStringify(this.now))
            );
        } else {
            const [fir, sec] = this.seq;

            console.log('fir', fir.user.username, fir.delta);
            console.log('sec', sec.user.username, sec.delta);

            const firShouldUpdate = fir.delta.transform(sec.delta, true);
            console.log('firShouldUpdate', firShouldUpdate);

            const secShouldUpdate = sec.delta.transform(fir.delta, false);
            console.log('secShouldUpdate', secShouldUpdate);
            
            // Update 
            const nextNow = this.now.compose(fir.delta).compose(firShouldUpdate);
            const nextHash = md5(JSONStringify(nextNow));
            this.now = nextNow;
            
            patcher('include', [fir.user], firShouldUpdate, nextHash);
            patcher('include', [sec.user], secShouldUpdate, nextHash);

            this.seq = this.seq.slice(2);
            patcher('exclude', [fir.user, sec.user], fir.delta.compose(sec.delta), nextHash);
        }
    }
}
