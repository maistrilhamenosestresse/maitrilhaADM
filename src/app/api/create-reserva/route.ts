import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Suporta tanto o formato antigo { client_id, agenda_id } quanto o novo { reservas: [...] }
    const reservasToInsert = body.reservas || [{
      client_id: body.client_id,
      agenda_id: body.agenda_id,
      status_pagamento: body.status_pagamento || 'pendente',
      valor_pago: body.valor_pago || 0
    }];

    if (reservasToInsert.length === 0) {
      return NextResponse.json({ error: 'Nenhuma reserva enviada' }, { status: 400 });
    }

    const { data: reservaData, error: reservaError } = await supabaseAdmin
      .from('reservas')
      .insert(reservasToInsert)
      .select();

    if (reservaError) {
      console.error("Erro interno ao inserir reserva:", reservaError);
      return NextResponse.json({ error: reservaError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reservas: reservaData });

  } catch (error: any) {
    console.error("Erro em /api/create-reserva:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
