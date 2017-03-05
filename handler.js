const Promise = require('bluebird');
const colors = require('colors');

// We need this to convert from the internal scale starting from A-1,
// to the midi scale start from C-1
const KEY_OFFSET = -3;

const MAX_DURATION = -1;
const NOTE_STOP = -1;
const STEAM_CONTROLLER_MAGIC_PERIOD_RATIO = 495483.0;

const NOTE_LENGTH = 0.1;
const MILLISECONDS = 1000;

const STRING_CONSTANTS = {
    THICK_LINE: '====================',
    THIN_LINE: '------------------'
}

function Flag() {}

function reset() {
    process.stdout.write('\033[1;1H');
}
function clear() {
    process.stdout.write('\033c');
}

function isNull(variable) {
    return variable !== 0 && variable == null;
}

module.exports.isNull = isNull;

module.exports.playNote = function(controller, haptic, note, duration){
    duration = (duration !== 0 && duration == null) ? MAX_DURATION : duration;
    const midiFrequency = [8.1758, 8.66196, 9.17702, 9.72272, 10.3009, 10.9134, 11.5623, 12.2499, 12.9783, 13.75, 14.5676, 15.4339, 16.3516, 17.3239, 18.354, 19.4454, 20.6017, 21.8268, 23.1247, 24.4997, 25.9565, 27.5, 29.1352, 30.8677, 32.7032, 34.6478, 36.7081, 38.8909, 41.2034, 43.6535, 46.2493, 48.9994, 51.9131, 55, 58.2705, 61.7354, 65.4064, 69.2957, 73.4162, 77.7817, 82.4069, 87.3071, 92.4986, 97.9989, 103.826, 110, 116.541, 123.471, 130.813, 138.591, 146.832, 155.563, 164.814, 174.614, 184.997, 195.998, 207.652, 220, 233.082, 246.942, 261.626, 277.183, 293.665, 311.127, 329.628, 349.228, 369.994, 391.995, 415.305, 440, 466.164, 493.883, 523.251, 554.365, 587.33, 622.254, 659.255, 698.456, 739.989, 783.991, 830.609, 880, 932.328, 987.767, 1046.5, 1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, 1760, 1864.66, 1975.53, 2093, 2217.46, 2349.32, 2489.02, 2637.02, 2793.83, 2959.96, 3135.96, 3322.44, 3520, 3729.31, 3951.07, 4186.01, 4434.92, 4698.64, 4978.03, 5274.04, 5587.65, 5919.91, 6271.93, 6644.88, 7040, 7458.62, 7902.13, 8372.02, 8869.84, 9397.27, 9956.06, 10548.1, 11175.3, 11839.8, 12543.9];
    // Checks on note, to make sure it isn't out of range
    if(note < 0 || note >= midiFrequency.length) {
        // throw new Error('Out of note range!');
        return;
    }

    const dataBlob = new Buffer( [0x8f,
                                  0x07,
                                  0x00, //Trackpad select : 0x01 = left, 0x00 = right
                                  0xff, //LSB Pulse High Duration
                                  0xff, //MSB Pulse High Duration
                                  0xff, //LSB Pulse Low Duration
                                  0xff, //MSB Pulse Low Duration
                                  0xff, //LSB Pulse repeat count
                                  0x04, //MSB Pulse repeat count
                                  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                                  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                                  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                                  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    if(note === NOTE_STOP){
        note = 0;
        duration = 0.0;
    }

    const frequency = midiFrequency[note];
    const period = 1.0 / frequency;
    const periodCommand = STEAM_CONTROLLER_MAGIC_PERIOD_RATIO / frequency;

    //Compute number of repeat. If duration < 0, set to maximum
    const repeatCount = (duration >= 0.0) ? (duration / period) : 0x7FFF;

    dataBlob[2] = haptic;
    dataBlob[3] = periodCommand % 0xff;
    dataBlob[4] = periodCommand / 0xff;
    dataBlob[5] = periodCommand % 0xff;
    dataBlob[6] = periodCommand / 0xff;
    dataBlob[7] = repeatCount % 0xff;
    dataBlob[8] = repeatCount / 0xff;

    return Promise.promisify(controller.devHandle.controlTransfer.bind(controller.devHandle))(0x21, 9, 0x0300, 2, dataBlob);
}

module.exports.sleep = function(milliseconds) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, milliseconds);
    });
}

