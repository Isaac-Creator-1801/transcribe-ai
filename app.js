// =========================================
// TranscribeAI - App Logic
// Supports multiple file transcription
// Uses Whisper via Transformers.js (runs in-browser)
// =========================================

// import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1';

// =========================================
// DOM Elements
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

// =========================================
// State
// =========================================
let currentFiles = []; // Array of { id, file }
let aiWorker = null;
let transcriptionResults = []; // Array of { fileName, text, chunks }
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let startTime = null;
let fileIdCounter = 0;

// =========================================
// File Upload Handling
// =========================================

// Click to upload
uploadZone.addEventListener('click', () => fileInput.click());

// Add more files after initial selection
const btnAddMore = document.getElementById('btn-add-more');
if (btnAddMore) {
    btnAddMore.addEventListener('click', () => fileInput.click());
}

// File selected
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
    // Clear the input so the same files can be selected again if needed
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
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const now = new Date();
            const fileNameStr = `gravacao_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.webm`;
            const file = new File([audioBlob], fileNameStr, { type: 'audio/webm' });

            addFile(file);

            // Auto-start transcription
            setTimeout(() => {
                startTranscription();
            }, 500);
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
// Multiple File Handling
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
        if (isValidFile(file)) {
            addFile(file);
            added++;
        }
    }
    if (added === 0) {
        showToast('Nenhum formato suportado. Use áudio ou vídeo.', 'error');
    }
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
    // Update count
    const count = currentFiles.length;
    filesCount.textContent = count === 1
        ? '1 arquivo selecionado'
        : `${count} arquivos selecionados`;

    // Render file items
    filesList.innerHTML = currentFiles.map(({ id, file }) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const isVideo = file.type.startsWith('video/') || ['mp4', 'mkv', 'avi'].includes(ext);
        const icon = isVideo
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 8 6 4-6 4Z"/></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;

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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" x2="6" y1="6" y2="18"/>
                        <line x1="6" x2="18" y1="6" y2="18"/>
                    </svg>
                </button>
            </div>
        `;
    }).join('');

    // Add remove event listeners
    filesList.querySelectorAll('.btn-remove-file').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            removeFile(id);
        });
    });
}

// Clear all files
btnClearAll.addEventListener('click', () => {
    currentFiles = [];
    fileInput.value = '';
    fileInfoSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
});

// =========================================
// Transcription Process (Multiple Files)
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

        // Initialize worker if needed
        if (!aiWorker) {
            aiWorker = new Worker('worker.js', { type: 'module' });
        }

        // Helper to run commands on worker as Promises
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

        // Step 1: Load model
        await runCommand(
            { type: 'load', model: selectedModel },
            (progress) => {
                if (progress.status === 'progress' && progress.progress) {
                    const pct = Math.round(progress.progress);
                    updateProgress(
                        'Baixando modelo de IA...',
                        `${progress.file || ''} — ${pct}%`,
                        5 + (pct * 0.25)
                    );
                } else if (progress.status === 'ready') {
                    updateProgress('Modelo carregado!', 'Iniciando transcrições...', 35);
                }
            }
        );

        // Step 2: Transcribe each file
        const transcriptionOptions = {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: true,
        };
        if (lang) transcriptionOptions.language = lang;

        for (let i = 0; i < totalFiles; i++) {
            const { file } = currentFiles[i];
            const fileNum = i + 1;
            const baseProgress = 35 + ((i / totalFiles) * 55);
            const fileProgress = 55 / totalFiles;

            updateProgress(
                `Transcrevendo arquivo ${fileNum} de ${totalFiles}...`,
                file.name,
                baseProgress
            );

            // Load audio
            updateProgress(
                `Processando áudio ${fileNum}/${totalFiles}...`,
                file.name,
                baseProgress + (fileProgress * 0.2)
            );
            const audioData = await loadAudioData(file);

            // Transcribe
            updateProgress(
                `Transcrevendo ${fileNum}/${totalFiles}...`,
                file.name,
                baseProgress + (fileProgress * 0.4)
            );
            
            const result = await runCommand({
                type: 'transcribe',
                audioData: audioData,
                options: transcriptionOptions
            });

            transcriptionResults.push({
                fileName: file.name,
                text: result.text || '',
                chunks: result.chunks || []
            });

            updateProgress(
                `Concluído ${fileNum}/${totalFiles}`,
                file.name,
                baseProgress + fileProgress
            );
        }

        // Step 3: Display all results
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
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
    });

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    let audioData;
    if (audioBuffer.numberOfChannels > 1) {
        const channel0 = audioBuffer.getChannelData(0);
        const channel1 = audioBuffer.getChannelData(1);
        audioData = new Float32Array(channel0.length);
        for (let i = 0; i < channel0.length; i++) {
            audioData[i] = (channel0[i] + channel1[i]) / 2;
        }
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
        const duration = chunks.length > 0
            ? chunks[chunks.length - 1].timestamp[1] || 0
            : 0;

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
                                <span>${wordCount} palavras</span>
                                <span>•</span>
                                <span>${charCount} caracteres</span>
                                ${duration > 0 ? `<span>•</span><span>${formatDuration(duration)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="result-card-actions">
                        <button class="btn-card-action btn-copy-single" data-index="${index}" title="Copiar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                            </svg>
                        </button>
                        <button class="btn-card-action btn-download-txt" data-index="${index}" title="Baixar .txt">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" x2="12" y1="15" y2="3"/>
                            </svg>
                        </button>
                        <button class="btn-card-action btn-download-srt" data-index="${index}" title="Baixar .srt">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M7 8h10M7 12h10M7 16h6"/>
                            </svg>
                        </button>
                        <button class="btn-card-toggle" data-index="${index}" title="Expandir/Recolher">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="result-card-content open" data-index="${index}">
                    ${contentHtml}
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners for card actions
    addCardEventListeners();
}

function addCardEventListeners() {
    // Copy single
    resultsContainer.querySelectorAll('.btn-copy-single').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            const text = getPlainTextForResult(index);
            navigator.clipboard.writeText(text).then(() => {
                showToast('Texto copiado!', 'success');
            });
        });
    });

    // Download TXT single
    resultsContainer.querySelectorAll('.btn-download-txt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            const result = transcriptionResults[index];
            const text = getPlainTextForResult(index);
            const baseName = result.fileName.replace(/\.[^.]+$/, '');
            downloadFile(`${baseName}_transcricao.txt`, text, 'text/plain');
            showToast('Arquivo TXT baixado!', 'success');
        });
    });

    // Download SRT single
    resultsContainer.querySelectorAll('.btn-download-srt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            const result = transcriptionResults[index];
            const srt = generateSRTForResult(index);
            const baseName = result.fileName.replace(/\.[^.]+$/, '');
            downloadFile(`${baseName}_legenda.srt`, srt, 'text/srt');
            showToast('Arquivo SRT baixado!', 'success');
        });
    });

    // Toggle card content
    resultsContainer.querySelectorAll('.btn-card-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = btn.getAttribute('data-index');
            const content = resultsContainer.querySelector(`.result-card-content[data-index="${index}"]`);
            const icon = btn.querySelector('svg');
            content.classList.toggle('open');
            if (content.classList.contains('open')) {
                icon.style.transform = 'rotate(0deg)';
            } else {
                icon.style.transform = 'rotate(-90deg)';
            }
        });
    });

    // Click header to toggle
    resultsContainer.querySelectorAll('.result-card-header').forEach(header => {
        header.addEventListener('click', () => {
            const index = header.getAttribute('data-index');
            const toggleBtn = header.querySelector('.btn-card-toggle');
            toggleBtn.click();
        });
    });
}

