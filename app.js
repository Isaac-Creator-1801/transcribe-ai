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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
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

        // Initialize worker
        if (!aiWorker) {
            aiWorker = new Worker('worker.js', { type: 'module' });
        }

        const runCommand = (commandData, onProgress) => {
            return new Promise((resolve, reject) => {
                const handler = (event) => {
                    const { type, data, error } = event.data;
                    if (type === 'progress') {
                        if (onProgress) onProgress(data);
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
                    updateProgress('Baixando modelo de IA...', `${progress.file || ''} — ${pct}%`, 5 + (pct * 0.25));
                } else if (progress.status === 'ready') {
                    updateProgress('Modelo carregado!', 'Iniciando transcrições...', 35);
                }
            }
        );

        // Transcribe each file
        const opts = { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true };
        if (lang) opts.language = lang;

        for (let i = 0; i < totalFiles; i++) {
            const { file } = currentFiles[i];
            const fileNum = i + 1;
            const baseProgress = 35 + ((i / totalFiles) * 55);
            const fileProgress = 55 / totalFiles;

            updateProgress(`Processando áudio ${fileNum}/${totalFiles}...`, file.name, baseProgress + (fileProgress * 0.2));
            const audioData = await loadAudioData(file);

            updateProgress(`Transcrevendo ${fileNum}/${totalFiles}...`, file.name, baseProgress + (fileProgress * 0.4));
            const result = await runCommand({ type: 'transcribe', audioData, options: opts });

            transcriptionResults.push({
                fileName: file.name,
                text: result.text || '',
                chunks: result.chunks || []
            });

            updateProgress(`Concluído ${fileNum}/${totalFiles}`, file.name, baseProgress + fileProgress);
        }

        updateProgress('Finalizando...', 'Formatando resultados', 95);
        displayAllResults();
        updateProgress('Concluído!', `${totalFiles} arquivo${totalFiles > 1 ? 's' : ''} transcrito${totalFiles > 1 ? 's' : ''}`, 100);

        setTimeout(() => {
            progressSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
            fileInfoSection.classList.add('hidden');
        }, 500);

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
            downloadFile(`${r.fileName.replace(/\.[^.]+$/, '')}_transcricao.txt`, getPlainTextForResult(idx), 'text/plain');
            showToast('Arquivo TXT baixado!', 'success');
        });
    });

    resultsContainer.querySelectorAll('.btn-download-srt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index'));
            const r = transcriptionResults[idx];
            downloadFile(`${r.fileName.replace(/\.[^.]+$/, '')}_legenda.srt`, generateSRTForResult(idx), 'text/srt');
            showToast('Arquivo SRT baixado!', 'success');
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
        if (file.type.startsWith('video/') || file.type.startsWith('audio/') || validExts.includes(ext)) {
            addConverterFile(file);
            added++;
        }
    }
    if (added === 0) showToast('Nenhum formato suportado.', 'error');
}

function addConverterFile(file) {
    const id = ++converterFileIdCounter;
    converterFiles.push({ id, file });
    renderConverterFilesList();
    converterUploadZone.style.display = 'none';
    converterFileInfo.classList.remove('hidden');
    converterSettings.classList.remove('hidden');
    btnConvert.classList.remove('hidden');
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
    }
}

function renderConverterFilesList() {
    const count = converterFiles.length;
    converterFilesCount.textContent = count === 1 ? '1 arquivo selecionado' : `${count} arquivos selecionados`;

    converterFilesList.innerHTML = converterFiles.map(({ id, file }) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const isVideo = file.type.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov'].includes(ext);
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

async function convertFile(file, format) {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Render to WAV
    const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    const renderedBuffer = await offlineCtx.startRendering();
    await audioContext.close();

    // Encode to WAV
    const wavBlob = audioBufferToWav(renderedBuffer);
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const newName = `${baseName}.wav`;

    return { originalName: file.name, convertedName: newName, blob: wavBlob, mimeType: 'audio/wav' };
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

function updateConverterProgress(title, detail, percent) {
    converterProgressTitle.textContent = title;
    converterProgressDetail.textContent = detail;
    converterProgressBar.style.width = `${Math.min(percent, 100)}%`;
    converterProgressPercent.textContent = `${Math.round(percent)}%`;
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
            const r = converterResults[idx];
            const url = URL.createObjectURL(r.blob);
            const a = document.createElement('a');
            a.href = url; a.download = r.convertedName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Arquivo convertido baixado!', 'success');
        });
    });
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

function updateProgress(title, detail, percent) {
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