
export default class Speech {
    constructor(callbacks) {
        this.onMatch = callbacks.onMatch || (() => { });
        this.onStart = callbacks.onStart || (() => { });
        this.onEnd = callbacks.onEnd || (() => { });
        this.onError = callbacks.onError || (() => { });

        this.recognition = null;
        this.isListening = false;
        this.targetPhrase = /阿弥陀佛/g;

        this.init();
    }

    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.onError('browser_not_supported');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'zh-CN';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.onStart();
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Auto-restart if we didn't explicitly stop logic
                try {
                    this.recognition.start();
                } catch (e) {
                    this.isListening = false;
                    this.onEnd();
                }
            } else {
                this.onEnd();
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'no-speech') return;
            console.error('Speech error:', event.error);
            this.isListening = false; // Reset state on error 
            this.onError(event.error);
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript.length > 0) {
                const matches = finalTranscript.match(this.targetPhrase);
                if (matches) {
                    this.onMatch(matches.length);
                }
            }
        };
    }

    start() {
        if (!this.recognition) return;
        try {
            this.isListening = true;
            this.recognition.start();
        } catch (e) {
            console.error(e);
        }
    }

    stop() {
        if (!this.recognition) return;
        this.isListening = false;
        this.recognition.stop();
    }
}
