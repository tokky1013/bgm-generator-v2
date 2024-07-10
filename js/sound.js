// --------------------------音--------------------------
class SoundWithKeySignature {
    length = 0;
    #sounds;

    constructor(sound, sounds={"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}) {
        this.#sounds = sounds;
        if(typeof sound === "string") this.#fromAbc(sound);
        else if(Number.isInteger(sound)) this.#fromInt(sound);
        else throw new Error(`${sound}をSoundオブジェクトに変換できません。`);
    }

    #fromAbc(abc) {
        if(!/^[\^=_]?[A-Ga-g][',]*$/.test(abc)) throw new Error(`${abc}をSoundオブジェクトに変換できません。`);

        // 調号を取得
        if(abc.startsWith("^")) {
            this.keySignature = "^";
            abc = abc.substring(1);
        }else if(abc.startsWith("_")) {
            this.keySignature = "_";
            abc = abc.substring(1);
        }else {
            this.keySignature = "";
            if(abc.startsWith("=")) abc = abc.substring(1);
        }

        // 高さを取得
        this.octave = 0;
        if(abc.includes(",")) {
            abc = abc.split(",")
            this.octave -= abc.length - 1;
            abc = abc.join("");
        }
        if(abc.includes("'")) {
            abc = abc.split("'")
            this.octave += abc.length - 1;
            abc = abc.join("");
        }
        if(/[a-g]/.test(abc)) {
            this.octave += 1;
            abc = abc.toUpperCase();
        }

        this.pitchName = abc;
    }

    #fromInt(int) {
        const soundNum = Math.max(...Object.values(this.#sounds)) + 1;
        this.octave = Math.floor(int / soundNum);
        int = int % soundNum;
        int = int >= 0 ? int : int + soundNum;

        const keys = Object.keys(this.#sounds).reverse();
        for (const key of keys) {
            if(this.#sounds[key] <= int) {
                this.pitchName = key;
                this.keySignature = this.#sounds[key] === int ? "" : "^";
                break
            }
        }
    }

    // 全部シャープか調号無しになる
    toAbc(key=0) {
        if(key === 0) {
            let abc = this.pitchName;
            if(this.octave < 0) abc += ",".repeat(-this.octave);
            else if(this.octave > 0) abc = abc.toLowerCase() + "'".repeat(this.octave - 1);
    
            abc = this.keySignature + abc;
            return abc;
        }
        return this.add(key).toAbc();
    }

    toInt() {
        const soundNum = Math.max(...Object.values(this.#sounds)) + 1;
        let int = this.#sounds[this.pitchName] + this.octave * soundNum;
        if(this.keySignature === "^") int += 1;
        else if(this.keySignature === "_") int -= 1;

        return int;
    }

    add(int) {
        return new SoundWithKeySignature(this.toInt() + int);
    }
}

// シャープ/フラットは無し
// next関数でキーを指定
class Sound extends SoundWithKeySignature {
    constructor(sound) {
        // 調号はなし
        if(typeof sound === "string") {
            if(sound.startsWith("^") || sound.startsWith("_")) throw new Error("調号は設定できません");
        }
        super(sound, {"C": 0, "D": 1, "E": 2, "F": 3, "G": 4, "A": 5, "B": 6});
    }

    toAbc(key=0) {
        if(key === 0) return super.toAbc();
        const sound = new SoundWithKeySignature(this.toAbc());
        return sound.toAbc(key);
    }

    add(int) {
        return new Sound(this.toInt() + int);
    }
}

// --------------------------コード--------------------------
// コードの基本クラス
// プロパティはcompositionsとlength
class Chord {
    constructor(root, compositions) {
        if(typeof root === "string") root = new SoundWithKeySignature(root);
        this.compositions = [root];

        for (const composition of compositions) {
            const tone = root.add(composition);
            this.compositions.push(tone);
        }
    }

    toAbc(key=0) {
        let abc = "";
        for (const composition of this.compositions) {
            abc += composition.toAbc(key);
        }
        return abc;
    }

    add(int) {
        let chord = Object.create(Object.getPrototypeOf(this));
        chord.compositions = [];

        for (let i = 0; i < this.compositions.length; i++) {
            chord.compositions.push(this.compositions[i].add(int));
        }
        return chord;
    }
}

// メジャーコード
class MajorChord extends Chord {
    length = 2;
    constructor(root) {
        const compositions = [4, 7];        // 根音以外の構成音
        super(root, compositions);
    }
    
    toAbc(key=0) {
        return `${this.compositions[0].toAbc(key)}/4 ${this.compositions[2].toAbc(key)}/4 [${this.compositions[0].add(12).toAbc(key)} ${this.compositions[1].add(12).toAbc(key)}]/2 z`;
    }
}

// マイナーコード
class MinorChord extends Chord {
    length = 2;
    constructor(root) {
        const compositions = [3, 7];
        super(root, compositions);
    }

    toAbc(key=0) {
        return `${this.compositions[0].toAbc(key)}/4 ${this.compositions[2].toAbc(key)}/4 [${this.compositions[0].add(12).toAbc(key)} ${this.compositions[1].add(12).toAbc(key)}]/2 z`;
    }
}

// セブンスコード
// class SeventhChord extends Chord {
//     length = 1;
//     constructor(root) {
//         const compositions = [4, 7, 10];
//         super(root, compositions);
//     }
// }

// // マイナーセブンスコード
// class MinorSeventhChord extends Chord {
//     length = 1;
//     constructor(root) {
//         const compositions = [3, 7, 10];
//         super(root, compositions);
//     }
// }

// --------------------------メロディ--------------------------
class Melody {
    #i = 0;
    rhythmCount = 0;
    barNum = 0;
    constructor(sound=null, key=0) {
        if(sound) this.sound = new Sound(sound);
        else this.begin()
        this.soundPrev = new Sound(this.sound.toAbc());
        this.key = key;
        this.barNum = 0;
    }

    // 一小節を生成
    // startOrEndはstartで最初, endで最後, before endでフレーズの最後になって欲しくない時
    getBar(startOrEnd='') {
        let abc = '';
        this.#i = 0;        // 箔を数える
        this.barNum++;      // これが4の倍数の時にフレーズを終わる
        switch (startOrEnd) {
            case 'start':
                // 最初の一小節(四分音符分の長さしかない)
                abc = this.sound.toAbc(this.key) + '/4';
                this.#goToAdjacent();
                abc += this.sound.toAbc(this.key) + '/4';
                this.next();
                this.barNum = 0;
                break;

            case 'end':
                // 最後の一小節(四分音符分の長さしかない)
                this.sound = this.soundPrev
                this.goToHigherCEG();
                abc = this.sound.toAbc(this.key);
                this.begin();
                this.barNum = 0;
                break;

            case 'before end':
                // 最後の小節の一つ前 終わらないようにする
                while(this.#i < 4) {
                    abc += this.getRhythm();
                    this.#i += 1;
                }
                break;
        
            default:
                if(this.barNum % 4 === 0) {
                    // フレーズを終わる場合
                    if(Math.random() <= 0.5) {
                        while(this.#i < 2) {
                            abc += this.getRhythm();
                            this.#i += 1;
                        }
                        this.goToClosestCEG();
                        abc += this.sound.toAbc(this.key) + ' z';
        
                        this.begin();
                    }else {
                        while(this.#i < 2) {
                            abc += this.getRhythm();
                            this.#i += 1;
                        }
                        this.goToClosestCEG();
                        abc += this.sound.toAbc(this.key) + '/2 z';
                        this.begin();
                        abc += this.sound.toAbc(this.key) + '/4';
                        this.#goToAdjacent();
                        abc += this.sound.toAbc(this.key) + '/4';
                        this.next();
                    }
                    this.rhythmCount = 0;
                    this.barNum = 0;
                }else {
                    // フレーズを終わらない場合
                    while(this.#i < 4) {
                        abc += this.getRhythm();
                        this.#i += 1;
                    }
                }
                break;
        }
        return abc + '|';
    }

    // リセット
    reset() {
        this.begin();
        this.#i = 0;
        this.barNum = 0;
        this.rhythmCount = 0;
    }

    // headは長さが変化しないもののみ
    getRhythm() {
        if(this.rhythmCount === 0) {
            const rhythms = [
                '<0>/2 <1>/2',
                'z/2 <0>/2',
                '<0>/2 z/2',
                '<0>3/4 <1>/4',
                '<0>/4 <1>3/4',
                // 'z/4 <0>3/4',
                '<0>/4 z/4 <1>/2',
                '<0>1/2 z/4 <1>/4',
                '<0>3/4 z/4',
                '<prev>3/4 <0>/4',
                '<prev>/4 <0>3/4',
                '<0>/2 <1>/4 <2>/4',
                '<0>/4 <1>/2 <2>/4',
                '<0>/4 <1>/4 <2>/2',
                // これ以降のは確率上げるためにあえて重複させてる
                '<0>/2 <1>/2',
                '<0>3/4 <1>/4',
                '<0>/4 <1>3/4',
                '<prev>3/4 <0>/4',
                '<prev>/4 <0>3/4',
                '<0>/2 <1>/4 <2>/4',
                '<0>/4 <1>/2 <2>/4',
                '<0>/4 <1>/4 <2>/2',
            ]
    
            this.rhythm = rhythms[Math.floor(Math.random() * rhythms.length)];  
            this.rhythmCount = Math.floor(Math.random() * 3);
        }else {
            this.rhythmCount--;
        }

        let rhythm = this.rhythm;
        let i = 0;
        rhythm = rhythm.replace('<prev>', this.soundPrev.toAbc(this.key));
        while(/<[0-9]+>/.test(rhythm)) {
            rhythm = rhythm.replace('<' + i + '>', this.sound.toAbc(this.key));
            i++;
            this.soundPrev = new Sound(this.sound.toAbc());
            this.next();
        }
        return rhythm;
    }

    begin() {
        const sounds = [0, 2, 4, 7, 9, 12];
        this.sound = new Sound(sounds[Math.floor(Math.random() * sounds.length)]);
    }

    // 音を普通に次に進める リズムは関係ない
    next() {
        // 一定確率で同じ音
        if(Math.random() <= 0.05) return;

        const pGoToCEG = 0.2;       // 現在ドミソの時、ドミソに飛ぶ確率
        switch (this.sound.pitchName) {
            case "C":
            case "E":
            case "G":
                if(Math.random() <= pGoToCEG) this.#goToCEG();
                else this.#goToAdjacent();
                break;

            case "D":
            case "F":
            case "A":
            case "B":
                this.#goToAdjacent();
                break;
        }
    }

    // 隣に行く
    // 確率pFBでファまたはシへに行く
    #goToAdjacent() {
        const pFB = 0.1;        // F(ファ)かB(シ)に飛ぶ確率
        const a = 0.5;          // どれだけ音が高くなったり低くなったりしやすいか
        const center = 5        // どの音を中心とするか
        const pitchName = this.sound.pitchName;

        const pUp = 1 / (1 + Math.exp(a * (center - this.sound.toInt())));    // 音が高くなる確率(シグモイド関数で高くなりすぎたり低くなりすぎないように調整、Gを中心)

        let num;
        if(Math.random() <= pFB) {
            switch (pitchName) {
                case "C":
                case "G":
                    this.sound.add(-1);
                    return;
                case "E":
                case "B":
                    this.sound.add(1);
                    return;
            }
        }
        switch (pitchName) {
            case "C":
            case "G":
                num = Math.random() <= pUp ? -2 : 1;
                break;

            case "E":
            case "A":
                num = Math.random() <= pUp ? -1 : 2;
                break;

            case "D":
            case "F":
            case "B":
                num = Math.random() <= pUp ? -1 : 1;
                break;
        }
        this.sound = this.sound.add(num);
    }
    // ドミソからドミソへ飛ぶ
    #goToCEG() {
        let nums;
        switch (this.sound.pitchName) {
            case "C":
                nums = [-7, -5, -3, 2, 4, 7];
                break;
            case "E":
                nums = [-7, -5, -2, 2, 5, 7];
                break;
            case "G":
                nums = [-7, -4, -2, 3, 5, 7];
                break;
            default:
                Error("goToCEGはthis.sound.pitchNameがC, E, G以外の時は呼び出せません");
        }
        const num = nums[Math.floor(Math.random() * nums.length)];
        this.sound = this.sound.add(num);
    }

    // 最寄りのドミソに行く
    goToClosestCEG() {
        let num;
        switch (this.sound.pitchName) {
            case "C":
            case "E":
            case "G":
                return;

            case "D":
            case "F":
                num = Math.random() <= 0.5 ? -1 : 1;

            case "A":
                num = -1;
                break;

            case "B":
                num = 1;
                break;
        }
        this.sound = this.sound.add(num);
    }

    // 最も近い高いドミソに行く
    goToHigherCEG() {
        let num;
        switch (this.sound.pitchName) {
            case "C":
            case "E":
            case "A":
                num = 2;
                break;

            case "D":
            case "F":
            case "B":
                num = 1;
                break;

            case "G":
                num = 3;
                break;
        }
        this.sound = this.sound.add(num);
    }
}

// --------------------------コード進行--------------------------

class ChordProgression {
    #i = 0;
    #index = 0;
    // Chordオブジェクトを入力
    constructor(chords, key=0) {
        this.chords = chords;
        this.key = key;
    }

    getBar() {
        let abc = "";
        while(this.#i < 4) {
            const chord = this.chords[this.#index % this.chords.length];
            abc += chord.toAbc(this.key);
            this.#i += chord.length;
            this.#index++;
        }
        this.#i = 0
        return abc + "|";
    }

    reset() {
        this.#i = 0;
        this.#index = 0;
    }
}