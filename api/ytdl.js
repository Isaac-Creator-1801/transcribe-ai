const { Innertube, UniversalCache } = require('youtubei.js');

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
            return res.status(400).json({ error: 'URL do YouTube ausente.' });
        }

        // Evita usar cache persistente no servidor Serverless
        const yt = await Innertube.create({ cache: new UniversalCache(false) });
        
        let videoId = url;
        const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
        if (videoIdMatch) {
            videoId = videoIdMatch[1];
        }

        const info = await yt.getInfo(videoId);

        // Prepara para enviar o áudio magicamente
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(info.basic_info.title)}.webm"`);
        res.setHeader('Content-Type', 'audio/webm');

        const stream = await yt.download(videoId, {
            type: 'audio',
            quality: 'best',
            format: 'webm'
        });

        // Transforma o fluxo web em fluxo do Servidor Nuvem (Node.js)
        const reader = stream.getReader();
        const pump = async () => {
             const { done, value } = await reader.read();
             if (done) {
                 res.end();
                 return;
             }
             res.write(Buffer.from(value));
             await pump();
        };
        await pump();

    } catch (error) {
        console.error('Erro na Vercel Function:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Falha ao decodificar vídeo online.' });
        } else {
            res.end();
        }
    }
};
