
export default class AudioPlayer {
    constructor(store) {
        this.store = store;
        this.bgm = new Audio(); // Placeholder for BGM
        this.chanting = new Audio(); // Placeholder for Chanting
        this.sfx = {
            bell: new Audio('assets/bell.mp3'), // Placeholder path
            drum: new Audio('assets/drum.mp3')  // Placeholder path
        };

        // Load settings
        this.applySettings();
    }

    applySettings() {
        const settings = this.store.get('settings');
        // Apply volume, mute states etc.
        // this.bgm.loop = true;
    }

    playChanting(trackName) {
        // Stop any currently playing
        this.stopChanting();

        // Define tracks
        const tracks = {
            'track1': 'assets/chanting_male.mp3',
            'track2': 'assets/chanting_female.mp3',
            'track3': 'assets/chanting_chorus.mp3'
        };

        const src = tracks[trackName] || tracks['track1'];
        this.chanting.src = src;
        this.chanting.loop = true;

        this.chanting.play().catch(e => console.warn("Audio play failed (user interaction needed?):", e));
        console.log(`Playing chanting audio: ${src}`);
    }

    stopChanting() {
        this.chanting.pause();
        this.chanting.currentTime = 0;
    }

    playSFX(type) {
        if (this.sfx[type]) {
            // Clone to allow overlapping sounds
            const sound = this.sfx[type].cloneNode();
            sound.play().catch(e => console.warn("SFX play failed:", e));;
        }
    }
}
