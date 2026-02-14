
import Store from './modules/Store.js';
import UI from './modules/UI.js';

import Counter from './modules/Counter.js';
import Speech from './modules/Speech.js';
import AudioPlayer from './modules/AudioPlayer.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Core Modules
    const store = new Store();
    const ui = new UI(store);
    const audio = new AudioPlayer(store);

    const counter = new Counter(store, {
        onUpdate: (count, timer) => {
            ui.updateDisplay(count, timer);

            // Check Milestones
            const total = store.getTotalCount();
            const milestones = [100, 1000, 2000, 5000, 10000];

            // We need to know if we JUST crossed it.
            // A simple way is to check if total equals a milestone.
            if (milestones.includes(total)) {
                // Prevent multiple alerts if multiple increments happen fast?
                // Alert is blocking, so maybe fine. 
                // Or better: show a custom notification.
                // For now, console log or alert.
                console.log("Milestone reached:", total);
                audio.playSFX('bell');
                // alert(`随喜赞叹！您已达成 ${total} 声佛号里程碑！`); 
                // Alert might be annoying if it interrupts chanting.
                // Let's just play sound and maybe show a toast if we had one.
                // Just play bell for now.
            }
        },
        onComplete: (reason) => {
            const settings = store.get('settings');

            if (reason === 'target_reached') {
                audio.playSFX('bell');
                alert('目标达成！');
            } else if (reason === 'timer_ended') {
                audio.playSFX('bell');
                alert('计时结束！');
            } else if (reason === 'interval_reached') {
                // Play specific reminder sound
                const sound = settings.reminderSound || 'bell';
                audio.playSFX(sound);
            }
        }
    });

    const speech = new Speech({
        onMatch: (count) => {
            // Increase counter by the number of matches found in the chunk
            for (let i = 0; i < count; i++) {
                counter.setMode('voice'); // Ensure context
                counter.increment();
            }
        },
        onError: (err) => ui.setStatus(`Error: ${err}`)
    });

    ui.bindCounter(counter);
    ui.bindVoiceControls({
        onStart: () => {
            speech.start();
            const voiceState = store.get('voice');

            // If follow mode, start audio
            if (voiceState.mode === 'follow') {
                audio.playChanting(voiceState.track);
            }

            // If timer sub-mode, start timer
            if (voiceState.subMode === 'timer') {
                // Duration is in minutes, convert to seconds
                const duration = (voiceState.timerDuration || 30) * 60;
                counter.setMode('voice');
                counter.startTimer(duration);
            }
        },
        onStop: () => {
            speech.stop();
            audio.stopChanting();
            counter.stopTimer();
        }
    });

    console.log("App Fully Initialized");

    // For debugging
    window.app = { store, ui, counter, speech, audio };
});
