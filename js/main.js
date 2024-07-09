let synthControls = [null, null];

function getAbcString(melody, melodicSound=0, tempo=100) {
    if(typeof melody !== "string") melody = melody.toAbc();
    // お気に入り0, 80, 82, 88, 49, 21, 24, 5, 4!!
    const abcString = `
    %%MIDI program ${melodicSound}
    X: 1
    M: 4/4
    L: 1/4
    Q: 1/4=${tempo}
    K: C
    ${melody}]
    `
    return abcString;
}

// function getDrumAbcString(rhythm, tempo=100) {
//     // お気に入り0, 80, 82, 88, 49, 21, 24, 5, 4!!
//     const abcString = `
// L:1/8
// Q: 1/4=${tempo}
// K:perc
// z4| B,,,2 ^C,,3/2 B,,,/2 B,,, B,,, ^C,,2| B,,,2 ^C,,3/2 B,,,/2 B,,, B,,, ^C,,2| B,,,2 ^C,,3/2 B,,,/2 B,,, B,,, ^C,,2| B,,,2 ^C,,3/2 B,,,/2 B,,, B,,, ^C,,2|
//     `
//     return abcString;
// }


function setAudio(i, abcString, play=false) {

    // MIDIプレーヤーの準備
    if(synthControls[i]) synthControls[i].pause();
    synthControls[i] = new ABCJS.synth.SynthController();
    // synthControls[i].load('#play' + i, null, {
    //     displayLoop: true,
    //     displayRestart: true,
    //     displayPlay: true,
    //     displayProgress: true,
    //     displayWarp: true
    // });

    // 楽譜をレンダリング
    const visualObj = ABCJS.renderAbc('score' + i, abcString);
    $('#score' + i).css('display', 'none');
    $('#play' + i).css('display', 'none');
    // $(`#score` + i).css('width', '100%');
    // $(`#score` + i).css('overflow-x', 'scroll');

    // MIDIの生成
    const midiBuffer = new ABCJS.synth.CreateSynth();

    midiBuffer.init({visualObj: visualObj[0]}).then(function () {
        synthControls[i].setTune(visualObj[0], false, {}).then(function (response) {
            // console.log("Audio loaded");
            if(play) {
                setTimeout(() => {
                    replayAudio();
                }, 450);
            }
        });
    }).catch(function (error) {
        console.error("Error initializing synth", error);
    });
}

function replayAudio() {
    for (let i = 0; i < synthControls.length; i++) {
        const synthControl = synthControls[i]
        if(synthControl) {
            synthControl.setProgress(1);
            synthControl.pause();
            synthControl.play();
        }
    }
}

function playAudio() {
    for (let i = 0; i < synthControls.length; i++) {
        const synthControl = synthControls[i]
        if(synthControl) {
            synthControl.play();
        }
    }
}

function pauseAudio() {
    for (let i = 0; i < synthControls.length; i++) {
        const synthControl = synthControls[i]
        if(synthControl) {
            synthControl.pause();
        }
    }
}

function playMelody(key=0) {
    const barNum = $('#length').val() - 0;
    const melody = new Melody(null, key);
    const chordProgression = new ChordProgression(
        [new MajorChord('C,,'), new MajorChord('F,,'), new MinorChord('A,,'), new MajorChord('G,,')],
        key
    )

    let melodyAbc = melody.getBar('start');
    let chordAbc = 'z/2|';

    for (let i = 0; i < barNum - 3; i++) {
        melodyAbc += melody.getBar();
        chordAbc += chordProgression.getBar();

        // 転調
        // if(i === 3) {
        //     key = 3;
        //     melody.key = key;
        //     chordProgression.key = key;
        // }
    }
    melodyAbc += melody.getBar('before end') + melody.getBar('end');

    const endingChord = [new MinorChord('D,,').add(key), new MajorChord('G,,').add(key), new MajorChord('C,').add(key)];
    chordAbc += `${endingChord[0].toAbc()} ${endingChord[1].toAbc()} | [${endingChord[2].compositions[0].toAbc()} ${endingChord[2].compositions[2].toAbc()}]|`;

    const melodicSound = $('#melodic-sound').val();
    const chordSound = $('#chord-sound').val();
    const tempo = $('#tempo').val();
    setAudio(0, getAbcString(melodyAbc, melodicSound, tempo));
    setAudio(1, getAbcString(chordAbc, chordSound, tempo), true);
    $('#play-btn').css('display', 'flex');
}