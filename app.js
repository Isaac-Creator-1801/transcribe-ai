// =========================================
// TranscribeAI - App Logic (Complete)
// Transcription + Conversion + Tabs
// =========================================

// =========================================
// DOM Elements - Transcription
// =========================================
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const btnRecord = document.getElementById('btn-record');
const recordingTimer = document.getElementById('recording-timer');
const uploadSection = document.getElementById('upload-section');
const fileInfoSection = document.getElementById('file-info-section');
const filesList = document.getElementById('files-list');
const filesCount = document.getElementById('files-count');
const btnClearAll = document.getElementById('btn-clear-all');
const btnAddMore = document.getElementById('btn-add-more');
const btnTranscribe = document.getElementById('btn-transcribe');
const languageSelect = document.getElementById('language-select');
const modelSelect = document.getElementById('model-select');
const progressSection = document.getElementById('progress-section');
const progressTitle = document.getElementById('progress-title');
const progressDetail = document.getElementById('progress-detail');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const resultSection = document.getElementById('result-section');
const resultsContainer = document.getElementById('results-container');
const btnCopyAll = document.getElementById('btn-copy-all');
const btnDownloadAll = document.getElementById('btn-download-all');
const btnNew = document.getElementById('btn-new');

// DOM Elements - Tabs
const tabTranscribe = document.getElementById('tab-transcribe');
const tabConvert = document.getElementById('tab-convert');

// DOM Elements - Converter
const converterSection = document.getElementById('converter-section');
const converterUploadZone = document.getElementById('converter-upload-zone');
const converterFileInput = document.getElementById('converter-file-input');
const converterSettings = document.getElementById('converter-settings');
const converterOutputFormat = document.getElementById('output-format-select');
const converterQualitySelect = document.getElementById('quality-select');
const converterFileInfo = document.getElementById('converter-file-info');
const converterFilesCount = document.getElementById('converter-files-count');
const converterFilesList = document.getElementById('converter-files-list');
const converterBtnClearAll = document.getElementById('converter-btn-clear-all');
const btnConvert = document.getElementById('btn-convert');
const converterProgressSection = document.getElementById('converter-progress-section');
const converterProgressTitle = document.getElementById('converter-progress-title');
const converterProgressDetail = document.getElementById('converter-progress-detail');
const converterProgressBar = document.getElementById('converter-progress-bar');
const converterProgressPercent = document.getElementById('converter-progress-percent');
const converterResultSection = document.getElementById('converter-result-section');
const converterResultsContainer = document.getElementById('converter-results-container');
const converterBtnDownloadAll = document.getElementById('converter-btn-download-all');
const converterBtnNew = document.getElementById('converter-btn-new');
const conversionDirection = document.getElementById('conversion-direction');
const inputCategoryBadge = document.getElementById('input-category-badge');
const pdfPageSettings = document.getElementById('pdf-page-settings');
const pdfRenderMode = document.getElementById('pdf-render-mode');
const previewModal = document.getElementById('preview-modal');
const previewContent = document.getElementById('preview-content');
const previewFilename = document.getElementById('preview-filename');
const btnClosePreview = document.getElementById('btn-close-preview');
const btnCancelPreview = document.getElementById('btn-cancel-preview');
const btnConfirmDownload = document.getElementById('btn-confirm-download');
const previewIcon = document.getElementById('preview-icon');

// =========================================
// State
// =========================================
let currentFiles = [];
let aiWorker = null;
let transcriptionResults = [];
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let startTime = null;
let fileIdCounter = 0;

// Converter state
let converterFiles = [];
let converterResults = [];
let converterFileIdCounter = 0;

// =========================================
// Mapeamento de Formatos (Estilo CloudConvert)
// =========================================
const CONVERSION_MAP = {
    'audio': {
        icon: '🎵',
        outputs: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac']
    },
    'video': {
        icon: '🎬',
        outputs: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav']
    },
    'image': {
        icon: '🖼️',
        outputs: ['png', 'jpg', 'webp', 'svg', 'gif', 'bmp']
    },
    'document': {
        icon: '📄',
        outputs: ['pdf', 'docx', 'txt', 'html', 'png', 'jpg']
    },
    'archive': {
        icon: '📦',
        outputs: ['zip', 'rar', '7z', 'tar.gz']
    }
};

// =========================================
// Tab Switching
// =========================================
if (tabTranscribe) {
    tabTranscribe.addEventListener('click', () => {
        tabTranscribe.classList.add('active');
        tabConvert.classList.remove('active');
        // Show transcription sections
        uploadSection.classList.remove('hidden');
        fileInfoSection.classList.add('hidden');
        progressSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        // Hide converter
        converterSection.classList.add('hidden');
    });
}

if (tabConvert) {
    tabConvert.addEventListener('click', () => {
        tabConvert.classList.add('active');
        tabTranscribe.classList.remove('active');
        // Hide transcription sections
        uploadSection.classList.add('hidden');
        fileInfoSection.classList.add('hidden');
        progressSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        // Show converter
        converterSection.classList.remove('hidden');
    });
}

// =========================================
// File Upload Handling (Transcription)
// =========================================
uploadZone.addEventListener('click', () => fileInput.click());

