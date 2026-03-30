// =========================================
// Tab Switching
// =========================================

if (tabTranscribe && tabConvert) {
    tabTranscribe.addEventListener('click', () => {
        activeTab = 'transcribe';
        tabTranscribe.classList.add('active');
        tabConvert.classList.remove('active');
        uploadSection.classList.remove('hidden');
        fileInfoSection.classList.add('hidden');
        converterSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        btnNew.classList.add('hidden');
        
        // Reset states
        currentFiles = [];
        transcriptionResults = [];
        fileInput.value = '';
        filesCount.textContent = '1 arquivo selecionado';
        filesList.innerHTML = '';
        
        // Show upload section by default
        uploadSection.classList.remove('hidden');
    });
    
    tabConvert.addEventListener('click', () => {
        activeTab = 'convert';
        tabTranscribe.classList.remove('active');
        tabConvert.classList.add('active');
        converterSection.classList.remove('hidden');
        converterFileInfoSection.classList.add('hidden');
        converterResultSection.classList.add('hidden');
        converterBtnNew.classList.add('hidden');
        
        // Reset converter states
        converterFiles = [];
        converterResults = [];
        converterFileInput.value = '';
        converterFilesCount.textContent = '1 arquivo selecionado';
        converterFilesList.innerHTML = '';
        
        // Show upload section by default
        converterUploadZone.classList.remove('hidden');
    });
}

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

// Converter State
let converterFiles = []; // Array of { id, file }
let converterResults = []; // Array of { originalName, convertedName, data, mimeType }
let converterFileIdCounter = 0;
let activeTab = 'transcribe'; // 'transcribe' or 'convert'

// =========================================
// Converter File Upload Handling
// =========================================

// Click to upload
converterUploadZone.addEventListener('click', () => converterFileInput.click());

// File selected
converterFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleConverterFiles(e.target.files);
    }
    // Clear the input so the same files can be selected again if needed
    e.target.value = '';
});

// Drag & Drop
converterUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    converterUploadZone.classList.add('drag-over');
});

converterUploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    converterUploadZone.classList.remove('drag-over');
});

converterUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    converterUploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleConverterFiles(e.dataTransfer.files);
    }
});

// Valid file types for converter (video and audio)
const converterValidTypes = [
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/flac'
];
const converterValidExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac'];

function isConverterValidFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    return converterValidTypes.includes(file.type) || converterValidExts.includes(ext);
}

function handleConverterFiles(fileList) {
    let added = 0;
    for (const file of fileList) {
        if (isConverterValidFile(file)) {
            addConverterFile(file);
            added++;
        }
    }
    if (added === 0) {
        showToast('Nenhum formato suportado. Use áudio ou vídeo.', 'error');
    }
}

function addConverterFile(file) {
    const id = ++converterFileIdCounter;
    converterFiles.push({ id, file });
    renderConverterFilesList();
    converterUploadSection.classList.add('hidden');
    converterFileInfoSection.classList.remove('hidden');
}

function removeConverterFile(id) {
    converterFiles = converterFiles.filter(f => f.id !== id);
    if (converterFiles.length === 0) {
        converterFileInfoSection.classList.add('hidden');
        converterUploadSection.classList.remove('hidden');
        converterFileInput.value = '';
    } else {
        renderConverterFilesList();
    }
}

function renderConverterFilesList() {
    // Update count
    const count = converterFiles.length;
    converterFilesCount.textContent = count === 1
        ? '1 arquivo selecionado'
        : `${count} arquivos selecionados`;

    // Render file items
    converterFilesList.innerHTML = converterFiles.map(({ id, file }) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext);
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
    converterFilesList.querySelectorAll('.btn-remove-file').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            removeConverterFile(id);
        });
    });
}

// Clear all converter files
converterBtnClearAll.addEventListener('click', () => {
    converterFiles = [];
    converterFileInput.value = '';
    converterFileInfoSection.classList.add('hidden');
    converterUploadSection.classList.remove('hidden');
});

// Show settings when files are added
function showConverterSettings() {
    converterSettings.classList.remove('hidden');
}

// Hide settings when no files
function hideConverterSettings() {
    converterSettings.classList.add('hidden');
}

// Update renderConverterFilesList to show/hide settings
const originalRenderConverterFilesList = renderConverterFilesList;
renderConverterFilesList = function() {
    originalRenderConverterFilesList.call(this);
    if (converterFiles.length > 0) {
        showConverterSettings();
    } else {
        hideConverterSettings();
    }
};

// Initialize converter state
hideConverterSettings();

// =========================================
// Conversion Process
// =========================================