module.exports.NoteHandler = class {
    constructor(steamController) {
        this.steamController = steamController;

        this.leftHaptic = null;
        this.rightHaptic = null;

        this.leftOffset = 4;
        this.rightOffset = 4;

        this.changedLeft = true;
        this.changedRight = true;
    }

    set rawLeft(note) {
        this.changedLeft = true;
        if(isNull(note)) {
            this.left = null;
        } else {
            this.left = note % 12;
            this.leftOctave = Math.floor(note/12) - 1;
        }
    }
    set rawRight(note) {
        this.changedRight = true;
        if(isNull(note)) {
            this.right = null;
        } else {
            this.right = note % 12;
            this.rightOctave = Math.floor(note/12) - 1;
        }
    }

    get rawLeft() {
        this.changedLeft = false;
        if(isNull(this.left)) {
            return null;
        } else {
            return 12*(this.leftOctave + 1) + this.left + KEY_OFFSET;
        }
    }
    get rawRight() {
        this.changedRight = false;
        if(isNull(this.right)) {
            return null;
        } else {
            return 12*(this.rightOctave + 1) + this.right + KEY_OFFSET;
        }
    }

    set left(note) {
        this.changedLeft = true;
        this.leftHaptic = note;
    }
    set right(note) {
        this.changedRight = true;
        this.rightHaptic = note;
    }

    get left() {
        this.changedLeft = false;
        return this.leftHaptic;
    }
    get right() {
        this.changedRight = false;
        return this.rightHaptic;
    }



    changeLeftOctave(change) {
        this.leftOctave += change;
    }
    changeRightOctave(change) {
        this.rightOctave += change;
    }

    set leftOctave(offset) {
        this.leftOffset = offset;
    }
    set rightOctave(offset) {
        this.rightOffset = offset;
    }

    get leftOctave() {
        return this.leftOffset;
    }
    get rightOctave() {
        return this.rightOffset;
    }

    start() {
        const handlerArray = [];
        if(this.changedLeft === true) {
            const left = this.rawLeft;
            this.savedLeft = left;
            handlerArray.push(module.exports.playNote(this.steamController, 1, left || 0, left != null ? -1 : 0));
        }
        if(this.changedRight === true) {
            const right = this.rawRight;
            this.savedRight = right;
            handlerArray.push(module.exports.playNote(this.steamController, 0, right || 0, right != null ? -1 : 0));
        }
        this.printKeyboard();

        return Promise.all(handlerArray)
            .then(() => {
                if(this.flag) {
                    return Promise.all([module.exports.playNote(this.steamController, 0, 0, 0),
                        module.exports.playNote(this.steamController, 1, 0, 0)])
                        .then(() => {
                            throw new Flag();
                        });
                }
            })
            .then(() => {
                return module.exports.sleep(10);
            })
            .then(this.start.bind(this))
    }

    stop() {
        this.flag = true;
    }

    reset() {
        this.flag = false;
    }



    printKeyboard() {
        reset();
        const leftChannel = this.left;
        const rightChannel = this.right;
        const leftChannelOctave = this.leftOctave;
        const rightChannelOctave = this.rightOctave;
        const sharps = ['#', ' ', '#', '#', ' ', '#', '#'];
        const flats = ['A','B','C','D','E','F','G'];
        const sharpsN = [1, 4, 6, 9, 11];
        const flatsN = [0, 2, 3, 5, 7, 8, 10];
        // Converts a note into the array position
        const noteToPos = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

        const lSharps = ['3', ' ', '5', '6', ' ', '8', '9'];
        const lFlats = ['W', 'E', 'R', 'T', 'Y', 'U', 'I'];

        const rSharps = ['S', ' ', 'F', 'G', ' ', 'J', 'K'];
        const rFlats = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

        if(!isNull(leftChannel)) {
            if(sharpsN.includes(leftChannel)) {
                lSharps[noteToPos[leftChannel]] = colors.red(lSharps[noteToPos[leftChannel]]);
            } else {
                lFlats[noteToPos[leftChannel]] = colors.red(lFlats[noteToPos[leftChannel]]);
            }
        }

        if(!isNull(rightChannel)) {
            if(sharpsN.includes(rightChannel)) {
                rSharps[noteToPos[rightChannel]] = colors.red(rSharps[noteToPos[rightChannel]]);
            } else {
                rFlats[noteToPos[rightChannel]] = colors.red(rFlats[noteToPos[rightChannel]]);
            }
        }

        const lLowerOctave = colors.grey((leftChannelOctave - 1 < 0 ? '' : '+') + (leftChannelOctave - 1));
        const lCurrentOctave = colors.white.bold((leftChannelOctave < 0 ? '' : '+') + leftChannelOctave);
        const lHigherOctave = colors.grey((leftChannelOctave + 1 < 0 ? '' : '+') + (leftChannelOctave + 1));

        const rLowerOctave = colors.grey((rightChannelOctave - 1 < 0 ? '' : '+') + (rightChannelOctave - 1));
        const rCurrentOctave = colors.white.bold((rightChannelOctave < 0 ? '' : '+') + rightChannelOctave);
        const rHigherOctave = colors.grey((rightChannelOctave + 1 < 0 ? '' : '+') + (rightChannelOctave + 1));

        const lKeyboard = STRING_CONSTANTS.THICK_LINE + '\n' +
            '|  |' + lSharps.join('|') + '| |\n' +
            '| |' + lFlats.join('|') + '|  |\n' +
            '|' + STRING_CONSTANTS.THIN_LINE + '|\n' +
            '|   ' + lLowerOctave + '   ' + lCurrentOctave + '   ' + lHigherOctave + '   |\n' +
            STRING_CONSTANTS.THICK_LINE;

        const rKeyboard = STRING_CONSTANTS.THICK_LINE + '\n' +
            '|  |' + rSharps.join('|') + '| |\n' +
            '| |' + rFlats.join('|') + '|  |\n' +
            '|' + STRING_CONSTANTS.THIN_LINE + '|\n' +
            '|   ' + rLowerOctave + '   ' + rCurrentOctave + '   ' + rHigherOctave + '   |\n' +
            STRING_CONSTANTS.THICK_LINE;

        const kKeyboard = STRING_CONSTANTS.THICK_LINE + '\n' +
            '|  |' + sharps.join('|') + '| |\n' +
            '| |' + flats.join('|') + '|  |\n' +
            STRING_CONSTANTS.THICK_LINE;

        console.log(`KEYS:\n${kKeyboard}\n`);
        console.log(`LEFT:\n${lKeyboard}\n`);
        console.log(`RIGHT:\n${rKeyboard}\n`);
    }
}

clear();
