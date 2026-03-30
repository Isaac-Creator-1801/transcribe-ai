// =========================================
// TranscribeAI - App Logic
// Uses Whisper via Transformers.js (runs in-browser)
// =========================================

import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1';

// =========================================
// DOM Elements
// =========================================
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const btnRecord = document.getElementById('btn-record');
const recordingTimer = document.getElementById('recording-timer');
const uploadSection = document.getElementById('upload-section');
const fileInfoSection = document.getElementById('file-info-section');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const fileIcon = document.getElementById('file-icon');
const btnRemove = document.getElementById('btn-remove');
const btnTranscribe = document.getElementById('btn-transcribe');
const languageSelect = document.getElementById('language-select');
const modelSelect = document.getElementById('model-select');
const progressSection = document.getElementById('progress-section');
const progressTitle = document.getElementById('progress-title');
const progressDetail = document.getElementById('progress-detail');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const resultSection = document.getElementById('result-section');
const resultContent = document.getElementById('result-content');
const resultStats = document.getElementById('result-stats');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const btnDownloadSrt = document.getElementById('btn-download-srt');
const btnNew = document.getElementById('btn-new');

// =========================================
// State
// =========================================
let currentFile = null;
let transcriber = null;
let transcriptionChunks = [];
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let startTime = null;

// =========================================
// File Upload Handling
// =========================================

// Click to upload
uploadZone.addEventListener('click', () => fileInput.click());

// File selected
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Drag & Drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});