// =========================================
// Result Actions (All)
// =========================================

// Copy all
btnCopyAll.addEventListener('click', () => {
    const allText = transcriptionResults.map((r, i) => {
        const header = `=== ${r.fileName} ===`;
        const text = getPlainTextForResult(i);
        return `${header}\n${text}`;
    }).join('\n\n');

    navigator.clipboard.writeText(allText).then(() => {
        showToast('Todas as transcrições copiadas!', 'success');
    });
});

// Download all as single TXT
btnDownloadAll.addEventListener('click', () => {
    const allText = transcriptionResults.map((r, i) => {
        const header = `=== ${r.fileName} ===`;
        const text = getPlainTextForResult(i);
        return `${header}\n${text}`;
    }).join('\n\n');

    downloadFile('todas_transcricoes.txt', allText, 'text/plain');
    showToast('Arquivo TXT com todas as transcrições baixado!', 'success');
});

// New transcription
btnNew.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    currentFiles = [];
    fileInput.value = '';
    transcriptionResults = [];
    btnTranscribe.style.display = 'flex';
    btnTranscribe.disabled = false;
    const settingsRow = fileInfoSection.querySelector('.settings-row');
    if (settingsRow) {
        settingsRow.style.opacity = '1';
        settingsRow.style.pointerEvents = 'auto';
    }
});

// =========================================
// Helper Functions
// =========================================

function getPlainTextForResult(index) {
    const result = transcriptionResults[index];
    if (result.chunks.length > 0) {
        return result.chunks.map(c => {
            const start = formatTimestamp(c.timestamp[0]);
            const end = formatTimestamp(c.timestamp[1]);
            return `[${start} → ${end}] ${c.text.trim()}`;
        }).join('\n');
    }
    return result.text || '';
}

function generateSRTForResult(index) {
    const result = transcriptionResults[index];
    if (result.chunks.length === 0) return result.text || '';

    return result.chunks.map((chunk, i) => {
        const startSrt = formatSRTTimestamp(chunk.timestamp[0]);
        const endSrt = formatSRTTimestamp(chunk.timestamp[1]);
        return `${i + 1}\n${startSrt} --> ${endSrt}\n${chunk.text.trim()}\n`;
    }).join('\n');
}

function formatTimestamp(seconds) {
    if (seconds === null || seconds === undefined) return '??:??';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatSRTTimestamp(seconds) {
    if (seconds === null || seconds === undefined) return '00:00:00,000';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
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
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    toast.innerHTML = `
        ${type === 'success' ? '✅' : '❌'}
        ${message}
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