if (btnAddMore) {
    btnAddMore.addEventListener('click', () => fileInput.click());
}

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
    e.target.value = '';
});

// Drag & Drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

// =========================================
// Recording Handling
// =========================================
btnRecord.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!window.MediaRecorder) {
        showToast('Seu navegador não suporta gravação de áudio.', 'error');
        return;
    }
    toggleRecording();
});

async function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        // Solicita áudio com os melhores parâmetros de 'Studio' possíveis para Web
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,      // Evita eco
                noiseSuppression: true,      // Limpa estática do microfone
                autoGainControl: true,       // Niveliza a voz
                channelCount: 1,             // Mono (Otimizado para o modelo de Inteligência Artificial)
                sampleRate: 48000,           // 48kHz (Padrão de estúdio e vídeo de alta qualidade)
                sampleSize: 16               // 16-bit de profundidade
            } 
        });
        
        // Força uma gravação de altíssima taxa de bits (256kbps) se o navegador aguentar
        const options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 };
        const mimeType = MediaRecorder.isTypeSupported(options.mimeType) ? options : { mimeType: 'audio/webm' };
        
        mediaRecorder = new MediaRecorder(stream, mimeType);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const now = new Date();
            const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
            const file = new File([audioBlob], `gravacao_${ts}.webm`, { type: 'audio/webm' });
            addFile(file);
            setTimeout(() => startTranscription(), 500);
        };

        mediaRecorder.start();
        startTime = Date.now();
        btnRecord.classList.add('recording');
        btnRecord.querySelector('.record-label').textContent = 'Parar Gravação';
        recordingTimer.classList.remove('hidden');
        recordingInterval = setInterval(updateRecordingTimer, 100);
        showToast('Gravando áudio...', 'success');
    } catch (err) {
        console.error('Error accessing microphone:', err);
        showToast('Erro ao acessar o microfone. Verifique as permissões.', 'error');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        clearInterval(recordingInterval);
        btnRecord.classList.remove('recording');
        btnRecord.querySelector('.record-label').textContent = 'Gravar Áudio';
        recordingTimer.classList.add('hidden');
        recordingTimer.textContent = '00:00';
    }
}

function updateRecordingTimer() {
    const elapsed = Date.now() - startTime;
    recordingTimer.textContent = formatTime(elapsed);
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// =========================================
// Multiple File Handling (Transcription)
// =========================================

const validTypes = [
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
    'audio/aac', 'audio/x-m4a', 'audio/flac',
    'video/mp4', 'video/webm', 'video/ogg', 'video/x-matroska'
];
const validExts = ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac', 'mp4', 'mkv', 'avi'];

function isValidFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    return validTypes.includes(file.type) || validExts.includes(ext);
}

function handleFiles(fileList) {
    let added = 0;
    for (const file of fileList) {
        if (isValidFile(file)) { addFile(file); added++; }
    }
    if (added === 0) showToast('Nenhum formato suportado. Use áudio ou vídeo.', 'error');
}

function addFile(file) {
    const id = ++fileIdCounter;
    currentFiles.push({ id, file });
    renderFilesList();
    uploadSection.classList.add('hidden');
    fileInfoSection.classList.remove('hidden');
}

function removeFile(id) {
    currentFiles = currentFiles.filter(f => f.id !== id);
    if (currentFiles.length === 0) {
        fileInfoSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        fileInput.value = '';
    } else {
        renderFilesList();
    }
}

function renderFilesList() {
    const count = currentFiles.length;
    filesCount.textContent = count === 1 ? '1 arquivo selecionado' : `${count} arquivos selecionados`;

    filesList.innerHTML = currentFiles.map(({ id, file }) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const isVideo = file.type.startsWith('video/') || ['mp4', 'mkv', 'avi'].includes(ext);
        const icon = isVideo
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 8 6 4-6 4Z"/></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
        return `
            <div class="file-item" data-id="${id}">
                <div class="file-item-left">
                    <div class="file-item-icon">${icon}</div>
                    <div class="file-item-details">
                        <span class="file-item-name">${escapeHtml(file.name)}</span>
                        <span class="file-item-size">${formatFileSize(file.size)}</span>
                    </div>
                </div>
                <button class="btn-remove-file" data-id="${id}" title="Remover">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
            </div>`;
    }).join('');

    filesList.querySelectorAll('.btn-remove-file').forEach(btn => {
        btn.addEventListener('click', () => removeFile(parseInt(btn.getAttribute('data-id'))));
    });
}

btnClearAll.addEventListener('click', () => {
    currentFiles = [];
    fileInput.value = '';
    fileInfoSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
});

// =========================================
// Transcription Process (Web Worker)
// =========================================

btnTranscribe.addEventListener('click', startTranscription);

