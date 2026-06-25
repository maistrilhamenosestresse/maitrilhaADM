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

    // Dados enviados pelo Webhook da InfinitePay
    const { 
      invoice_slug, 
      amount, 
      paid_amount, 
      capture_method, 
      transaction_nsu, 
      order_nsu 
    } = data;

    if (!order_nsu) {
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
        // 2. Disparar o E-mail para os Administradores (Wellington e Nívia)
        // Isso pode ser feito via Resend ou Nodemailer futuramente.
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
