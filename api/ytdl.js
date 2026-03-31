const { Innertube, UniversalCache } = require('youtubei.js');
const { Readable } = require('stream');

module.exports = async function handler(req, res) {
    // Configurações de CORS para a Vercel
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: 'Faltando o URL no link.' });
        }

        console.log('Iniciando Innertube para URL:', url);
        const yt = await Innertube.create({ 
            cache: new UniversalCache(false),
            generate_session_locally: true 
        });
        
        let videoId = url;
        const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
        if (videoIdMatch) {
            videoId = videoIdMatch[1];
        }

        console.log('Extraindo informações do Video ID:', videoId);
        const info = await yt.getInfo(videoId);

        if (!info || !info.basic_info) {
            throw new Error('Não foi possível obter informações do vídeo do YouTube.');
        }

        // Prepara para enviar o áudio
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(info.basic_info.title)}.webm"`);
        res.setHeader('Content-Type', 'audio/webm');

        console.log('Iniciando o download do áudio...');
        const stream = await yt.download(videoId, {
            type: 'audio',
            quality: 'best',
            format: 'webm'
        });

        // Transforma o fluxo web para o formato do Node 18+ (compatível com a Vercel)
        // Isso garante que o áudio seja enviado por "pedaços" (streaming) sem travar
        Readable.fromWeb(stream).pipe(res);

        res.on('finish', () => console.log('Download concluído com sucesso!'));
        res.on('error', (err) => console.error('Encontrei esse problema no meio do download:', err));

    } catch (error) {
        console.error('ERRO CRITICO NA VERCEL:', error);
        // Retorna o erro real para podermos ler no frontend em caso de bloqueio do YouTube
        if (!res.headersSent) {
            res.status(500).json({ 
                error: `Ops! A nuvem deu erro: ${error.message || 'Erro Desconhecido'}`,
                code: error.code || 'API_FAIL'
            });
        }
    }
};
