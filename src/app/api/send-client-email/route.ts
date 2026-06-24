import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

async function generateInsuranceSummaryPDF(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // HEADER
    doc.fontSize(20).font('Helvetica-Bold').text('RESUMO DO SEGURO AVENTURA', { align: 'center' });
    doc.moveDown(1);
    
    doc.fontSize(12).font('Helvetica').text('Este documento é um resumo das coberturas e procedimentos do seu seguro, garantindo a sua tranquilidade durante a atividade.', { align: 'justify' });
    doc.moveDown(2);

    // COBERTURAS
    doc.fontSize(16).font('Helvetica-Bold').text('SUAS COBERTURAS (PLANO 2)');
    doc.moveDown(0.5);
    
    doc.fontSize(12).font('Helvetica-Bold').text('• Morte Acidental (MA): R$ 30.000,00', { indent: 10 });
    doc.font('Helvetica').text('Garante o pagamento de indenização em caso de morte do Segurado ocasionada exclusivamente por acidente pessoal coberto.', { indent: 25 });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('• Invalidez Permanente (IPA): R$ 30.000,00', { indent: 10 });
    doc.font('Helvetica').text('Garante o pagamento de indenização relativa à perda, à redução ou à impotência funcional definitiva de um membro ou órgão por lesão física.', { indent: 25 });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('• DMHO: R$ 3.000,00', { indent: 10 });
    doc.font('Helvetica').text('Garante o reembolso de despesas médicas, hospitalares e odontológicas efetuadas para o tratamento após a ocorrência de acidente pessoal coberto.', { indent: 25 });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('• Cobertura de Deslocamento:', { indent: 10 });
    doc.font('Helvetica').text('Garantida em todo território nacional de ida e volta entre os locais de embarque/desembarque e o local do evento.', { indent: 25 });
    doc.moveDown(2);

    // PROCEDIMENTOS EM CASO DE SINISTRO
    doc.fontSize(16).font('Helvetica-Bold').text('PROCEDIMENTOS EM CASO DE ACIDENTE');
    doc.moveDown(0.5);
    
    doc.fontSize(12).font('Helvetica-Bold').text('1. Comunicação Imediata:');
    doc.font('Helvetica').text('Ocorrendo um acidente, o participante deve imediatamente comunicar o guia responsável pela atividade. Não será possível a indenização se o responsável não tiver conhecimento do acidente.', { align: 'justify' });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('2. Atendimento Médico:');
    doc.font('Helvetica').text('Toda energia da equipe deve ser voltada ao atendimento da vítima. O primeiro atendimento médico deverá ocorrer no mesmo dia do acidente ou no máximo em até 5 (cinco) dias.', { align: 'justify' });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('3. Documentação Exigida para Reembolso:');
    const docs = [
      '• Foto do segurado no local do acidente;',
      '• Prontuário Médico constando data e procedimentos realizados;',
      '• Relatório detalhado do médico atestando o tratamento realizado;',
      '• Notas fiscais originais (Não será aceito recibo);',
      '• Comprovação dos exames médicos e Receita Médica;',
      '• Fotocópia do RG/CPF e comprovante de residência;',
      '• Comprovante bancário em nome do Segurado.'
    ];
    docs.forEach(item => {
      doc.font('Helvetica').text(item, { indent: 20 });
    });

    doc.moveDown(2);

    // FOOTER
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('gray').text('Mais Trilha Menos Estresse - Turismo de Aventura Responsável.', { align: 'center' });

    doc.end();
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { client } = data;

    if (!client || !client.email) {
      return NextResponse.json({ success: false, error: 'Email do cliente não informado.' }, { status: 400 });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json({ success: false, error: 'Credenciais de email não configuradas.' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Gera o PDF em memória
    const pdfBuffer = await generateInsuranceSummaryPDF();

    const firstName = client.full_name.split(' ')[0];
    const termoUrl = `https://maistrilhamenosestresse.com.br/admin/termo/${client.id}`;

    const mailOptions = {
      from: `Mais Trilha Menos Estresse <${process.env.GMAIL_USER}>`,
      to: client.email,
      subject: `Inscrição Confirmada, ${firstName}! Prepare a mochila 🎒`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #F17B37; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Bem-vindo(a) à Mais Trilha!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Sua inscrição foi recebida com sucesso.</p>
          </div>
          
          <div style="padding: 30px 20px; color: #333; line-height: 1.6;">
            <p>Olá <strong>${firstName}</strong>,</p>
            <p>Parabéns! Nós recebemos o seu cadastro e a sua assinatura do Termo de Responsabilidade.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #F17B37; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #113a5d;">Seu Termo de Responsabilidade</h3>
              <p style="margin-bottom: 0;">Você pode acessar, salvar ou imprimir uma cópia do seu termo assinado a qualquer momento clicando no link abaixo:</p>
              <br/>
              <a href="${termoUrl}" style="background-color: #113a5d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Acessar Meu Contrato</a>
            </div>

            <h3 style="color: #113a5d;">Seguro Aventura Ativo 🛡️</h3>
            <p>Sua segurança é nossa prioridade. O seu Seguro Aventura estará ativo durante toda a atividade. Nós anexamos a este e-mail um PDF contendo o <strong>Resumo das Coberturas e Procedimentos</strong> para a sua leitura e acompanhamento.</p>
            
            <br/>
            <p>Em breve, nossa equipe enviará as instruções detalhadas e horários no grupo oficial. Fique atento!</p>
            
            <p style="margin-top: 30px;">Um grande abraço,<br/><strong>Equipe Mais Trilha Menos Estresse</strong></p>
          </div>
          
          <div style="background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #888;">
            Este é um e-mail automático. Por favor, não responda diretamente.
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'Resumo_Seguro_Aventura.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao enviar e-mail para o cliente:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