async function startTranscription() {
    if (currentFiles.length === 0) return;

    btnTranscribe.disabled = true;
    progressSection.classList.remove('hidden');
    fileInfoSection.querySelector('.settings-row').style.opacity = '0.5';
    fileInfoSection.querySelector('.settings-row').style.pointerEvents = 'none';
    btnTranscribe.style.display = 'none';

    transcriptionResults = [];
    const totalFiles = currentFiles.length;

    try {
        const selectedModel = modelSelect.value;
        const selectedLang = languageSelect.value;
        const lang = selectedLang === 'null' ? null : selectedLang;

        updateProgress('Carregando modelo de IA...', `Modelo: ${selectedModel.split('/')[1]} — pode levar um minuto na primeira vez`, 5);

        // Initialize worker with cache buster to force update
        if (!aiWorker) {
            const cacheBuster = Date.now();
            aiWorker = new Worker(`worker.js?v=${cacheBuster}`, { type: 'module' });
        }

        const runCommand = (commandData, onProgress, onTranscriptionProgress) => {
            return new Promise((resolve, reject) => {
                const handler = (event) => {
                    const { type, data, error } = event.data;
                    if (type === 'progress') {
                        if (onProgress) onProgress(data);
                    } else if (type === 'transcription_progress') {
                        if (onTranscriptionProgress) onTranscriptionProgress(data);
                    } else if (type === 'ready') {
                        aiWorker.removeEventListener('message', handler);
                        resolve();
                    } else if (type === 'result') {
                        aiWorker.removeEventListener('message', handler);
                        resolve(data);
                    } else if (type === 'error') {
                        aiWorker.removeEventListener('message', handler);
                        reject(new Error(error));
                    }
                };
                aiWorker.addEventListener('message', handler);
                aiWorker.postMessage(commandData);
            });
        };

        // Load model
        await runCommand(
            { type: 'load', model: selectedModel },
            (progress) => {
                if (progress.status === 'progress' && progress.progress) {
                    const pct = Math.round(progress.progress);
                    updateProgressDirect('Baixando modelo de IA...', `${progress.file || ''} — ${pct}%`, 5 + (pct * 0.25));
                } else if (progress.status === 'ready') {
                    updateProgressDirect('Modelo carregado!', 'Iniciando transcrições...', 35);
                }
            }
        );

        // Transcribe each file
        const opts = { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true };
        if (lang) opts.language = lang;

        // Faixa de progresso: 35% (modelo pronto) até 95% (antes de finalizar)
        const PROGRESS_START = 35;
        const PROGRESS_END = 95;
        const PROGRESS_RANGE = PROGRESS_END - PROGRESS_START;

        for (let i = 0; i < totalFiles; i++) {
            const { file } = currentFiles[i];
            const fileNum = i + 1;
            
            // Cada arquivo recebe uma fatia proporcional do range de progresso
            const fileSliceStart = PROGRESS_START + ((i / totalFiles) * PROGRESS_RANGE);
            const fileSliceSize = PROGRESS_RANGE / totalFiles;
            
            // Fase 1: Decodificando áudio (10% da fatia do arquivo)
            updateProgressDirect(
                `Decodificando áudio ${fileNum}/${totalFiles}...`, 
                file.name, 
                fileSliceStart
            );
            const audioData = await loadAudioData(file);

            // Fase 2: Transcrevendo com progresso real chunk-a-chunk (85% da fatia)
            const transcribeStart = fileSliceStart + (fileSliceSize * 0.10);
            const transcribeRange = fileSliceSize * 0.85;
            
            updateProgressDirect(
                `Transcrevendo ${fileNum}/${totalFiles}...`, 
                `${file.name} — Preparando...`, 
                transcribeStart
            );

            const result = await runCommand(
                { type: 'transcribe', audioData, options: opts },
                null, // onProgress (model loading) - not needed here
                (tProgress) => {
                    // tProgress = { processedChunks, totalChunks, totalDurationS, status, partialText }
                    if (tProgress.status === 'started') {
                        const durStr = formatDuration(tProgress.totalDurationS);
                        updateProgress(
                            `Transcrevendo ${fileNum}/${totalFiles}...`, 
                            `${file.name} — ${durStr} de áudio — ${tProgress.totalChunks} chunks`, 
                            transcribeStart
                        );
                    } else if (tProgress.status === 'transcribing') {
                        const chunkPct = tProgress.processedChunks / tProgress.totalChunks;
                        const currentPct = transcribeStart + (chunkPct * transcribeRange);
                        const processedSec = Math.min(
                            tProgress.processedChunks * (opts.chunk_length_s - opts.stride_length_s),
                            tProgress.totalDurationS
                        );
                        const detail = `${file.name} — ${formatDuration(processedSec)} / ${formatDuration(tProgress.totalDurationS)}`;
                        updateProgress(
                            `Transcrevendo ${fileNum}/${totalFiles}... (chunk ${tProgress.processedChunks}/${tProgress.totalChunks})`, 
                            detail, 
                            currentPct
                        );
                    } else if (tProgress.status === 'completed') {
                        updateProgressDirect(
                            `Concluído ${fileNum}/${totalFiles}`, 
                            file.name, 
                            fileSliceStart + fileSliceSize
                        );
                    }
                }
            );

            transcriptionResults.push({
                fileName: file.name,
                text: result.text || '',
                chunks: result.chunks || []
            });

            // Fase 3: Arquivo concluído (5% da fatia)
            updateProgressDirect(
                `Concluído ${fileNum}/${totalFiles}`, 
                file.name, 
                fileSliceStart + fileSliceSize
            );
        }

        updateProgressDirect('Finalizando...', 'Formatando resultados', 96);
        displayAllResults();
        updateProgressDirect('Concluído!', `${totalFiles} arquivo${totalFiles > 1 ? 's' : ''} transcrito${totalFiles > 1 ? 's' : ''}`, 100);

        setTimeout(() => {
            progressSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
            fileInfoSection.classList.add('hidden');
        }, 800);

    } catch (error) {
        console.error('Transcription error:', error);
        progressSection.classList.add('hidden');
        btnTranscribe.style.display = 'flex';
        btnTranscribe.disabled = false;
        fileInfoSection.querySelector('.settings-row').style.opacity = '1';
        fileInfoSection.querySelector('.settings-row').style.pointerEvents = 'auto';
        showToast(`Erro: ${error.message}`, 'error');
    }
}

