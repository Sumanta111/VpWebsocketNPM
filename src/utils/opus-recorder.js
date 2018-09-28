/* eslint-disable */

export default class OpusRecorder {
    constructor(option) {
        this.config = {
            bufferSize: 2048,
            frameDuration: 20,
            sampleRate: 48000
        };
        Object.assign(this.config, option);
        this.recording = false;
        if (typeof this.config.onEncode !== 'function') {
            this.config.onEncode = function() {};
        }

        if (!navigator.mediaDevices) {
             throw new Error("Recording is not supported in this browser");
        }

        this.onAudioProcess = this.onAudioProcess.bind(this);

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
                this.initContext(stream);
                this.initWorker();
            });
        } else {
            navigator.getUserMedia = navigator.getUserMedia
                            || navigator.webkitGetUserMedia
                            || navigator.mozGetUserMedia;

            navigator.getUserMedia({ audio: true, video: false }, (stream) => {
                this.initContext(stream);
                this.initWorker();
            });
        }
    }
    initContext(stream) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.source = this.audioCtx.createMediaStreamSource(stream);
        this.node = this.audioCtx.createScriptProcessor(this.config.bufferSize, 1, 1);
        this.node.onaudioprocess = this.onAudioProcess;
        this.source.connect(this.node);
        this.node.connect(this.audioCtx.destination);
    }
    onAudioProcess(event) {
        if (!this.recording) return;

        let inputBuffer = event.inputBuffer;
        let noOfChannels = inputBuffer.numberOfChannels;
        let samplesPerChannel = inputBuffer.getChannelData(0).length;
        let buffer = new Float32Array(noOfChannels * samplesPerChannel);

        for (let i = 0; i < noOfChannels; ++i) {
            let channelData = inputBuffer.getChannelData(i);
            for (let j = 0; j < samplesPerChannel; ++j) {
                buffer[j * noOfChannels + i] = channelData[j];
            }
        }

        this.worker.postMessage({
            type: 'encode',
            buffer: buffer
        });
    }
    initWorker() {
        const cb = this.config.onEncode;
        this.worker = new Worker('worker/encoder.js');
        this.worker.onmessage = (e) => {
            switch (e.data.type) {
                case 'error' :
                    console.log('encoding error ' + e.data.error);
                    break;
                case 'data' :
                    cb(e.data.payload);
                    break;
                default:
            }
        };
        this.worker.postMessage({
            type: 'init',
            config: {
                application: 2049, /* 2049 = audio, 2048 = VoIP*/
                frameDuration: this.config.frameDuration,
                originalRate: this.audioCtx.sampleRate, 
                sampleRate: this.config.sampleRate,
                channels: this.node.channelCount,
                params: {
                    cbr: true
                }
            }
        });
    }
    start() {
        this.recording = true;
    }
    stop() {
        this.recording = false;
    }
    destroy() {
        if (this.worker) {
            this.worker.postMessage({
                type: 'destroy'
            });
            this.worker = null;
        }
        this.audioCtx.close();
        this.audioCtx = null;
    }
}