async function startConversion() {
    if (converterFiles.length === 0) return;

    btnConvert.disabled = true;
    converterProgressSection.classList.remove('hidden');
    converterSettings.style.opacity = '0.5';
    converterSettings.style.pointerEvents = 'none';
    btnConvert.style.display = 'none';

    converterResults = [];
    const totalFiles = converterFiles.length;

    try {
        updateConverterProgress('Iniciando conversão...', 'Preparando arquivos', 5);

        // Process each file
        for (let i = 0; i < totalFiles; i++) {
            const { file } = converterFiles[i];
            const fileNum = i + 1;
            const baseProgress = 5 + ((i / totalFiles) * 90);
            const fileProgress = 90 / totalFiles;

            updateConverterProgress(
                `Convertendo arquivo ${fileNum} de ${totalFiles}...`,
                file.name,
                baseProgress
            );

            // Convert the file
            const convertedFile = await convertFile(file, {
                format: converterOutputFormatSelect.value,
                quality: converterQualitySelect.value
            });

            converterResults.push({
                originalName: file.name,
                convertedName: convertedFile.name,
                data: convertedFile.data,
                mimeType: convertedFile.mimeType
            });

            updateConverterProgress(
                `Concluído ${fileNum}/${totalFiles}`,
                file.name,
                baseProgress + fileProgress
            );
        }

        // Step: Display all results
        updateConverterProgress('Finalizando...', 'Formatando resultados', 95);
        displayConverterResults();

        updateConverterProgress('Concluído!', `${totalFiles} arquivo${totalFiles > 1 ? 's' : ''} convertido${totalFiles > 1 ? 's' : ''}`, 100);

        setTimeout(() => {
            converterProgressSection.classList.add('hidden');
            converterResultSection.classList.remove('hidden');
            converterFileInfoSection.classList.add('hidden');
        }, 500);

    } catch (error) {
        console.error('Conversion error:', error);
        converterProgressSection.classList.add('hidden');
        btnConvert.style.display = 'flex';
        btnConvert.disabled = false;
        converterSettings.style.opacity = '1';
        converterSettings.style.pointerEvents = 'auto';

        showToast(`Erro: ${error.message}`, 'error');
    }
}

// Simple file conversion function
async function convertFile(file, options) {
    return new Promise((resolve, reject) => {
        // For now, we'll just change the extension and provide the same data
        // In a real implementation, we would actually convert the file
        // This is a simplified version for demonstration
        
        const fileReader = new FileReader();
        fileReader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                
                // For demonstration, we're just changing the extension
                // A real implementation would use Web Audio API or similar to convert
                const originalName = file.name;
                const extIndex = originalName.lastIndexOf('.');
                const nameWithoutExt = extIndex > 0 ? originalName.substring(0, extIndex) : originalName;
                const newExt = options.format;
                const newName = `${nameWithoutExt}.${newExt}`;
                
                // Determine MIME type based on format
                let mimeType;
                switch (options.format) {
                    case 'mp3':
                        mimeType = 'audio/mpeg';
                        break;
                    case 'wav':
                        mimeType = 'audio/wav';
                        break;
                    case 'ogg':
                        mimeType = 'audio/ogg';
                        break;
                    case 'm4a':
                        mimeType = 'audio/mp4';
                        break;
                    case 'flac':
                        mimeType = 'audio/flac';
                        break;
                    default:
                        mimeType = file.type;
                }
                
                resolve({
                    name: newName,
                    data: arrayBuffer,
                    mimeType: mimeType
                });
            } catch (err) {
                reject(err);
            }
        };
        fileReader.onerror = (err) => reject(err);
        fileReader.readAsArrayBuffer(file);
    });
}

// Update converter progress
function updateConverterProgress(title, detail, percent) {
    converterProgressTitle.textContent = title;
    converterProgressDetail.textContent = detail;
    converterProgressBar.style.width = `${Math.min(percent, 100)}%`;
    converterProgressPercent.textContent = `${Math.round(percent)}%`;
}

// Display converter results
function displayConverterResults() {
    converterResultsContainer.innerHTML = converterResults.map((result, index) => {
        const { originalName, convertedName } = result;
        
        return `
            <div class="result-card" data-index="${index}">
                <div class="result-card-header" data-index="${index}">
                    <div class="result-card-title">
                        <span class="result-card-number">${index + 1}</span>
                        <div class="result-card-file-info">
                            <span class="result-card-name">${escapeHtml(convertedName)}</span>
                            <div class="result-card-stats">
                                <span>Convertido de</span>
                                <span>•</span>
                                <span>${escapeHtml(originalName)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="result-card-actions">
                        <button class="btn-card-action btn-download-converted" data-index="${index}" title="Baixar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" x2="12" y1="15" y2="3"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners for download buttons
    converterResultsContainer.querySelectorAll('.btn-download-converted').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            const result = converterResults[index];
            downloadFile(result.convertedName, result.data, result.mimeType);
            showToast('Arquivo convertido baixado!', 'success');
        });
    });
}

// Convert button
btnConvert.addEventListener('click', startConversion);

// New conversion
converterBtnNew.addEventListener('click', () => {
    converterResultSection.classList.add('hidden');
    converterUploadSection.classList.remove('hidden');
    converterFiles = [];
    converterResults = [];
    converterFileInput.value = '';
    btnConvert.style.display = 'flex';
    btnConvert.disabled = false;
    converterSettings.style.opacity = '1';
    converterSettings.style.pointerEvents = 'auto';
});