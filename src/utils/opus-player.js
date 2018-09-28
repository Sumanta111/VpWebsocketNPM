/* eslint-disable */

export default class OpusPlayer {
    constructor(option) {
        this.config = {
            channels: 1,
            sampleRate: 16000
        };
        Object.assign(this.config, option);
        this.samples = new Float32Array();
        this.mergeBuffer = this.mergeBuffer.bind(this);
        this.initContext();
        this.initWorker();
    }
    initContext() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = 1;
        this.gainNode.connect(this.audioCtx.destination);
    }
    volume(volume) {
        this.gainNode.gain.value = volume;
    }
    initWorker() {
        this.worker = new Worker('worker/decoder.js');
        this.worker.onmessage = (e) => {
            switch (e.data.type) {
                case 'error' :
                    console.log('decoding error ' + e.data.error);
                    break;
                case 'data' :
                    this.mergeBuffer(e.data.payload);
                    break;
                default:
            }
        };

        this.worker.postMessage({
            type: 'init',
            config: {
                sampleRate: this.config.sampleRate,
                channels: this.config.channels
            }
        });
    }
    feed(buffer) {
        this.worker.postMessage({
            type: 'decode',
            buffer: buffer
        });
        this.play();
    }
    play() {
        console.log('length is : '+this.samples.length);
        if (!this.samples.length) return;
        
        var bufferSource = this.audioCtx.createBufferSource(),
            length = this.samples.length / this.config.channels,
            audioBuffer = this.audioCtx.createBuffer(this.config.channels, length, this.config.sampleRate),
            audioData,
            channel,
            offset,
            i;

        for (channel = 0; channel < this.config.channels; channel++) {
            audioData = audioBuffer.getChannelData(channel);
            offset = channel;
            for (i = 0; i < length; i++) {
                audioData[i] = this.samples[offset];
                offset += this.config.channels;
            }
        }
        
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(this.gainNode);
        bufferSource.start(0);
        this.reset();
        /* keep a ref so we can stop it in middle of playing */
        this.bufferSource = bufferSource;
    }
    stop() {
        if (this.bufferSource) {
            this.bufferSource.disconnect();
            this.bufferSource.stop(0);
            this.bufferSource = null;
        }
    }
    getPCMBuffer() {
        return this.samples;
    }
    reset() {
        this.samples = new Float32Array();
    }
    mergeBuffer(buffer) {
        let tmp = new Float32Array((this.samples.length|0) + (buffer.length|0));
        tmp.set(this.samples, 0);
        tmp.set(buffer, this.samples.length|0);
        this.samples = tmp;
    }
    destroy() {
        if (this.worker) {
            this.worker.postMessage({
                type: 'destroy'
            });
            this.worker = null;
        }
        this.samples = null;
        this.audioCtx.close();
        this.audioCtx = null;
        this.gainNode = null;
        this.bufferSource = null;
    }
}