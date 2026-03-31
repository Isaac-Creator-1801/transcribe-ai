const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname))); // Serve os arquivos do front-end na raiz local

app.get('/api/ytdl', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url || !ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'URL do YouTube inválida ou ausente.' });
        }

        // Puxa informações do video (para nomear o arquivo se quisermos, mas mais pra validar)
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;

        // Avisar o frontend que é um arquivo de áudio (mp3/webm)
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.webm"`);
        res.setHeader('Content-Type', 'audio/webm');

        // Configuração de extração (só áudio, otimizado)
        const stream = ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio'
        });

        // Repassar o fluxo de dados diretamente pro front-end (Streaming Mágico)
        stream.pipe(res);

        stream.on('error', (err) => {
            console.error('Erro no fluxo do YouTube:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Falha ao processar o vídeo.' });
            }
        });

    } catch (error) {
        console.error('Erro no download:', error);
        res.status(500).json({ error: 'Falha ao tentar baixar informações do vídeo.' });
    }
});

app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`Tudo certo! TranscribeAI rodando localmente.`);
    console.log(`Abra seu navegador em: http://localhost:${PORT}`);
    console.log(`===============================================`);
});
