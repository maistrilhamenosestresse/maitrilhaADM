import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { reserva_id, agenda_title, price, customer } = await request.json();

    if (!reserva_id || !price) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // A API do InfinitePay espera o handle sem o $
    const infiniteTag = "wellington_oiiveira";
    
    // O order_nsu será exatamente o ID da reserva
    const order_nsu = reserva_id;

    // Montando a requisição para a InfinitePay
    const payload = {
      handle: infiniteTag,
      // Usaremos a própria URL base do site atual para o webhook dinamicamente
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/agenda`,
      webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhooks/infinitepay`,
      order_nsu: order_nsu,
      customer: customer,
      items: [
        {
          quantity: 1,
          price: Math.round(price * 100), // O preço deve ser enviado em centavos
          description: `Ingresso Trilha: ${agenda_title}`
        }
      ]
    };

    const response = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // A API de links públicos do Checkout da InfinitePay aparentemente não precisa de header Bearer para criação de links básicos segundo a documentação fornecida, 
        // mas se a documentação oficial da conta exigir a API Key, ela entraria aqui:
        // 'Authorization': `Bearer ${process.env.INFINITEPAY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API da InfinitePay:", errorText);
      return NextResponse.json({ error: 'Falha ao gerar link de pagamento' }, { status: response.status });
    }

    const data = await response.json();
    
    // Retorna a URL segura de checkout da InfinitePay
    return NextResponse.json({ url: data.url, order_nsu: order_nsu });

  } catch (error: any) {
    console.error("Erro interno Checkout:", error);
    return NextResponse.json({ error: 'Erro ao processar', details: error.message }, { status: 500 });
  }
}
