const keypress = require("keypress");

keypress(process.stdin);

const KEY_TO_VALUE = {
    // left
    'W': {
        note: 0,
        side: 'left'
    },
    '3': {
        note: 1,
        side: 'left'
    },
    'E': {
        note: 2,
        side: 'left'
    },
    'R': {
        note: 3,
        side: 'left'
    },
    '5': {
        note: 4,
        side: 'left'
    },
    'T': {
        note: 5,
        side: 'left'
    },
    '6': {
        note: 6,
        side: 'left'
    },
    'Y': {
        note: 7,
        side: 'left'
    },
    'U': {
        note: 8,
        side: 'left'
    },
    '8': {
        note: 9,
        side: 'left'
    },
    'I': {
        note: 10,
        side: 'left'
    },
    '9': {
        note: 11,
        side: 'left'
    },

    // right
    'Z': {
        note: 0,
        side: 'right'
    },
    'S': {
        note: 1,
        side: 'right'
    },
    'X': {
        note: 2,
        side: 'right'
    },
    'C': {
        note: 3,
        side: 'right'
    },
    'F': {
        note: 4,
        side: 'right'
    },
    'V': {
        note: 5,
        side: 'right'
    },
    'G': {
        note: 6,
        side: 'right'
    },
    'B': {
        note: 7,
        side: 'right'
    },
    'N': {
        note: 8,
        side: 'right'
    },
    'J': {
        note: 9,
        side: 'right'
    },
    'M': {
        note: 10,
        side: 'right'
    },
    'K': {
        note: 11,
        side: 'right'
    },

    // octave changes
    '-': {
        note: 'octave',
        octave: 1,
        side: 'left'
    },
    'P': {
        note: 'octave',
        octave: -1,
        side: 'left'
    },
    ';': {
        note: 'octave',
        octave: 1,
        side: 'right'
    },
    '.': {
        note: 'octave',
        octave: -1,
        side: 'right'
    },

    // key resets
    'O': {
        note: 'reset',
        side: 'left'
    },
    ',': {
        note: 'reset',
        side: 'right'
    }
}

module.exports = function(noteHandler) {
    this.noteHandler = noteHandler;

    // We need to exit when the user does control + c
    process.stdin.on('keypress', (ch, key) => {
        // Something isn't right if ch is undefined/null etc
        if(!ch) {
            return;
        }
        // Check if the user is trying to quit
        if(key && key.name === "c" && key.ctrl){
            this.noteHandler.stop();
        } else {
            if(Object.keys(KEY_TO_VALUE).includes(ch.toUpperCase())) {
                const note = KEY_TO_VALUE[ch.toUpperCase()];

                // Octaves (unconditional change)
                if(note.note === 'octave') {
                    if(note.side === 'left') {
                        this.noteHandler.changeLeftOctave(note.octave);
                    } else {
                        this.noteHandler.changeRightOctave(note.octave);
                    }
                }

                // Resets
                else if(note.note === 'reset') {
                    if(note.side === 'left') {
                        this.noteHandler.left = null;
                    } else {
                        this.noteHandler.right = null;
                    }
                }

                // Notes
                else {
                    if(note.side === 'left') {
                        this.noteHandler.left = note.note;
                    } else {
                        this.noteHandler.right = note.note;
                    }
                }
            }
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
}
