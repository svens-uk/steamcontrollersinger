const usb = require('usb');
const Promise = require('bluebird');
const handler = require('./handler.js');
const keyboard = require('./keyboard.js');

// usb.setDebugLevel(4);

const DEBUG = false;

// Steam controller object
class SteamControllerInfos {
    get devHandle() {
        return this.iDevHandle;
    }
    set devHandle(dH) {
        this.iDevHandle = dH;
    }

    get interfaceNum() {
        return this.iInterfaceNum
    }
    set interfaceNum(iN) {
        this.iInterfaceNum = iN
    }
}

const SteamController = {
    openAndClaim: function() {
        let controller = new SteamControllerInfos();

        let devHandle;
        //Open Steam Controller device
        if((devHandle = usb.findByIds(0x28DE, 0x1102)) != null){ // Wired Steam Controller
//            console.log('Found wired Steam Controller');
            controller.devHandle = devHandle;
            controller.interfaceNum = 2;
        }
        else if((devHandle = usb.findByIds(0x28DE, 0x1142)) != null){ // Steam Controller dongle
//            console.log('Found Steam Dongle, will attempt to use the first Steam Controller');
            controller.devHandle = devHandle;
            controller.interfaceNum = 1;
        }
        else{
            console.log('No device found');
            return false;
        }

        controller.devHandle.open();

        //On Linux, detach the module if needed
        if(controller.devHandle.__isKernelDriverActive(1)) {
            controller.devHandle.__detachKernelDriver(1);
        }
        if(controller.devHandle.__isKernelDriverActive(2)) {
            controller.devHandle.__detachKernelDriver(2);
        }

        //Claim the USB interface controlling the haptic actuators
        try {
            let r = controller.devHandle.interface(controller.interfaceNum);
            r.claim();
        } catch(e) {
            console.error(e);
            controller.devHandle.close();
            return;
        }
        return controller;
    },
    close: function(controller) {
        controller.devHandle.interface(controller.interfaceNum).release((error) => {
            if(!controller.devHandle.__isKernelDriverActive(1)) {
                controller.devHandle.__attachKernelDriver(1);
            }
            if(!controller.devHandle.__isKernelDriverActive(2)) {
                controller.devHandle.__attachKernelDriver(2);
            }
            controller.devHandle.close();
        });
    }
}

const steamController = SteamController.openAndClaim();

// handler.playNote(steamController, 0, 32, NOTE_LENGTH)
//     .then(() => {
//         return new Promise((resolve, reject) => {
//             setTimeout(resolve, NOTE_LENGTH * MILLISECONDS);
//         });
//     })
//     .then(() => {
//         console.log('Done!');
//     })
//     .catch(console.error)
//     .then(() => {
//         return SteamController.close(steamController);
//     })
//     .catch(console.error);

const noteHandler = new handler.NoteHandler(steamController);

noteHandler.start.bind(noteHandler)()
    .catch((error) => {
        if(DEBUG) {
            console.error(error);
        }
    })
    .finally(() => {
        SteamController.close(steamController);
        process.exit();
    });

keyboard(noteHandler);

// noteHandler.left = 6;
//
//
// handler.sleep(300)
//     .then(() => noteHandler.left = 2)
//     .then(() => handler.sleep(300))
//     .then(() => noteHandler.right = 0)
//     .then(() => handler.sleep(250))
//     .then(() => noteHandler.left = 5)
//     .then(() => noteHandler.right = 11)
//     .then(() => handler.sleep(250))
//     .then(() => noteHandler.leftOctave = 3)
//     .then(() => noteHandler.rightOctave = 1)
//     .then(() => handler.sleep(200))
//     .then(() => {
//         return noteHandler.stop();
//     })
//     .catch(console.error);
