import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1';

// Disable sending telemetry if helpful
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;

self.addEventListener('message', async (event) => {
    const { type, model, audioData, options, lang } = event.data;

    if (type === 'load') {
        try {
            if (!transcriber || transcriber._modelId !== model) {
                transcriber = await pipeline(
                    'automatic-speech-recognition',
                    model,
                    {
                        dtype: 'q8',
                        device: 'wasm',
                        progress_callback: (progress) => {
                            self.postMessage({ type: 'progress', data: progress });
                        }
                    }
                );
                transcriber._modelId = model;
            }
            self.postMessage({ type: 'ready' });
        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
    } else if (type === 'transcribe') {
        try {
            const result = await transcriber(audioData, options);
            self.postMessage({ type: 'result', data: result });
        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
});
