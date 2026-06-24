import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // 1. Busca todos os clientes
    const { data: clients, error } = await supabase.from('clients').select('*');
    if (error) throw error;
    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum cliente cadastrado' });
    }

    // 2. Verifica aniversários dos próximos 3 dias
    const today = new Date();
    const upcomingBirthdays = clients.filter(client => {
      if (!client.birth_date) return false;
      const bDate = new Date(client.birth_date);
      
      // Mapeia o aniversário para o ano atual
      bDate.setFullYear(today.getFullYear());
      
      // Se o aniversário já passou este ano, mapeia para o ano que vem
      if (bDate < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) {
        bDate.setFullYear(today.getFullYear() + 1);
      }
      
      const diffTime = Math.abs(bDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays <= 3 && diffDays >= 0; // Se é hoje, amanhã ou depois de amanhã
    });

    if (upcomingBirthdays.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum aniversário próximo' });
    }

    // 3. Dispara o E-mail de Aviso passando a lista de aniversariantes
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const emailRes = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'birthday_reminder',
        clients: upcomingBirthdays
      })
    });

    if (!emailRes.ok) {
      throw new Error('Falha ao acionar a API de e-mail');
    }

    return NextResponse.json({ success: true, notified: upcomingBirthdays.length });
    
  } catch (error: any) {
    console.error('Erro no Cron Job de Aniversários:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
