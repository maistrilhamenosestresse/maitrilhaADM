const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

// Configuração do Servidor Express para Health Check (Essencial para a Railway)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot do WhatsApp da Mais Trilha está online e rodando perfeitamente!');
});

app.listen(PORT, () => {
    console.log(`[Express] Servidor de Health Check rodando na porta ${PORT}`);
});

// Configuração do cliente do WhatsApp com argumentos essenciais para o servidor Linux da Railway
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Apenas se houver problemas de memória
            '--disable-gpu'
        ]
    }
});

// Geração do QR Code no terminal (Logs da Railway)
client.on('qr', (qr) => {
    console.log('========================================================');
    console.log('ATENÇÃO: Escaneie o QR Code abaixo no painel da Railway!');
    console.log('========================================================');
    qrcode.generate(qr, { small: true });
});

// Confirmação de conexão
client.on('ready', () => {
    console.log('✅ Robô do WhatsApp conectado e pronto para uso!');
});

// Tratamento de erros de autenticação ou desconexão
client.on('disconnected', (reason) => {
    console.log('❌ O WhatsApp foi desconectado. Motivo:', reason);
    // Destrói a sessão para forçar a geração de um novo QR Code se cair
    client.destroy();
    client.initialize();
});

// Escutador de mensagens (Exemplo base)
client.on('message', message => {
    if(message.body === '!ping') {
        message.reply('pong');
    }
});

// Inicialização
client.initialize();
