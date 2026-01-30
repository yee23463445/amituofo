document.addEventListener('DOMContentLoaded', () => {
    const counterDisplay = document.getElementById('counter');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resetBtn = document.getElementById('reset-btn');
    const statusText = document.getElementById('status-text');
    const visualizer = document.querySelector('.visualizer');

    let count = 0;
    let isListening = false;
    let recognition;

    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        statusText.textContent = "您的浏览器不支持语音识别，请使用 Chrome。";
        startBtn.disabled = true;
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    // Regex to match "阿弥陀佛" and its variants slightly loosely if needed
    // Simple match for the 4 characters
    const TARGET_PHRASE = /阿弥陀佛/g;

    // To handle continuous stream processing without double counting
    // We will track the length of the transcript we have processed
    let processedLength = 0;

    recognition.onstart = () => {
        isListening = true;
        statusText.textContent = "正在聆听...";
        visualizer.classList.add('active');
        startBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
        stopBtn.disabled = false;
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            // Ignore no-speech errors, just stay listing
            return;
        }
        console.error("Speech recognition error", event.error);
        statusText.textContent = "发生错误: " + event.error;
        stopListening();
    };

    recognition.onend = () => {
        if (isListening) {
            // If it stopped but we didn't ask it to, restart it (keep alive)
            try {
                recognition.start();
            } catch (e) {
                console.log("Restart error", e);
                stopListening();
            }
        } else {
            stopListening();
        }
    };

    recognition.onresult = (event) => {
        let currentTranscript = '';
        
        // Assemble the transcript from results
        // We only care about the latest result index usually in continuous mode
        // But to be safe we scan the whole session logic or just the new parts
        
        // Strategy: Concatenate all 'final' results + current 'interim'
        // But simpler strategy for '阿弥陀佛' counting:
        // Just count occurrences in the NEW fragments.
        
        // However, standard API behavior: 
        // event.results contains a list of SpeechRecognitionResult objects.
        // Some are final, some are interim.
        
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // We process only the FINAL results to avoid double counting from interim flux.
        // Or, if we want "Real-time" speed, we can try to parse interim, 
        // but interim changes frequently. 
        // For "Amituofo", it's short. Waiting for final is usually safer and still fast enough (~1-2s delay).
        // Let's try processing FINAL only first for accuracy.
        
        if (finalTranscript.length > 0) {
            const matches = finalTranscript.match(TARGET_PHRASE);
            if (matches) {
                const newCount = matches.length;
                updateCounter(newCount);
            }
        }
    };
    
    // Improved Strategy for Real-time (Active Interm Counting):
    // To make it feel "real-time", we can parse the full transcript string of the current session?
    // The reliable way for a simple phrase counter is often creating a new recognition session 
    // or just parsing the stream carefully. 
    // Let's stick to the event.resultIndex approach but refine logic to just count what we see in `final` results for stability.
    // If user wants faster feedback, we might check interim, but "阿弥陀佛" can be misheard as "阿弥..." then corrected.
    
    function updateCounter(increment) {
        count += increment;
        counterDisplay.textContent = count;
        
        // Animation effect
        counterDisplay.classList.remove('pulse');
        void counterDisplay.offsetWidth; // trigger reflow
        counterDisplay.classList.add('pulse');
    }

    function startListening() {
        try {
            recognition.start();
        } catch (e) {
            console.error(e);
        }
    }

    function stopListening() {
        isListening = false;
        statusText.textContent = "已暂停";
        visualizer.classList.remove('active');
        startBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
        recognition.stop();
    }

    startBtn.addEventListener('click', startListening);
    
    stopBtn.addEventListener('click', () => {
        isListening = false; // Flag to prevent auto-restart
        recognition.stop();
    });

    resetBtn.addEventListener('click', () => {
        count = 0;
        counterDisplay.textContent = 0;
    });
});
