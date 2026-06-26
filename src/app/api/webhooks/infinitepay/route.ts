import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos o Service Role Key aqui para by-passar o RLS de forma segura, 
// pois este código roda no servidor e não no cliente.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ESSA CHAVE DEVE SER CRIADA NO .env.local
);

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Dados enviados pelo Webhook da InfinitePay (podem vir dentro de payload, data, ou direto na raiz)
    const payloadInfo = data.payload || data.data || data;

    const { 
      invoice_slug, 
      amount, 
      paid_amount, 
      capture_method, 
      transaction_nsu, 
      order_nsu 
    } = payloadInfo;

    // Se o evento não for de pagamento aprovado, podemos ignorar (opcional)
    if (data.event && data.event !== 'payment_approved') {
      console.log('Ignorando evento:', data.event);
      return NextResponse.json({ success: true, message: 'Evento ignorado' }, { status: 200 });
    }

    if (!order_nsu) {
      console.error('Webhook Inválido. Payload recebido:', JSON.stringify(data));
      // Tentar salvar a falha na tabela de notificações para debug visual no painel
      try {
        await supabase.from('notificacoes').insert([{
          reserva_id: null,
          mensagem: `[ERRO WEBHOOK] Payload inesperado recebido. Confira os logs. Conteúdo: ${JSON.stringify(data).substring(0, 150)}`,
          lida: false
        }]);
      } catch (e) {}
      
      return NextResponse.json({ success: false, message: 'Pedido não encontrado' }, { status: 400 });
    }

    // O order_nsu será o ID da reserva
    const reserva_id = order_nsu;

    if (reserva_id) {
      // 1. Atualizar a Tabela de Reservas no Supabase marcando como Pago
      const { error } = await supabase
        .from('reservas')
        .update({ 
          status_pagamento: 'pago',
          valor_pago: paid_amount / 100, // Converte de volta de centavos para Reais
          metodo_pagamento: capture_method || 'infinitepay',
        })
        .eq('id', reserva_id);

      if (error) {
        console.error("Erro ao atualizar reserva:", error);
        // Mesmo que falhe o db, vamos retornar 200 pra InfinitePay não ficar tentando de novo infinitamente
      } else {
        // 2. Buscar Dados para Notificação e Email
        const { data: reservaData } = await supabase
          .from('reservas')
          .select('*, clients(*), agendas(*)')
          .eq('id', reserva_id)
          .single();

        if (reservaData && reservaData.clients && reservaData.agendas) {
          const client = reservaData.clients;
          const agenda = reservaData.agendas;

          // 3. Inserir Notificação para o Admin
          await supabase.from('notificacoes').insert([
            {
              reserva_id: reserva_id,
              mensagem: `Nova venda! ${client.full_name} comprou a trilha ${agenda.title}.`,
              lida: false
            }
          ]);

          // 4. Disparar o E-mail para Cliente e Administradores
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            await fetch(`${baseUrl}/api/send-purchase-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ client, agenda })
            });
            console.log(`[SUCESSO] Email enviado para compra da Reserva ID: ${reserva_id}`);
          } catch (emailErr) {
            console.error("Erro ao chamar API de email:", emailErr);
          }
        }

        console.log(`[SUCESSO] Pagamento confirmado! Reserva ID: ${reserva_id}`);
      }
    }

    // A InfinitePay exige um 200 OK extremamente rápido com este JSON
    return NextResponse.json({ success: true, message: null }, { status: 200 });

  } catch (error) {
    console.error("Erro no processamento do Webhook:", error);
    return NextResponse.json({ success: false, message: "Erro interno" }, { status: 500 });
  }
}
