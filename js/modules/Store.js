
export default class Store {
    constructor() {
        this.state = {
            voice: {
                count: 0,
                mode: 'free', // free, follow
                track: 'track1', // default track
                subMode: 'up', // up, down, timer
                target: 108,
                timer: 0
            },
            silent: {
                count: 0,
                subMode: 'up',
                target: 108,
                timer: 0
            },
            settings: {
                reminderInterval: 1000,
                reminderSound: 'bell',
                bgm: false
            }
        };
        this.load();
    }

    load() {
        const stored = localStorage.getItem('nianfo_state');
        if (stored) {
            this.state = JSON.parse(stored);
        }
    }

    save() {
        localStorage.setItem('nianfo_state', JSON.stringify(this.state));
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        this.state[key] = value;
        this.save();
    }

    logHistory(mode, amount = 1) {
        const today = new Date().toISOString().split('T')[0];
        if (!this.state.history) this.state.history = {};
        if (!this.state.history[today]) this.state.history[today] = { voice: 0, silent: 0 };

        this.state.history[today][mode] += amount;
        this.save();
    }

    getHistory() {
        return this.state.history || {};
    }

    getTotalCount() {
        const history = this.state.history || {};
        let total = 0;
        Object.values(history).forEach(day => {
            total += (day.voice || 0) + (day.silent || 0);
        });
        return total;
    }
}
