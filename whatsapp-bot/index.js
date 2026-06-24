const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.WHATSAPP_API_KEY || 'M@isTrilh@S3cur3K3y2026';

app.use(express.json());

let currentQR = '';
let isClientReady = false;

// ---------------------------------------------------------
// EXPRESS: PÁGINA PÚBLICA DO QR CODE
// ---------------------------------------------------------
app.get('/', (req, res) => {
    if (currentQR) {
        res.send(`
            <html>
                <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; background-color:#f0f2f5;">
                    <h2 style="color:#333;">Escaneie o QR Code com seu WhatsApp</h2>
                    <div id="qrcode" style="background:white; padding:20px; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.1);"></div>
                    <p style="color:#666; margin-top:20px;">A página atualiza sozinha...</p>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                    <script>
                        new QRCode(document.getElementById("qrcode"), "${currentQR}");
                        setTimeout(() => location.reload(), 5000);
                    </script>
                </body>
            </html>
        `);
    } else if (isClientReady) {
        res.send('<h1>✅ Bot do WhatsApp da Mais Trilha está ONLINE e Conectado!</h1>');
    } else {
        res.send('<h1>⏳ Iniciando o robô do WhatsApp... aguarde!</h1><script>setTimeout(()=>location.reload(), 3000);</script>');
    }
});

// ---------------------------------------------------------
// MIDDLEWARE DE SEGURANÇA
// ---------------------------------------------------------
const authMiddleware = (req, res, next) => {
    const key = req.headers['x-api-key'] || req.query.key;
    if (key !== API_KEY) {
        return res.status(401).json({ error: 'Não autorizado. Chave de API inválida.' });
    }
    next();
};

// ---------------------------------------------------------
// UTILITÁRIOS E FILA ANTI-BAN
// ---------------------------------------------------------
function formatNumber(phone) {
    let clean = phone.replace(/\D/g, ''); // Limpa tudo que não for número
    if (!clean.startsWith('55') && clean.length <= 11) {
        clean = '55' + clean;
    }
    return clean + '@c.us';
}

const broadcastQueue = [];
let isBroadcasting = false;

async function processQueue() {
    if (isBroadcasting || broadcastQueue.length === 0) return;
    isBroadcasting = true;

    while (broadcastQueue.length > 0) {
        const task = broadcastQueue.shift();
        try {
            await client.sendMessage(task.number, task.message);
            console.log(`[Broadcast] Mensagem enviada para ${task.number}`);
        } catch (error) {
            console.log(`[Broadcast] Erro ao enviar para ${task.number}:`, error.message);
        }
        
        if (broadcastQueue.length > 0) {
            console.log(`[Broadcast] Pausa Anti-Ban de 60 segundos... (Restam: ${broadcastQueue.length} contatos na fila)`);
            await new Promise(resolve => setTimeout(resolve, 60000)); // Delay exato de 1 minuto
        }
    }
    isBroadcasting = false;
    console.log('[Broadcast] Fila de envios em massa totalmente concluída!');
}

// ---------------------------------------------------------
// ROTAS DA API DO WHATSAPP (Apenas chamadas autorizadas)
// ---------------------------------------------------------

// Rota de Status
app.get('/api/status', authMiddleware, async (req, res) => {
    res.json({
        online: isClientReady,
        queue_length: broadcastQueue.length,
        is_broadcasting: isBroadcasting
    });
});

// Envio Individual Imediato
app.post('/api/send/individual', authMiddleware, async (req, res) => {
    if (!isClientReady) return res.status(503).json({ error: 'WhatsApp não está conectado.' });
    
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'Faltam os campos phone e message.' });

    try {
        const formatted = formatNumber(phone);
        await client.sendMessage(formatted, message);
        res.json({ success: true, formattedPhone: formatted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Envio em Massa (Broadcast com Fila)
app.post('/api/send/broadcast', authMiddleware, async (req, res) => {
    if (!isClientReady) return res.status(503).json({ error: 'WhatsApp não está conectado.' });
    
    const { contacts, message } = req.body; // contacts deve ser um array de telefones
    if (!contacts || !Array.isArray(contacts) || !message) {
        return res.status(400).json({ error: 'Formato inválido. contacts deve ser um array e message uma string.' });
    }

    // Adiciona todos os contatos na fila
    contacts.forEach(phone => {
        broadcastQueue.push({ number: formatNumber(phone), message });
    });

    // Inicia o processamento da fila sem travar a requisição atual
    processQueue();

    res.json({ 
        success: true, 
        message: `Foram adicionados ${contacts.length} contatos na fila de envio.`,
        estimated_time_minutes: contacts.length // 1 contato = 1 minuto
    });
});


// ---------------------------------------------------------
// INICIALIZAÇÃO DO SERVIDOR E DO WHATSAPP
// ---------------------------------------------------------
app.listen(PORT, () => {
    console.log(`[Express] Servidor e API Central rodando na porta ${PORT}`);
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    currentQR = qr;
    isClientReady = false;
    console.log('ATENÇÃO: O QR Code está disponível na URL pública do site!');
});

client.on('ready', () => {
    currentQR = '';
    isClientReady = true;
    console.log('✅ Robô do WhatsApp conectado e pronto para uso!');
});

client.on('disconnected', (reason) => {
    isClientReady = false;
    console.log('❌ WhatsApp Desconectado. Motivo:', reason);
    client.destroy();
    client.initialize();
});

client.initialize();