// Recording Handling
btnRecord.addEventListener('click', (e) => {
    e.stopPropagation(); // Don't trigger file input click
    
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
            
            handleFile(file);
            
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
        
        recordingInterval = setInterval(updateTimer, 100);
        
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

function updateTimer() {
    const elapsed = Date.now() - startTime;
    recordingTimer.textContent = formatTime(elapsed);
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

uploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFile(file) {
    const validTypes = [
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
        'audio/aac', 'audio/x-m4a', 'audio/flac',
        'video/mp4', 'video/webm', 'video/ogg', 'video/x-matroska'
    ];

    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac', 'mp4', 'mkv', 'avi'];

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
        showToast('Formato não suportado. Use áudio ou vídeo.', 'error');
        return;
    }

    currentFile = file;

    // Update UI
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    // Update icon based on type
    const isVideo = file.type.startsWith('video/') || ['mp4', 'mkv', 'avi', 'webm'].includes(ext);
    fileIcon.innerHTML = isVideo
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 8 6 4-6 4Z"/>
           </svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
           </svg>`;

    uploadSection.classList.add('hidden');
    fileInfoSection.classList.remove('hidden');
}

// Remove file
btnRemove.addEventListener('click', () => {
    currentFile = null;
    fileInput.value = '';
    fileInfoSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
});

// =========================================
// Transcription Process
// =========================================

btnTranscribe.addEventListener('click', startTranscription);

async function startTranscription() {
    if (!currentFile) return;

    btnTranscribe.disabled = true;
    progressSection.classList.remove('hidden');
    fileInfoSection.querySelector('.settings-row').style.opacity = '0.5';
    fileInfoSection.querySelector('.settings-row').style.pointerEvents = 'none';
    btnTranscribe.style.display = 'none';

    try {
        // Step 1: Load audio
        updateProgress('Processando áudio...', 'Extraindo dados do arquivo', 10);
        const audioData = await loadAudioData(currentFile);

        // Step 2: Load model
        const selectedModel = modelSelect.value;
        const selectedLang = languageSelect.value;
        const lang = selectedLang === 'null' ? null : selectedLang;

        updateProgress('Carregando modelo de IA...', `Modelo: ${selectedModel.split('/')[1]} — pode levar um minuto na primeira vez`, 20);

        if (!transcriber || transcriber._modelId !== selectedModel) {
            transcriber = await pipeline(
                'automatic-speech-recognition',
                selectedModel,
                {
                    dtype: 'q8',
                    device: 'wasm',
                    progress_callback: (progress) => {
                        if (progress.status === 'progress' && progress.progress) {
                            const pct = Math.round(progress.progress);
                            updateProgress(
                                'Baixando modelo de IA...',
                                `${progress.file || ''} — ${pct}%`,
                                20 + (pct * 0.4)
                            );
                        } else if (progress.status === 'ready') {
                            updateProgress('Modelo carregado!', 'Iniciando transcrição...', 65);
                        }
                    }
                }
            );
            transcriber._modelId = selectedModel;
        }

        // Step 3: Transcribe
        updateProgress('Transcrevendo...', 'A IA está processando o áudio', 70);

        const options = {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: true,
        };

        if (lang) {
            options.language = lang;
        }

        const result = await transcriber(audioData, options);

        updateProgress('Finalizando...', 'Formatando resultado', 95);

        // Step 4: Display results
        transcriptionChunks = result.chunks || [];
        const fullText = result.text || '';

        displayResults(fullText, transcriptionChunks);

        updateProgress('Concluído!', '', 100);

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

    // Get mono audio data at 16kHz
    let audioData;
    if (audioBuffer.numberOfChannels > 1) {
        // Mix to mono
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
// Display Results
// =========================================

function displayResults(fullText, chunks) {
    // Stats
    const wordCount = fullText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const charCount = fullText.length;
    const duration = chunks.length > 0
        ? chunks[chunks.length - 1].timestamp[1] || 0
        : 0;

    resultStats.innerHTML = `
        <span class="stat-item">Palavras: <span class="stat-value">${wordCount}</span></span>
        <span class="stat-item">Caracteres: <span class="stat-value">${charCount}</span></span>
        ${duration > 0 ? `<span class="stat-item">Duração: <span class="stat-value">${formatDuration(duration)}</span></span>` : ''}
    `;

    // Content
    if (chunks.length > 0) {
        resultContent.innerHTML = chunks.map((chunk, i) => {
            const startTime = formatTimestamp(chunk.timestamp[0]);
            const endTime = formatTimestamp(chunk.timestamp[1]);
            return `
                <div class="chunk">
                    <span class="timestamp">${startTime} → ${endTime}</span>
                    <span>${escapeHtml(chunk.text.trim())}</span>
                </div>
            `;
        }).join('');
    } else {
        resultContent.innerHTML = `<p>${escapeHtml(fullText)}</p>`;
    }
}

// =========================================
// Result Actions
// =========================================

// Copy
btnCopy.addEventListener('click', () => {
    const text = getPlainText();
    navigator.clipboard.writeText(text).then(() => {
        btnCopy.classList.add('copied');
        btnCopy.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Copiado!
        `;
        showToast('Texto copiado!', 'success');
        setTimeout(() => {
            btnCopy.classList.remove('copied');
            btnCopy.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
                Copiar
            `;
        }, 2000);
    });
});

// Download TXT
btnDownload.addEventListener('click', () => {
    const text = getPlainText();
    const baseName = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'transcricao';
    downloadFile(`${baseName}_transcricao.txt`, text, 'text/plain');
    showToast('Arquivo TXT baixado!', 'success');
});

// Download SRT
btnDownloadSrt.addEventListener('click', () => {
    const srt = generateSRT();
    const baseName = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'transcricao';
    downloadFile(`${baseName}_legenda.srt`, srt, 'text/srt');
    showToast('Arquivo SRT baixado!', 'success');
});

// New transcription
btnNew.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    currentFile = null;
    fileInput.value = '';
    transcriptionChunks = [];
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

function getPlainText() {
    if (transcriptionChunks.length > 0) {
        return transcriptionChunks.map(c => {
            const start = formatTimestamp(c.timestamp[0]);
            const end = formatTimestamp(c.timestamp[1]);
            return `[${start} → ${end}] ${c.text.trim()}`;
        }).join('\n');
    }
    return resultContent.textContent || '';
}

function generateSRT() {
    if (transcriptionChunks.length === 0) return getPlainText();

    return transcriptionChunks.map((chunk, i) => {
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