// =========================================
// Audio Processing
// =========================================

async function loadAudioData(file) {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    let audioData;
    if (audioBuffer.numberOfChannels > 1) {
        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.getChannelData(1);
        audioData = new Float32Array(ch0.length);
        for (let i = 0; i < ch0.length; i++) audioData[i] = (ch0[i] + ch1[i]) / 2;
    } else {
        audioData = audioBuffer.getChannelData(0);
    }
    await audioContext.close();
    return audioData;
}

// =========================================
// Display Results (Multiple Cards)
// =========================================

function displayAllResults() {
    resultsContainer.innerHTML = transcriptionResults.map((result, index) => {
        const { fileName, text, chunks } = result;
        const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const charCount = text.length;
        const duration = chunks.length > 0 ? chunks[chunks.length - 1].timestamp[1] || 0 : 0;

        const contentHtml = chunks.length > 0
            ? chunks.map(chunk => {
                const start = formatTimestamp(chunk.timestamp[0]);
                const end = formatTimestamp(chunk.timestamp[1]);
                return `<div class="chunk"><span class="timestamp">${start} → ${end}</span><span>${escapeHtml(chunk.text.trim())}</span></div>`;
            }).join('')
            : `<p>${escapeHtml(text)}</p>`;

        return `
            <div class="result-card" data-index="${index}">
                <div class="result-card-header" data-index="${index}">
                    <div class="result-card-title">
                        <span class="result-card-number">${index + 1}</span>
                        <div class="result-card-file-info">
                            <span class="result-card-name">${escapeHtml(fileName)}</span>
                            <div class="result-card-stats">
                                <span>${wordCount} palavras</span><span>•</span><span>${charCount} caracteres</span>
                                ${duration > 0 ? `<span>•</span><span>${formatDuration(duration)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="result-card-actions">
                        <button class="btn-card-action btn-copy-single" data-index="${index}" title="Copiar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </button>
                        <button class="btn-card-action btn-download-txt" data-index="${index}" title="Baixar .txt">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                        </button>
                        <button class="btn-card-action btn-download-srt" data-index="${index}" title="Baixar .srt">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 8h10M7 12h10M7 16h6"/></svg>
                        </button>
                        <button class="btn-card-toggle" data-index="${index}" title="Expandir/Recolher">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                    </div>
                </div>
                <div class="result-card-content open" data-index="${index}">${contentHtml}</div>
            </div>`;
    }).join('');

    addCardEventListeners();
}

function addCardEventListeners() {
    resultsContainer.querySelectorAll('.btn-copy-single').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = getPlainTextForResult(parseInt(btn.getAttribute('data-index')));
            navigator.clipboard.writeText(text).then(() => showToast('Texto copiado!', 'success'));
        });
    });

    resultsContainer.querySelectorAll('.btn-download-txt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index'));
            const r = transcriptionResults[idx];
            const content = getPlainTextForResult(idx);
            const fileName = `${r.fileName.replace(/\.[^.]+$/, '')}_transcricao.txt`;
            showPreview({ 
                blob: new Blob([content], { type: 'text/plain' }), 
                convertedName: fileName, 
                mimeType: 'text/plain' 
            });
        });
    });

    resultsContainer.querySelectorAll('.btn-download-srt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index'));
            const r = transcriptionResults[idx];
            const content = generateSRTForResult(idx);
            const fileName = `${r.fileName.replace(/\.[^.]+$/, '')}_legendas.srt`;
            showPreview({ 
                blob: new Blob([content], { type: 'text/plain' }), 
                convertedName: fileName, 
                mimeType: 'text/plain' 
            });
        });
    });

    resultsContainer.querySelectorAll('.btn-card-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = btn.getAttribute('data-index');
            const content = resultsContainer.querySelector(`.result-card-content[data-index="${index}"]`);
            const icon = btn.querySelector('svg');
            content.classList.toggle('open');
            icon.style.transform = content.classList.contains('open') ? 'rotate(0deg)' : 'rotate(-90deg)';
        });
    });

    resultsContainer.querySelectorAll('.result-card-header').forEach(header => {
        header.addEventListener('click', () => {
            header.querySelector('.btn-card-toggle').click();
        });
    });
}

// =========================================
// Result Actions (All)
// =========================================

btnCopyAll.addEventListener('click', () => {
    const allText = transcriptionResults.map((r, i) => `=== ${r.fileName} ===\n${getPlainTextForResult(i)}`).join('\n\n');
    navigator.clipboard.writeText(allText).then(() => showToast('Todas as transcrições copiadas!', 'success'));
});

btnDownloadAll.addEventListener('click', () => {
    const allText = transcriptionResults.map((r, i) => `=== ${r.fileName} ===\n${getPlainTextForResult(i)}`).join('\n\n');
    downloadFile('todas_transcricoes.txt', allText, 'text/plain');
    showToast('Arquivo TXT com todas as transcrições baixado!', 'success');
});

btnNew.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    currentFiles = [];
    fileInput.value = '';
    transcriptionResults = [];
    btnTranscribe.style.display = 'flex';
    btnTranscribe.disabled = false;
    const sr = fileInfoSection.querySelector('.settings-row');
    if (sr) { sr.style.opacity = '1'; sr.style.pointerEvents = 'auto'; }
});

// =========================================
// Converter Logic
// =========================================

if (converterUploadZone) {
    converterUploadZone.addEventListener('click', () => converterFileInput.click());

    converterFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleConverterFiles(e.target.files);
        e.target.value = '';
    });

    converterUploadZone.addEventListener('dragover', (e) => { e.preventDefault(); converterUploadZone.classList.add('drag-over'); });
    converterUploadZone.addEventListener('dragleave', (e) => { e.preventDefault(); converterUploadZone.classList.remove('drag-over'); });
    converterUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        converterUploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) handleConverterFiles(e.dataTransfer.files);
    });
}

function handleConverterFiles(fileList) {
    let added = 0;
    for (const file of fileList) {
        const ext = file.name.split('.').pop().toLowerCase();
        const category = getFileCategory(file);
        
        if (category) {
            addConverterFile(file, category);
            added++;
        }
    }
    if (added === 0) showToast('Formato não suportado ainda.', 'error');
}

function getFileCategory(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const type = file.type;

    if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return 'audio';
    if (type.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp'].includes(ext)) return 'image';
    if (['pdf', 'docx', 'doc', 'txt', 'html', 'rtf'].includes(ext)) return 'document';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    
    return null;
}

function addConverterFile(file, category) {
    const id = ++converterFileIdCounter;
    converterFiles.push({ id, file, category });
    renderConverterFilesList();
    
    // Update output options based on the first file or common category
    updateOutputFormats(category);
    
    converterUploadZone.style.display = 'none';
    converterFileInfo.classList.remove('hidden');
    converterSettings.classList.remove('hidden');
    btnConvert.classList.remove('hidden');
}

function updateOutputFormats(category) {
    if (!category || !CONVERSION_MAP[category]) return;
    
    const formats = CONVERSION_MAP[category].outputs;
    const catInfo = CONVERSION_MAP[category];
    
    // Update UI Badge
    inputCategoryBadge.innerHTML = `<span>${catInfo.icon}</span> ${category.charAt(0).toUpperCase() + category.slice(1)}`;
    conversionDirection.classList.remove('hidden');

    // ONLY re-render options if they are different from current ones
    const currentOptions = Array.from(converterOutputFormat.options).map(o => o.value);
    const areDifferent = formats.length !== currentOptions.length || !formats.every((f, i) => f === currentOptions[i]);

    if (areDifferent) {
        converterOutputFormat.innerHTML = formats.map(fmt => {
            const label = fmt.toUpperCase();
            return `<option value="${fmt}">${label}</option>`;
        }).join('');
    }
    
    // Update specific UI details (visibility only)
    toggleConverterSettingsVisibility(category);
}

function toggleConverterSettingsVisibility(category) {
    // Quality select visibility
    if (['audio', 'video'].includes(category)) {
        converterQualitySelect.parentElement.classList.remove('hidden');
    } else {
        converterQualitySelect.parentElement.classList.add('hidden');
    }

    // PDF page settings visibility
    const firstFile = converterFiles[0]?.file;
    const isPDF = firstFile && firstFile.name.toLowerCase().endsWith('.pdf');
    const isExportingToImage = ['png', 'jpg'].includes(converterOutputFormat.value);
    
    if (category === 'document' && isPDF && isExportingToImage) {
        pdfPageSettings.classList.remove('hidden');
    } else {
        pdfPageSettings.classList.add('hidden');
    }
}

// Add event listener to update visibility when output format changes
if (converterOutputFormat) {
    converterOutputFormat.addEventListener('change', () => {
        if (converterFiles.length > 0) toggleConverterSettingsVisibility(converterFiles[0].category);
    });
}

function removeConverterFile(id) {
    converterFiles = converterFiles.filter(f => f.id !== id);
    if (converterFiles.length === 0) {
        converterFileInfo.classList.add('hidden');
        converterSettings.classList.add('hidden');
        btnConvert.classList.add('hidden');
        converterUploadZone.style.display = '';
    } else {
        renderConverterFilesList();
        // Recalculate options if needed (for simplicity we use the last added or first)
        if (converterFiles.length > 0) {
            updateOutputFormats(converterFiles[0].category);
        }
    }
}

function renderConverterFilesList() {
    const count = converterFiles.length;
    converterFilesCount.textContent = count === 1 ? '1 arquivo selecionado' : `${count} arquivos selecionados`;

    converterFilesList.innerHTML = converterFiles.map(({ id, file, category }) => {
        const cat = category || 'other';
        const iconChar = CONVERSION_MAP[cat]?.icon || '📄';
        const icon = `<span style="font-size: 20px; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">${iconChar}</span>`;
        return `
            <div class="file-item" data-id="${id}">
                <div class="file-item-left">
                    <div class="file-item-icon">${icon}</div>
                    <div class="file-item-details">
                        <span class="file-item-name">${escapeHtml(file.name)}</span>
                        <span class="file-item-size">${formatFileSize(file.size)}</span>
                    </div>
                </div>
                <button class="btn-remove-file" data-id="${id}" title="Remover">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
            </div>`;
    }).join('');

    converterFilesList.querySelectorAll('.btn-remove-file').forEach(btn => {
        btn.addEventListener('click', () => removeConverterFile(parseInt(btn.getAttribute('data-id'))));
    });
}

if (converterBtnClearAll) {
    converterBtnClearAll.addEventListener('click', () => {
        converterFiles = [];
        converterFileInfo.classList.add('hidden');
        converterSettings.classList.add('hidden');
        btnConvert.classList.add('hidden');
        converterUploadZone.style.display = '';
    });
}

if (btnConvert) {
    btnConvert.addEventListener('click', startConversion);
}

async function startConversion() {
    if (converterFiles.length === 0) return;
    btnConvert.disabled = true;
    converterProgressSection.classList.remove('hidden');
    btnConvert.style.display = 'none';
    converterResults = [];
    const totalFiles = converterFiles.length;
    const format = converterOutputFormat.value;

    try {
        for (let i = 0; i < totalFiles; i++) {
            const { file } = converterFiles[i];
            const fileNum = i + 1;
            const pct = 5 + ((i / totalFiles) * 90);
            updateConverterProgress(`Convertendo ${fileNum}/${totalFiles}...`, file.name, pct);

            const result = await convertFile(file, format);
            converterResults.push(result);
            updateConverterProgress(`Concluído ${fileNum}/${totalFiles}`, file.name, pct + (90 / totalFiles));
        }

        updateConverterProgress('Concluído!', `${totalFiles} arquivo${totalFiles > 1 ? 's' : ''} convertido${totalFiles > 1 ? 's' : ''}`, 100);
        displayConverterResults();

        setTimeout(() => {
            converterProgressSection.classList.add('hidden');
            converterResultSection.classList.remove('hidden');
            converterFileInfo.classList.add('hidden');
            converterSettings.classList.add('hidden');
        }, 500);
    } catch (error) {
        console.error('Conversion error:', error);
        converterProgressSection.classList.add('hidden');
        btnConvert.style.display = 'flex';
        btnConvert.disabled = false;
        showToast(`Erro: ${error.message}`, 'error');
    }
}

async function renderPdfToImages(file, format, mode) {
    const arrayBuffer = await file.arrayBuffer();
    
    // Configure pdf.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    } else {
        throw new Error('Biblioteca PDF.js não carregada corretamente.');
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = mode === 'all' ? pdf.numPages : 1;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    
    let mimeType = `image/${format}`;
    if (format === 'jpg') mimeType = 'image/jpeg';

    // Reduced scale for better performance
    const scale = window.devicePixelRatio > 1 ? 1.5 : 1.0;

    if (numPages === 1) {
        const page = await pdf.getPage(1);
        const canvas = document.createElement('canvas');
        const viewport = page.getViewport({ scale: scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.85));
        return { originalName: file.name, convertedName: `${baseName}.${format}`, blob, mimeType };
    } else {
        // Multi-page conversion to ZIP
        if (typeof JSZip === 'undefined') throw new Error('JSZip não carregado.');
        const zip = new JSZip();
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const canvas = document.createElement('canvas');
            const viewport = page.getViewport({ scale: scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.85));
            zip.file(`${baseName}_pg${i}.${format}`, blob);
            updateConverterProgress(`Processando página ${i}/${numPages}...`, file.name, 10 + (i / numPages) * 80);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        return { originalName: file.name, convertedName: `${baseName}_imagens.zip`, blob: zipBlob, mimeType: 'application/zip' };
    }
}

async function renderTextToImage(file, format) {
    const text = await file.text();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const baseName = file.name.replace(/\.[^.]+$/, '');
    
    // Configurações Estéticas (Premium Dark)
    const padding = 60;
    const fontSize = 24;
    const lineHeight = 32;
    const canvasWidth = 1200; // Estilo postagem larga
    
    ctx.font = `${fontSize}px 'Inter', sans-serif`;
    
    // Quebra de texto (Word Wrapping) - Improved algorithm
    const maxWidth = canvasWidth - (padding * 2);
    const paragraphs = text.split('\n');
    const lines = [];
    
    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ');
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        // Add empty line between paragraphs
        if (paragraph !== paragraphs[paragraphs.length - 1]) {
            lines.push('');
        }
    }

    // Ajusta altura do canvas dinamicamente
    const canvasHeight = Math.max(800, (lines.length * lineHeight) + (padding * 2));
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Desenha Fundo Moderno (Degradê do App)
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#12121a'); // Dark background
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Desenha Detalhe de Borda (Brilho lateral)
    ctx.fillStyle = 'rgba(124, 92, 252, 0.05)';
    ctx.fillRect(0, 0, 5, canvasHeight);

    // Desenha Texto
    ctx.fillStyle = '#e8e8f0'; // text-primary
    ctx.font = `${fontSize}px 'Inter', sans-serif`;
    ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
        ctx.fillText(line, padding, padding + (i * lineHeight));
    });

    // Logo no rodapé
    ctx.font = `bold 18px 'Inter', sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText('TranscribeAI', padding, canvasHeight - 40);

    let mimeType = `image/${format}`;
    if (format === 'jpg') mimeType = 'image/jpeg';
    
    const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.9));
    return { originalName: file.name, convertedName: `${baseName}.${format}`, blob, mimeType };
}

async function convertFile(file, format) {
    const category = getFileCategory(file);
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const newName = `${baseName}.${format}`;

    // Handle DOCUMENTS (PDF or TXT to Image)
    const isPDF = file.name.toLowerCase().endsWith('.pdf');
    const isTXT = file.name.toLowerCase().endsWith('.txt');
    
    if (category === 'document' && isPDF && ['png', 'jpg'].includes(format.toLowerCase())) {
        return renderPdfToImages(file, format.toLowerCase(), pdfRenderMode.value);
    }
    
    if (category === 'document' && isTXT && ['png', 'jpg'].includes(format.toLowerCase())) {
        return renderTextToImage(file, format.toLowerCase());
    }

    // Handle IMAGES (using Canvas)
    if (category === 'image') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    let mimeType = `image/${format}`;
                    if (format === 'jpg') mimeType = 'image/jpeg';
                    
                    canvas.toBlob((blob) => {
                        resolve({ originalName: file.name, convertedName: newName, blob, mimeType });
                    }, mimeType, 0.92);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Handle AUDIO (current PCM/WAV implementation)
    if (category === 'audio' || (category === 'video' && ['wav', 'mp3'].includes(format))) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineCtx.destination);
            source.start();
            const renderedBuffer = await offlineCtx.startRendering();
            await audioContext.close();
            const wavBlob = audioBufferToWav(renderedBuffer);
            
            // For now, even if they select MP3, we give a high-quality WAV (lossless)
            // or we could use an external library for MP3
            return { originalName: file.name, convertedName: `${baseName}.wav`, blob: wavBlob, mimeType: 'audio/wav' };
        } catch (e) {
            console.error('Audio processing failed', e);
            throw new Error('Falha ao processar áudio localmente.');
        }
    }

    // Fallback for others (Mock)
    return new Promise((resolve) => {
        setTimeout(() => {
            const mockBlob = new Blob([`Não foi possível converter "${file.name}" para "${format}". Este formato ainda não é suportado.`], { type: 'text/plain' });
            resolve({ 
                originalName: file.name, 
                convertedName: `${baseName}_nao_convertido.txt`, 
                blob: mockBlob, 
                mimeType: 'text/plain',
                isMock: true 
            });
        }, 1000);
    });
}

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const channels = [];
    for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));
    const numFrames = buffer.length;
    const dataSize = numFrames * blockAlign;
    const headerSize = 44;
    const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(arrayBuffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            let sample = channels[ch][i];
            sample = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
}

