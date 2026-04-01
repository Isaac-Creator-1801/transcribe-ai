import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1';

// Otimizações de ambiente para estabilidade
env.allowLocalModels = false;
env.useBrowserCache = true;
// Garante caminhos corretos para WASM se necessário
env.backends.onnx.wasm.simd = true; 
env.backends.onnx.wasm.proxy = false; // Manter no mesmo thread do worker geralmente é mais rápido aqui


let transcriber = null;

self.addEventListener('message', async (event) => {
    const { type, model, audioData, options, lang } = event.data;

    if (type === 'load') {
        try {
            if (!transcriber || transcriber._modelId !== model) {
                // Tenta detectar WebGPU de forma mais segura antes de usar
                let canUseGPU = false;
                try {
                    // navigator.gpu pode existir mas requestAdapter() pode falhar ou não existir em Workers
                    if (navigator.gpu) {
                        const adapter = await navigator.gpu.requestAdapter();
                        canUseGPU = !!adapter;
                    }
                } catch (e) {
                    canUseGPU = false;
                }

                let device = canUseGPU ? 'webgpu' : 'wasm';
                
                // q4 é mais otimizado para WebGPU (gasta menos memória GPU), q8 funciona apenas para CPU
                // Na versão 3, 'fp32' para encoder e 'q4' para decoder é um bom equilíbrio
                let dtype = canUseGPU ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8';

                console.log(`Iniciando backend: ${device} (dtype: ${JSON.stringify(dtype)})`);

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
                    // Se o WebGPU falhar mesmo após o check (ex: erro de compilação de shader ou memória), 
                    // forçamos o fallback para WASM/CPU
                    console.error('WebGPU falhou na prática, voltando para WASM:', gpuError);
                    
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
            console.error('Erro fatal ao carregar o modelo:', error);
            self.postMessage({ type: 'error', error: error.message });
        }
    } else if (type === 'transcribe') {
        try {
            // Calcula o número total de chunks baseado no tamanho do áudio
            const sampleRate = 16000; // loadAudioData usa 16kHz
            const chunkLengthS = options.chunk_length_s || 30;
            const strideLengthS = options.stride_length_s || 5;
            const totalDurationS = audioData.length / sampleRate;
            
            // Calcula chunks esperados: cada chunk avança (chunkLength - stride) segundos
            const stepS = chunkLengthS - strideLengthS;
            const totalChunks = Math.max(1, Math.ceil(totalDurationS / stepS));
            let processedChunks = 0;

            // Envia info inicial sobre a transcrição
            self.postMessage({ 
                type: 'transcription_progress', 
                data: { 
                    processedChunks: 0, 
                    totalChunks, 
                    totalDurationS,
                    status: 'started' 
                } 
            });

            // Adiciona chunk_callback para progresso real chunk-a-chunk
            const transcribeOptions = { 
                ...options,
                chunk_callback: (chunk) => {
                    processedChunks++;
                    self.postMessage({ 
                        type: 'transcription_progress', 
                        data: { 
                            processedChunks, 
                            totalChunks,
                            totalDurationS,
                            status: 'transcribing',
                            // Envia texto parcial para feedback visual
                            partialText: chunk?.text || ''
                        } 
                    });
                }
            };

            const result = await transcriber(audioData, transcribeOptions);
            
            // Envia progresso final antes do resultado
            self.postMessage({ 
                type: 'transcription_progress', 
                data: { 
                    processedChunks: totalChunks, 
                    totalChunks,
                    totalDurationS,
                    status: 'completed' 
                } 
            });

            self.postMessage({ type: 'result', data: result });
        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
});
