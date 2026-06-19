import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { text, audioBase64, mimeType, type } = await request.json();

    if (!text && !audioBase64) {
      return NextResponse.json({ error: 'Texto ou Áudio é obrigatório' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let prompt = "";
    
    if (type === 'meeting_point') {
      prompt = `
      Atue como um redator profissional de turismo e aventuras.
      Você receberá um texto dditado ou copiado com os "Pontos de Embarque e Horários".
      Sua tarefa é:
      1. Ler atentamente.
      2. Corrigir todos os erros de ortografia e gramática.
      3. Formatar os pontos de embarque como uma lista vertical bonita e clara, utilizando quebras de linha e emojis apropriados.
      4. Destacar os horários.
      5. Apenas retorne o texto formatado. Não converse comigo.
      `;
    } else {
      prompt = `
      Atue como um redator profissional de ecoturismo e trilhas.
      Você receberá a "Descrição e Recomendações" de uma trilha em texto ditado.
      Sua tarefa é:
      1. Ler atentamente.
      2. Transcrever e corrigir todos os erros de ortografia e pontuação.
      3. Formatar o texto para leitura agradável com parágrafos.
      4. Utilizar bullet points ou emojis organizados se houver listas de recomendações.
      5. Apenas retorne o texto formatado. Não converse comigo.
      `;
    }

    // Processar Texto
    prompt += `\n\nTexto original:\n"${text}"`;
    const result = await model.generateContent(prompt);

    const response = await result.response;
    const formattedText = response.text();

    return NextResponse.json({ result: formattedText });

  } catch (error: any) {
    console.error("Erro na API Gemini:", error);
    return NextResponse.json({ error: 'Erro ao gerar mensagem', details: error.message }, { status: 500 });
  }
}