// Throttle function for progress updates to reduce DOM manipulations
// Improved: ensures final calls (>=100% or phase changes) are never dropped
function throttle(func, limit) {
    let inThrottle;
    let lastArgs;
    let lastContext;
    let timeoutId;
    return function() {
        lastArgs = arguments;
        lastContext = this;
        if (!inThrottle) {
            func.apply(lastContext, lastArgs);
            inThrottle = true;
            timeoutId = setTimeout(() => {
                inThrottle = false;
                // Flush any pending call that was blocked during throttle
                if (lastArgs) {
                    func.apply(lastContext, lastArgs);
                    lastArgs = null;
                }
            }, limit);
        }
    }
}

// Throttled progress update functions
const throttledUpdateConverterProgress = throttle(function(title, detail, percent) {
    converterProgressTitle.textContent = title;
    converterProgressDetail.textContent = detail;
    converterProgressBar.style.width = `${Math.min(percent, 100)}%`;
    converterProgressPercent.textContent = `${Math.round(percent)}%`;
}, 100); // Update at most every 100ms

function updateConverterProgress(title, detail, percent) {
    throttledUpdateConverterProgress(title, detail, percent);
}

function displayConverterResults() {
    converterResultsContainer.innerHTML = converterResults.map((result, index) => `
        <div class="result-card" data-index="${index}">
            <div class="result-card-header">
                <div class="result-card-title">
                    <span class="result-card-number">${index + 1}</span>
                    <div class="result-card-file-info">
                        <span class="result-card-name">${escapeHtml(result.convertedName)}</span>
                        <div class="result-card-stats">
                            <span>Convertido de ${escapeHtml(result.originalName)}</span>
                        </div>
                    </div>
                </div>
                <div class="result-card-actions">
                    <button class="btn-card-action btn-download-converted" data-index="${index}" title="Baixar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    </button>
                </div>
            </div>
        </div>`).join('');

    converterResultsContainer.querySelectorAll('.btn-download-converted').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index'));
            showPreview(converterResults[idx]);
        });
    });
}

