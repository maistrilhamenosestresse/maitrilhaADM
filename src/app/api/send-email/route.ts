import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Configuração do transporter (usa variáveis de ambiente)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    let mailOptions = {};

    if (data.type === 'new_registration') {
      const { client } = data;
      mailOptions = {
        from: `Mais Trilha Menos Estresse <${process.env.GMAIL_USER}>`,
        to: "wellingtonf.social@gmail.com, niveamariamagalhaes28@gmail.com",
        subject: `Novo Cadastro Realizado: ${client.full_name}`,
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #F17B37; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0;">Novo Ficha Recebida!</h2>
              <p style="margin: 5px 0 0 0;">Um aventureiro acabou de preencher os dados.</p>
            </div>
            <div style="padding: 20px;">
              ${client.photo_url ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${client.photo_url}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;" alt="Foto" /></div>` : ''}
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Nome:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${client.full_name}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>CPF:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${client.cpf}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>RG:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${client.rg}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Nascimento:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${client.birth_date}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Telefone:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${client.phone}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>E-mail:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${client.email || 'Não informado'}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Contato Emergência:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${client.emergency_contact_name} (${client.emergency_contact_phone})</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Notas de Saúde:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; color: #d93025; font-weight: bold;">${client.health_notes}</td></tr>
              </table>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              Estes dados já estão salvos no seu Painel Administrador.
            </div>
          </div>
        `
      };
    } 
    else if (data.type === 'birthday_reminder') {
      const { clients } = data;
      
      let clientsHtml = clients.map((c: any) => {
        const whatsappMsg = encodeURIComponent(`Oii ${c.full_name.split(' ')[0]}!! Passando aqui pra te desejar um Feliz Aniversário! 🎉🥳 Que você tenha um dia incrível, cheio de alegrias e que a gente possa comemorar em muitas trilhas juntos! Um abraço da equipe Mais Trilha Menos Estresse! 🥾⛰️`);
        const whatsappLink = `https://wa.me/55${c.phone.replace(/\D/g, '')}?text=${whatsappMsg}`;
        
        return `
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h3 style="margin: 0 0 5px 0; color: #333;">🎈 ${c.full_name}</h3>
              <p style="margin: 0; color: #666; font-size: 14px;">Aniversário: ${new Date(c.birth_date).toLocaleDateString('pt-BR')} (Telefone: ${c.phone})</p>
            </div>
            <a href="${whatsappLink}" style="background-color: #25D366; color: white; text-decoration: none; padding: 10px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; display: inline-block;">
              Mandar WhatsApp
            </a>
          </div>
        `;
      }).join('');

      mailOptions = {
        from: `Aviso de Aniversários <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: `🎉 Temos aniversariantes essa semana!`,
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
            <div style="background-color: #6228d7; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0; text-align: center;">Aviso Automático de Aniversário</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #444;">Olá Administradora!</p>
              <p style="font-size: 16px; color: #444;">Os seguintes clientes estão comemorando aniversário nos próximos dias. Clique no botão verde para enviar uma mensagem carinhosa pelo WhatsApp:</p>
              
              <div style="margin-top: 30px;">
                ${clientsHtml}
              </div>
            </div>
          </div>
        `
      };
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("Credenciais de E-mail não configuradas no .env.local");
      return NextResponse.json({ success: true, warning: 'E-mail não enviado por falta de credenciais' });
    }

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao enviar e-mail:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
