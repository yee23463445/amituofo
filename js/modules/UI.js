
import Stats from './Stats.js';

export default class UI {
    constructor(store) {
        this.store = store;
        this.stats = new Stats(store);
        this.isCounting = false;
        this.isPaused = false;
        this.pendingAction = null;
        this.elements = {
            tabs: document.querySelectorAll('.tab-btn'),
            views: document.querySelectorAll('.view'),
            voiceSubMode: document.getElementById('voice-sub-mode'),
            silentSubMode: document.getElementById('silent-sub-mode'),
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            closeSettingsBtn: document.getElementById('close-settings-btn'),
            settingTarget: document.getElementById('setting-target-count'),
            settingTimer: document.getElementById('setting-timer-duration'),
            statsBtn: document.getElementById('stats-btn'),
            statsModal: document.getElementById('stats-modal'),
            closeStatsBtn: document.getElementById('close-stats-btn'),
            statTodayVoice: document.getElementById('stat-today-voice'),
            statTodaySilent: document.getElementById('stat-today-silent'),
            statTotal: document.getElementById('stat-total'),
        };

        this.initEventListeners();
        this.bindSettings();
        this.bindStats();
        this.bindConfirmSwitch();
        this.render();
    }

    initEventListeners() {
        // Tab Switching with confirmation check
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.confirmIfCounting(() => this.switchTab(targetTab));
            });
        });

        // Mode Switching Listeners
        if (this.elements.voiceSubMode) {
            this.elements.voiceSubMode.addEventListener('change', (e) => {
                console.log('Voice sub-mode changed:', e.target.value);
            });
        }

        if (this.elements.silentSubMode) {
            this.elements.silentSubMode.addEventListener('change', (e) => {
                console.log('Silent sub-mode changed:', e.target.value);
            });
        }

        // Mode Buttons (Free vs Follow)
        const modeBtns = document.querySelectorAll('.mode-btn');
        const trackSelect = document.getElementById('voice-track-select');

        modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.confirmIfCounting(() => {
                    const state = this.store.get('voice');
                    state.mode = mode;
                    this.store.set('voice', state);

                    modeBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');

                    if (mode === 'follow') {
                        trackSelect.classList.remove('hidden');
                    } else {
                        trackSelect.classList.add('hidden');
                    }
                });
            });
        });

        // Track Selector
        if (trackSelect) {
            trackSelect.addEventListener('change', (e) => {
                const state = this.store.get('voice');
                state.track = e.target.value;
                this.store.set('voice', state);
            });
        }
    }

    bindSettings() {
        const { settingsBtn, settingsModal, closeSettingsBtn, settingTarget, settingTimer } = this.elements;
        const saveBtn = document.getElementById('save-settings-btn');
        const cancelBtn = document.getElementById('cancel-settings-btn');

        const settingReminderEnabled = document.getElementById('setting-reminder-enabled');
        const settingReminderInterval = document.getElementById('setting-reminder-interval');
        const settingReminderSound = document.getElementById('setting-reminder-sound');

        const openSettings = () => {
            const settings = this.store.get('settings');
            const voiceState = this.store.get('voice');

            if (settingTarget) settingTarget.value = voiceState.target || 108;
            if (settingTimer) settingTimer.value = voiceState.timerDuration || 30;

            if (settingReminderEnabled) settingReminderEnabled.checked = settings.reminderEnabled || false;
            if (settingReminderInterval) settingReminderInterval.value = settings.reminderInterval || 1000;
            if (settingReminderSound) settingReminderSound.value = settings.reminderSound || 'bell';

            settingsModal.classList.remove('hidden');
        };

        const closeSettings = () => {
            settingsModal.classList.add('hidden');
        };

        const saveSettings = () => {
            const voiceState = this.store.get('voice');
            if (settingTarget) voiceState.target = parseInt(settingTarget.value);
            if (settingTimer) voiceState.timerDuration = parseInt(settingTimer.value);
            this.store.set('voice', voiceState);

            const silentState = this.store.get('silent');
            if (settingTarget) silentState.target = parseInt(settingTarget.value);
            if (settingTimer) silentState.timerDuration = parseInt(settingTimer.value);
            this.store.set('silent', silentState);

            const settings = this.store.get('settings') || {};
            if (settingReminderEnabled) settings.reminderEnabled = settingReminderEnabled.checked;
            if (settingReminderInterval) settings.reminderInterval = parseInt(settingReminderInterval.value);
            if (settingReminderSound) settings.reminderSound = settingReminderSound.value;
            this.store.set('settings', settings);

            this.render();
            closeSettings();
        };

        if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
        if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
        if (cancelBtn) cancelBtn.addEventListener('click', closeSettings);
        if (saveBtn) saveBtn.addEventListener('click', saveSettings);
    }

    bindStats() {
        const { statsBtn, statsModal, closeStatsBtn } = this.elements;

        if (statsBtn) {
            statsBtn.addEventListener('click', () => {
                if (!this.stats) {
                    // Stats should already be initialized
                }
                statsModal.classList.remove('hidden');
                this.updateStatsView('day');
            });
        }

        const tabs = document.querySelectorAll('.stat-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.updateStatsView(e.target.dataset.range);
            });
        });

        if (closeStatsBtn) {
            closeStatsBtn.addEventListener('click', () => {
                statsModal.classList.add('hidden');
            });
        }
    }

    updateStatsView(range) {
        const ctx = document.getElementById('stats-chart');
        if (this.stats && ctx) {
            this.stats.render(range, ctx);
        }
    }

    switchTab(tabName) {
        // Stop any active voice/counting session
        if (this.voiceCallbacks) {
            this.voiceCallbacks.onStop();
        }
        this.isCounting = false;
        this.isPaused = false;

        // Reset voice button states
        const startBtn = document.getElementById('voice-start-btn');
        const stopBtn = document.getElementById('voice-stop-btn');
        const pausedControls = document.getElementById('voice-paused-controls');
        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        if (pausedControls) pausedControls.classList.add('hidden');
        this.setVisualizerActive(false);
        this.setStatus('点击"开始"启动监听');

        // Update Tabs
        this.elements.tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');

                if (this.counter) {
                    this.counter.stopTimer();
                    this.counter.setMode(tabName);
                    this.counter.reset();
                }
            } else {
                tab.classList.remove('active');
            }
        });

        // Update Views
        this.elements.views.forEach(view => {
            if (view.id === `${tabName}-view`) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });
    }

    confirmIfCounting(action) {
        if (this.isCounting || this.isPaused) {
            this.pendingAction = action;
            document.getElementById('confirm-switch-modal').classList.remove('hidden');
        } else {
            action();
        }
    }

    bindConfirmSwitch() {
        const modal = document.getElementById('confirm-switch-modal');
        const okBtn = document.getElementById('confirm-switch-ok');
        const cancelBtn = document.getElementById('confirm-switch-cancel');

        if (okBtn) {
            okBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                if (this.pendingAction) {
                    this.pendingAction();
                    this.pendingAction = null;
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                this.pendingAction = null;
            });
        }
    }

    bindVoiceControls(callbacks) {
        this.voiceCallbacks = callbacks;
        const startBtn = document.getElementById('voice-start-btn');
        const stopBtn = document.getElementById('voice-stop-btn');
        const pausedControls = document.getElementById('voice-paused-controls');
        const resumeBtn = document.getElementById('voice-resume-btn');
        const restartBtn = document.getElementById('voice-restart-btn');

        // Start: begin counting
        startBtn.addEventListener('click', () => {
            callbacks.onStart();
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            pausedControls.classList.add('hidden');
            this.isCounting = true;
            this.isPaused = false;
            this.setVisualizerActive(true);
            this.setStatus('正在聆听...');
        });

        // Pause: show Continue + Restart
        stopBtn.addEventListener('click', () => {
            callbacks.onStop();
            stopBtn.classList.add('hidden');
            startBtn.classList.add('hidden');
            pausedControls.classList.remove('hidden');
            this.isPaused = true;
            this.setVisualizerActive(false);
            this.setStatus('已暂停');
        });

        // Resume: continue counting without resetting
        resumeBtn.addEventListener('click', () => {
            callbacks.onStart();
            pausedControls.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            this.isPaused = false;
            this.setVisualizerActive(true);
            this.setStatus('正在聆听...');
        });

        // Restart: reset counter and start fresh
        restartBtn.addEventListener('click', () => {
            if (this.counter) {
                this.counter.setMode('voice');
                this.counter.reset();
            }
            callbacks.onStart();
            pausedControls.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            this.isPaused = false;
            this.setVisualizerActive(true);
            this.setStatus('正在聆听...');
        });
    }

    setVisualizerActive(active) {
        const visualizer = document.querySelector('.visualizer');
        if (visualizer) {
            if (active) {
                visualizer.classList.add('active');
            } else {
                visualizer.classList.remove('active');
            }
        }
    }

    setStatus(text) {
        const el = document.getElementById('status-text');
        if (el) el.textContent = text;
    }


    bindCounter(counter) {
        this.counter = counter;

        // Silent Mode Touch Button
        const silentBtn = document.getElementById('silent-touch-btn');
        if (silentBtn) {
            silentBtn.addEventListener('click', () => {
                this.counter.setMode('silent');
                this.isCounting = true; // Mark as counting for silent mode too

                const state = this.store.get('silent');
                if (state.subMode === 'timer' && !this.counter.isActive) {
                    const duration = (state.timerDuration || 30) * 60;
                    this.counter.startTimer(duration);
                }

                this.counter.increment();
                silentBtn.classList.add('active');
                setTimeout(() => silentBtn.classList.remove('active'), 100);
            });
        }

        // Bind Sub-mode selectors to update store and reset counter context
        const updateSubMode = (mode, val) => {
            const state = this.store.get(mode);
            state.subMode = val;
            this.store.set(mode, state);

            this.counter.setMode(mode);
            this.counter.stopTimer();
            this.counter.reset();

            this.render();
        }

        if (this.elements.voiceSubMode) {
            this.elements.voiceSubMode.addEventListener('change', (e) => {
                const val = e.target.value;
                const prevVal = this.store.get('voice').subMode;
                this.confirmIfCounting(() => updateSubMode('voice', val));
                // If cancelled, revert select to previous value
                if (this.pendingAction) {
                    e.target.value = prevVal;
                }
            });
        }
        if (this.elements.silentSubMode) {
            this.elements.silentSubMode.addEventListener('change', (e) => {
                const val = e.target.value;
                const prevVal = this.store.get('silent').subMode;
                this.confirmIfCounting(() => updateSubMode('silent', val));
                if (this.pendingAction) {
                    e.target.value = prevVal;
                }
            });
        }
    }

    updateDisplay(count, timerValue) {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

        if (count !== null && count !== undefined) {
            const display = document.getElementById(`${activeTab}-counter`);
            if (display) display.textContent = count;
        }

        if (timerValue !== null && timerValue !== undefined) {
            const timerDisplay = document.getElementById(`${activeTab}-timer-display`);
            if (timerDisplay) {
                const m = Math.floor(timerValue / 60).toString().padStart(2, '0');
                const s = (timerValue % 60).toString().padStart(2, '0');
                timerDisplay.textContent = `${m}:${s}`;
                timerDisplay.classList.remove('hidden');
            }
        }
    }

    render() {
        ['voice', 'silent'].forEach(mode => {
            const state = this.store.get(mode);

            const select = document.getElementById(`${mode}-sub-mode`);
            if (select) select.value = state.subMode;

            const display = document.getElementById(`${mode}-counter`);
            if (display) display.textContent = state.count;

            const timerDisplay = document.getElementById(`${mode}-timer-display`);
            if (state.subMode === 'timer') {
                if (timerDisplay) {
                    timerDisplay.classList.remove('hidden');
                    const m = (state.timerDuration || 30).toString().padStart(2, '0');
                    if (timerDisplay.textContent === '00:00:00' || timerDisplay.textContent === '0') {
                        timerDisplay.textContent = `${m}:00`;
                    }
                }
            } else {
                if (timerDisplay) timerDisplay.classList.add('hidden');
            }

            if (mode === 'voice') {
                const modeBtns = document.querySelectorAll('.mode-btn');
                const trackSelect = document.getElementById('voice-track-select');

                modeBtns.forEach(btn => {
                    if (btn.dataset.mode === state.mode) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                if (trackSelect) {
                    trackSelect.value = state.track || 'track1';
                    if (state.mode === 'follow') {
                        trackSelect.classList.remove('hidden');
                    } else {
                        trackSelect.classList.add('hidden');
                    }
                }
            }
        });
    }
}
