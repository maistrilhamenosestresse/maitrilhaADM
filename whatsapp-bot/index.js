const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.WHATSAPP_API_KEY || 'M@isTrilh@S3cur3K3y2026';

// Supabase (para ler a fila do banco)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

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
// UTILITÁRIOS E FILA ANTI-BAN (SUPABASE)
// ---------------------------------------------------------
function formatNumber(phone) {
    let clean = phone.replace(/\D/g, ''); 
    if (!clean.startsWith('55') && clean.length <= 11) {
        clean = '55' + clean;
    }
    return clean + '@c.us';
}

let isBroadcasting = false;

// Rotina que varre o Supabase a cada 1 minuto buscando mensagens agendadas
async function pollSupabaseQueue() {
    if (isBroadcasting || !isClientReady || !supabase) return;
    
    // Busca mensagens pendentes e que o horário agendado já chegou
    const { data: messages, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(10); // Processa lotes de 10 por vez para evitar sobrecarga

    if (error) {
        console.error('[Queue Error]', error.message);
        return;
    }
    
    if (!messages || messages.length === 0) return;

    isBroadcasting = true;
    console.log(`[Queue] Encontradas ${messages.length} mensagens para disparo...`);

    for (let i = 0; i < messages.length; i++) {
        const task = messages[i];
        try {
            const formatted = formatNumber(task.client_phone);
            await client.sendMessage(formatted, task.message);
            console.log(`[Queue] Mensagem enviada com sucesso para ${formatted}`);
            
            // Marca como enviada
            await supabase.from('whatsapp_messages').update({ status: 'sent' }).eq('id', task.id);
        } catch (err) {
            console.log(`[Queue] Erro ao enviar para ${task.client_phone}:`, err.message);
            await supabase.from('whatsapp_messages').update({ status: 'error', error_log: err.message }).eq('id', task.id);
        }
        
        // Delay anti-ban reduzido (15 segundos) entre envios do mesmo lote
        if (i < messages.length - 1) {
            console.log(`[Queue] Pausa Anti-Ban de 15 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
        }
    }
    
    isBroadcasting = false;
    console.log('[Queue] Lote finalizado!');
}

// Inicia o "Motor de Busca" a cada 15 segundos para ser mais ágil
setInterval(pollSupabaseQueue, 15000);


// ---------------------------------------------------------
// ROTAS DA API DO WHATSAPP (Apenas chamadas autorizadas)
// ---------------------------------------------------------

// Rota de Status
app.get('/api/status', authMiddleware, async (req, res) => {
    res.json({
        online: isClientReady,
        is_broadcasting: isBroadcasting
    });
});

// Força o robô a puxar a fila imediatamente (Usado pela Vercel após agendar)
app.post('/api/trigger-queue', authMiddleware, async (req, res) => {
    if (!isClientReady || isBroadcasting) return res.json({ success: true, message: 'Fila já está rodando ou robô offline.' });
    pollSupabaseQueue();
    res.json({ success: true, message: 'Fila disparada com sucesso!' });
});

// Envio Individual Imediato (Sem ir para o banco, ex: Recibo do Checkout)
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


// ---------------------------------------------------------
// INICIALIZAÇÃO DO SERVIDOR E DO WHATSAPP
// ---------------------------------------------------------
app.listen(PORT, () => {
    console.log(`[Express] Servidor e API Central rodando na porta ${PORT}`);
    if (!supabase) console.log('⚠️ AVISO: SUPABASE_URL não configurada no robô. A fila de agendamentos não funcionará.');
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
    // Tenta puxar a fila logo ao conectar
    pollSupabaseQueue();
});

client.on('disconnected', (reason) => {
    isClientReady = false;
    console.log('❌ WhatsApp Desconectado. Motivo:', reason);
    client.destroy();
    client.initialize();
});

client.initialize();
