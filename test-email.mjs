import { createTransport } from 'nodemailer';

const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const mockClient = {
  full_name: 'Maria Aventureira da Silva',
  birth_date: '1990-06-26',
  phone: '31999999999'
};

const whatsappMsg = encodeURIComponent('Oii Maria!! Passando aqui pra te desejar um Feliz Aniversário! 🎉🎈 Que você tenha um dia incrível, cheio de alegrias e que a gente possa comemorar em muitas trilhas juntos! Um abraço da equipe Mais Trilha Menos Estresse! 🥾⛰️');
const whatsappLink = 'https://wa.me/5531999999999?text=' + whatsappMsg;

const clientsHtml = `
  <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
    <div>
      <h3 style="margin: 0 0 5px 0; color: #333;">🎂 ${mockClient.full_name}</h3>
      <p style="margin: 0; color: #666; font-size: 14px;">Aniversário: 26/06/1990 (Telefone: ${mockClient.phone})</p>
    </div>
    <a href="${whatsappLink}" style="background-color: #25D366; color: white; text-decoration: none; padding: 10px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; display: inline-block;">
      Mandar WhatsApp
    </a>
  </div>
`;

const html = `
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
`;

transporter.sendMail({
  from: 'Aviso de Aniversários <' + process.env.GMAIL_USER + '>',
  to: 'wellingtonf.social@gmail.com',
  subject: '[TESTE] 🎉 Temos aniversariantes essa semana!',
  html: html
}).then(() => console.log('E-mail de teste enviado com sucesso!'))
  .catch(console.error);
