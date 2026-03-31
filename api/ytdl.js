const { Innertube, UniversalCache } = require('youtubei.js');
const { Readable } = require('stream');

module.exports = async function handler(req, res) {
    // Super-CORS: Libera tudo mesmo!
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache do CORS por 24h

    // Responde ao pré-check do navegador (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: 'Link ausente.' });

        console.log('Fábrica de Áudio Iniciando...');
        
        // Versão mais leve p/ Vercel sem cache pesado
        const yt = await Innertube.create({ 
            cache: new UniversalCache(false),
            generate_session_locally: true
        });
        
        const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
        const videoId = videoIdMatch ? videoIdMatch[1] : url;

        console.log('Capturando info do vídeo:', videoId);
        const info = await yt.getInfo(videoId);
        
        if (!info || !info.basic_info) {
            throw new Error('Vídeo não encontrado ou bloqueado pelo YouTube.');
        }

        // Headers para download direto
        const filename = encodeURIComponent(info.basic_info.title || 'audio');
        res.setHeader('Content-Type', 'audio/webm');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.webm"`);

        // Extrai o áudio
        const stream = await yt.download(videoId, {
            type: 'audio',
            quality: 'best',
            format: 'webm'
        });

        // Envia o áudio em pedaços (streaming)
        Readable.fromWeb(stream).pipe(res);

    } catch (error) {
        console.error('Falha na Nuvem:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: error.message || 'Erro Desconhecido',
                code: 'CLOUD_X' 
            });
        }
    }
};
