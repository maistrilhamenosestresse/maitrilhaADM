import { NextResponse } from 'next/server';

// Esta rota serve como uma "Ponte Segura" entre o painel da Vercel e o Robô na Railway.
// O Frontend chama esta rota, e esta rota chama a Railway com a chave secreta.

const RAILWAY_URL = process.env.WHATSAPP_API_URL || ''; // Ex: https://meu-bot-app.up.railway.app
const API_KEY = process.env.WHATSAPP_API_KEY || 'M@isTrilh@S3cur3K3y2026'; // Chave padrão que definimos no robô

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, phone, message, contacts } = body;

    if (!RAILWAY_URL) {
      return NextResponse.json({ error: 'A URL do robô (WHATSAPP_API_URL) não foi configurada.' }, { status: 500 });
    }

    let endpoint = '';
    let payload = {};

    if (action === 'individual') {
      endpoint = '/api/send/individual';
      payload = { phone, message };
    } else if (action === 'trigger') {
      endpoint = '/api/trigger-queue';
      payload = {};
    } else {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    const response = await fetch(`${RAILWAY_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro desconhecido na comunicação com o robô.');
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Erro na ponte do WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // Rota para checar o status do bot
  try {
    if (!RAILWAY_URL) {
      return NextResponse.json({ error: 'A URL do robô não foi configurada.' }, { status: 500 });
    }

    const response = await fetch(`${RAILWAY_URL}/api/status`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erro ao checar status do WhatsApp:', error);
    return NextResponse.json({ error: 'Robô offline ou URL incorreta.' }, { status: 500 });
  }
}
