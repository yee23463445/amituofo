export default class Stats {
    constructor(store) {
        this.store = store;
        this.chart = null;
    }

    // Main entry point to render stats for a specific range
    render(range, ctx) {
        const data = this.processData(range);
        this.updateSummary(data.summary);
        this.renderChart(ctx, data.chartData, range);
        this.renderMilestones();
    }

    updateSummary(summary) {
        const voiceEl = document.getElementById('stat-voice-val');
        const silentEl = document.getElementById('stat-silent-val');
        const totalEl = document.getElementById('stat-total-val');

        if (voiceEl) voiceEl.textContent = summary.voice;
        if (silentEl) silentEl.textContent = summary.silent;
        if (totalEl) totalEl.textContent = summary.total;
    }

    processData(range) {
        const history = this.store.getHistory(); // { "2023-10-27": { voice: 10, silent: 5 } }
        const today = new Date();

        let labels = [];
        let voiceData = [];
        let silentData = [];
        let summary = { voice: 0, silent: 0, total: 0 };

        if (range === 'day') {
            const dateStr = today.toISOString().split('T')[0];
            const dayData = history[dateStr] || { voice: 0, silent: 0 };

            labels = ['今日'];
            voiceData = [dayData.voice];
            silentData = [dayData.silent];

            summary.voice = dayData.voice;
            summary.silent = dayData.silent;
        }
        else if (range === 'week') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const dayData = history[dateStr] || { voice: 0, silent: 0 };

                labels.push(`${d.getMonth() + 1}-${d.getDate()}`);
                voiceData.push(dayData.voice);
                silentData.push(dayData.silent);

                summary.voice += dayData.voice;
                summary.silent += dayData.silent;
            }
        }
        else if (range === 'month') {
            const year = today.getFullYear();
            const month = today.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const dayData = history[dateStr] || { voice: 0, silent: 0 };

                labels.push(`${i}`);
                voiceData.push(dayData.voice);
                silentData.push(dayData.silent);

                summary.voice += dayData.voice;
                summary.silent += dayData.silent;
            }
        }
        else if (range === 'year') {
            const year = today.getFullYear();
            const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

            labels = months;

            for (let m = 0; m < 12; m++) {
                let mVoice = 0;
                let mSilent = 0;
                const prefix = `${year}-${String(m + 1).padStart(2, '0')}`;

                Object.keys(history).forEach(date => {
                    if (date.startsWith(prefix)) {
                        mVoice += history[date].voice || 0;
                        mSilent += history[date].silent || 0;
                    }
                });

                voiceData.push(mVoice);
                silentData.push(mSilent);

                summary.voice += mVoice;
                summary.silent += mSilent;
            }
        }

        summary.total = summary.voice + summary.silent;

        return {
            summary,
            chartData: {
                labels,
                datasets: [
                    {
                        label: '语音',
                        data: voiceData,
                        backgroundColor: '#c8aa6e',
                        borderRadius: 4
                    },
                    {
                        label: '默念',
                        data: silentData,
                        backgroundColor: '#8b7d6b',
                        borderRadius: 4
                    }
                ]
            }
        };
    }

    renderChart(ctx, data, range) {
        if (this.chart) {
            this.chart.destroy();
        }

        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: "'Noto Serif SC', serif" }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        stacked: true
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        stacked: true
                    }
                }
            }
        };

        this.chart = new Chart(ctx, config);
    }

    renderMilestones() {
        const container = document.getElementById('milestones-list');
        if (!container) return;

        const total = this.store.getTotalCount();
        const milestones = [
            { count: 100, label: '初发心', locked: 'assets/milestones/m1_locked.png', unlocked: 'assets/milestones/m1_unlocked.png' },
            { count: 1000, label: '精进心', locked: 'assets/milestones/m2_locked.png', unlocked: 'assets/milestones/m2_unlocked.png' },
            { count: 2000, label: '不退心', locked: 'assets/milestones/m3_locked.png', unlocked: 'assets/milestones/m3_unlocked.png' },
            { count: 5000, label: '圆满心', locked: 'assets/milestones/m4_locked.png', unlocked: 'assets/milestones/m4_locked.png' },
            { count: 10000, label: '大愿心', locked: 'assets/milestones/m5_locked.png', unlocked: 'assets/milestones/m5_unlocked.png' }
        ];

        container.innerHTML = '';

        milestones.forEach(m => {
            const isUnlocked = total >= m.count;
            const item = document.createElement('div');
            item.className = `milestone-item ${isUnlocked ? 'unlocked' : ''}`;

            const imgSrc = isUnlocked ? m.unlocked : m.locked;
            const progress = isUnlocked ? `已解锁` : `念佛 ${total}/${m.count} 解锁`;

            item.innerHTML = `
                <div class="milestone-badge">
                    <img src="${imgSrc}" alt="${m.label}">
                </div>
                <div class="milestone-name">${m.label}</div>
                <div class="milestone-desc">${progress}</div>
            `;
            container.appendChild(item);
        });
    }
}
