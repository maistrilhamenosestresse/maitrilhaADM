import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { text, type } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt = "";
    
    if (type === 'meeting_point') {
      prompt = `
      Atue como um redator profissional de turismo e aventuras.
      Você receberá um texto bagunçado sobre os "Pontos de Embarque e Horários".
      Sua tarefa é:
      1. Corrigir todos os erros de ortografia e gramática.
      2. Formatar os pontos de embarque como uma lista vertical bonita e clara, utilizando quebras de linha e emojis apropriados.
      3. Destacar os horários.
      4. Manter o tom amigável e claro. Não adicione informações que não estão no texto. Apenas retorne o texto formatado.

      Texto original:
      "${text}"
      `;
    } else {
      prompt = `
      Atue como um redator profissional de ecoturismo e trilhas.
      Você receberá a "Descrição e Recomendações" de uma trilha.
      Sua tarefa é:
      1. Corrigir todos os erros de ortografia, pontuação e concordância.
      2. Formatar o texto para leitura agradável com parágrafos bem espaçados.
      3. Se houver listas (como o que levar), utilize bullet points ou emojis organizados.
      4. Apenas retorne o texto melhorado.

      Texto original:
      "${text}"
      `;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const formattedText = response.text();

    return NextResponse.json({ result: formattedText });

  } catch (error: any) {
    console.error("Erro na API Gemini:", error);
    return NextResponse.json({ error: 'Erro ao gerar mensagem', details: error.message }, { status: 500 });
  }
}