function showPreview(result) {
    const { blob, convertedName, mimeType } = result;
    previewFilename.textContent = convertedName;
    previewContent.innerHTML = '';
    
    const url = URL.createObjectURL(blob);
    
    if (mimeType.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'preview-img';
        previewContent.appendChild(img);
        previewIcon.textContent = '🖼️';
    } else if (mimeType.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        audio.className = 'preview-audio';
        previewContent.appendChild(audio);
        previewIcon.textContent = '🎵';
    } else if (mimeType === 'text/plain' || convertedName.endsWith('.srt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const pre = document.createElement('pre');
            pre.className = 'preview-text';
            pre.textContent = e.target.result;
            previewContent.appendChild(pre);
        };
        reader.readAsText(blob);
        previewIcon.textContent = '📝';
    } else if (mimeType === 'application/zip') {
        previewContent.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 16px;">📦</div>
                <p>Este arquivo contém múltiplas imagens compactadas.</p>
                <p style="font-size: 0.8rem; margin-top: 8px;">O preview individual não está disponível para pacotes ZIP.</p>
            </div>
        `;
        previewIcon.textContent = '📦';
    } else {
        previewContent.innerHTML = `<p style="color: var(--text-muted);">Preview não disponível para este formato.</p>`;
        previewIcon.textContent = '📄';
    }

    // Store URL for cleanup
    previewModal.dataset.previewUrl = url;

    // Modal buttons
    btnConfirmDownload.onclick = () => {
        const a = document.createElement('a');
        a.href = url; a.download = convertedName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        hidePreview();
        showToast('Download concluído!', 'success');
    };

    previewModal.classList.remove('hidden');
}

function hidePreview() {
    previewModal.classList.add('hidden');
    // Clear content cleanup
    const media = previewContent.querySelectorAll('audio, video, img');
    media.forEach(m => {
        if (m.src) URL.revokeObjectURL(m.src);
    });
    
    // Revoke the preview URL if it exists
    if (previewModal.dataset.previewUrl) {
        URL.revokeObjectURL(previewModal.dataset.previewUrl);
        delete previewModal.dataset.previewUrl;
    }
}

if (btnClosePreview) btnClosePreview.onclick = hidePreview;
if (btnCancelPreview) btnCancelPreview.onclick = hidePreview;
// Close on overlay click
if (previewModal) {
    previewModal.onclick = (e) => {
        if (e.target === previewModal) hidePreview();
    };
}

if (converterBtnDownloadAll) {
    converterBtnDownloadAll.addEventListener('click', () => {
        converterResults.forEach(r => {
            const url = URL.createObjectURL(r.blob);
            const a = document.createElement('a');
            a.href = url; a.download = r.convertedName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        showToast('Todos os arquivos baixados!', 'success');
    });
}

if (converterBtnNew) {
    converterBtnNew.addEventListener('click', () => {
        converterResultSection.classList.add('hidden');
        converterUploadZone.style.display = '';
        converterFiles = [];
        converterResults = [];
        btnConvert.style.display = 'flex';
        btnConvert.disabled = false;
        btnConvert.classList.add('hidden');
    });
}

// =========================================
// Helper Functions
// =========================================

function getPlainTextForResult(index) {
    const r = transcriptionResults[index];
    if (r.chunks.length > 0) return r.chunks.map(c => `[${formatTimestamp(c.timestamp[0])} → ${formatTimestamp(c.timestamp[1])}] ${c.text.trim()}`).join('\n');
    return r.text || '';
}

function generateSRTForResult(index) {
    const r = transcriptionResults[index];
    if (r.chunks.length === 0) return r.text || '';
    return r.chunks.map((c, i) => `${i + 1}\n${formatSRTTimestamp(c.timestamp[0])} --> ${formatSRTTimestamp(c.timestamp[1])}\n${c.text.trim()}\n`).join('\n');
}

function formatTimestamp(seconds) {
    if (seconds == null) return '??:??';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatSRTTimestamp(seconds) {
    if (seconds == null) return '00:00:00,000';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')},${ms.toString().padStart(3,'0')}`;
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Throttled progress update functions (for frequent chunk-by-chunk updates)
const throttledUpdateProgress = throttle(function(title, detail, percent) {
    progressTitle.textContent = title;
    progressDetail.textContent = detail;
    progressBar.style.width = `${Math.min(percent, 100)}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
}, 80); // Update at most every 80ms for smooth animation

// Throttled version — use for frequent updates (chunk progress)
function updateProgress(title, detail, percent) {
    throttledUpdateProgress(title, detail, percent);
}

// Direct (non-throttled) version — use for critical/phase-change updates
// that MUST be reflected immediately (model loaded, file completed, 100%, etc.)
function updateProgressDirect(title, detail, percent) {
    progressTitle.textContent = title;
    progressDetail.textContent = detail;
    progressBar.style.width = `${Math.min(percent, 100)}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${type === 'success' ? '✅' : '❌'} ${message}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}