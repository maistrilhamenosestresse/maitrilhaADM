import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL || 'https://maitrilhaadm-production.up.railway.app';
const SECRET = process.env.WHATSAPP_API_SECRET || 'mais-trilha-123';

export async function POST(req: Request) {
  try {
    const { agenda, notifyGroup, notifyClients, groupInvite } = await req.json();

    if (!agenda) {
      return NextResponse.json({ error: 'Agenda is required' }, { status: 400 });
    }

    const globalSiteUrl = "https://maistrilha.vercel.app/agenda";
    
    // Constrói a mensagem bonita de marketing
    const campaignMessage = `🏕️ *NOVA TRILHA DISPONÍVEL!* 🥾\n\n` +
      `Prepare sua mochila, porque a nossa nova aventura já está confirmada:\n\n` +
      `⛰️ *${agenda.title}*\n` +
      `📅 Data: ${agenda.date.split('-').reverse().join('/')}\n` +
      `💰 Valor: R$ ${agenda.price.toFixed(2).replace('.', ',')}\n\n` +
      `👉 *Garanta sua vaga agora mesmo no link oficial:*\n${globalSiteUrl}\n\n` +
      `A natureza chama! Vem com a Mais Trilha Menos Estresse! 🌿`;

    let groupResult = null;
    let clientsResult = null;

    // 1. Notificar Grupo (Imediato via Bot)
    if (notifyGroup && groupInvite) {
      try {
        // Tenta entrar no grupo
        const joinRes = await fetch(`${BOT_URL}/api/group/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
          body: JSON.stringify({ inviteCode: groupInvite })
        });
        
        const joinData = await joinRes.json();
        const groupId = joinData.groupId;

        if (groupId) {
          // Dispara a mensagem com a foto (flyer_url) se existir
          const sendRes = await fetch(`${BOT_URL}/api/group/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
            body: JSON.stringify({ 
                groupId, 
                message: campaignMessage,
                media_url: agenda.flyer_url || (agenda.images && agenda.images[0]) || null
            })
          });
          groupResult = await sendRes.json();
        }
      } catch (e: any) {
        console.error("Erro ao enviar pro grupo:", e.message);
      }
    }

    // 2. Notificar Clientes (Vai para a fila anti-ban do Supabase)
    if (notifyClients) {
      try {
        // Puxa todos os clientes
        const { data: clients } = await supabase.from('clients').select('phone, full_name');
        
        if (clients && clients.length > 0) {
          // Remove duplicados pelo telefone
          const uniqueClients = Array.from(new Map(clients.map(c => [c.phone, c])).values());
          
          const payload = uniqueClients.map(client => ({
            client_name: client.full_name,
            client_phone: client.phone,
            message: `Olá ${client.full_name.split(' ')[0]}!\n\n${campaignMessage}`,
            media_url: agenda.flyer_url || (agenda.images && agenda.images[0]) || null,
            status: 'pending'
          }));

          const { error } = await supabase.from('whatsapp_messages').insert(payload);
          if (!error) {
            clientsResult = `${payload.length} agendados`;
            // Aciona o gatilho da fila
            fetch(`${BOT_URL}/api/trigger-queue`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
              body: JSON.stringify({})
            }).catch(() => {});
          }
        }
      } catch (e: any) {
        console.error("Erro ao enfileirar clientes:", e.message);
      }
    }

    return NextResponse.json({ success: true, groupResult, clientsResult });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
