
export default class Counter {
    constructor(store, callbacks) {
        this.store = store;
        this.onUpdate = callbacks.onUpdate || (() => { });
        this.onComplete = callbacks.onComplete || (() => { });

        this.timerInterval = null;
        this.isActive = false;

        // Internal state (synced with store on load, but kept hot here)
        this.currentMode = null; // 'voice' or 'silent'
    }

    setMode(mode) {
        this.currentMode = mode;
    }

    // Main action trigger (button click or voice detection)
    increment() {
        if (!this.currentMode) return;

        const state = this.store.get(this.currentMode);
        const subMode = state.subMode;

        if (subMode === 'down') {
            if (state.count > 0) {
                state.count--;
                this.store.set(this.currentMode, state);
                this.onUpdate(state.count);
                if (state.count === 0) {
                    this.onComplete('target_reached');
                }
            }
        } else if (subMode === 'timer') {
            // within timer mode, we just count up if timer is running
            if (this.isActive) {
                state.count++;
                this.store.set(this.currentMode, state);
                this.onUpdate(state.count);
            }
        } else {
            // Default Up
            state.count++;
            this.store.set(this.currentMode, state);
            this.onUpdate(state.count);
        }

        // Log to history
        this.store.logHistory(this.currentMode, 1);

        // Reminder Logic
        const settings = this.store.get('settings');
        if (settings && settings.reminderEnabled && state.count > 0 && settings.reminderInterval > 0) {
            if (state.count % settings.reminderInterval === 0) {
                this.onComplete('interval_reached');
            }
        }
    }

    startTimer(durationSeconds) {
        if (this.timerInterval) clearInterval(this.timerInterval);

        let remaining = durationSeconds;
        this.isActive = true;

        this.timerInterval = setInterval(() => {
            remaining--;
            if (this.onUpdate) this.onUpdate(null, remaining); // Update timer display

            if (remaining <= 0) {
                this.stopTimer();
                this.onComplete('timer_ended');
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.isActive = false;
    }

    reset() {
        if (!this.currentMode) return;
        const state = this.store.get(this.currentMode);

        // Logic differs by sub-mode
        if (state.subMode === 'down') {
            state.count = state.target;
        } else {
            state.count = 0;
        }

        this.store.set(this.currentMode, state);
        this.onUpdate(state.count);
    }
}
