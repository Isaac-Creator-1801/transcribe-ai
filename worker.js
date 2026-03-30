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
                // Tenta ativar a Placa de Vídeo (WebGPU) do celular para acelerar em 10x a transcrição
                let device = navigator.gpu ? 'webgpu' : 'wasm';
                
                // q4 é mais otimizado para WebGPU (gasta menos memória GPU), q8 funciona apenas para CPU
                let dtype = navigator.gpu ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8';

                try {
                    transcriber = await pipeline(
                        'automatic-speech-recognition',
                        model,
                        {
                            dtype: dtype,
                            device: device,
                            progress_callback: (progress) => {
                                self.postMessage({ type: 'progress', data: progress });
                            }
                        }
                    );
                } catch (gpuError) {
                    console.warn('O WebGPU falhou ou não é suportado, voltando para o Processador (WASM)', gpuError);
                    // Se o celular disser que tem GPU mas der erro na hora de usar, voltamos pro processamento padrão
                    device = 'wasm';
                    dtype = 'q8';
                    transcriber = await pipeline(
                        'automatic-speech-recognition',
                        model,
                        {
                            dtype: dtype,
                            device: device,
                            progress_callback: (progress) => {
                                self.postMessage({ type: 'progress', data: progress });
                            }
                        }
                    );
                }
                
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
