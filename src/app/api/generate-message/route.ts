import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { text, audioBase64, mimeType, type } = await request.json();

    if (!text && !audioBase64) {
      return NextResponse.json({ error: 'Texto ou Áudio é obrigatório' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt = "";
    
    if (type === 'meeting_point') {
      prompt = `
      Atue como um redator profissional de turismo e aventuras.
      Você receberá uma transcrição bruta de voz com os "Pontos de Embarque e Horários".
      Sua tarefa é extrair APENAS as informações úteis e ignorar falas aleatórias, vícios de linguagem ou interrupções.

      REGRAS DE FORMATAÇÃO (MUITO IMPORTANTE):
      1. NÃO use formatação Markdown (como **asteriscos** ou # hashtags).
      2. Para destacar palavras importantes, use CAIXA ALTA (letras maiúsculas). Exemplo: SHOPPING ESTAÇÃO.
      3. Não use código HTML. Apenas texto puro.
      4. Formate como uma lista vertical clara, usando quebras de linha reais.
      5. Coloque um emoji de pin (📍) antes do local e um emoji de relógio (⏰) antes do horário.
      
      Apenas retorne o texto final formatado, sem introduções ou conclusões.
      `;
    } else {
      prompt = `
      Atue como um redator profissional de ecoturismo e trilhas.
      Você receberá uma transcrição bruta de voz com a "Descrição, Roteiro e Recomendações" de uma trilha.
      Sua tarefa é extrair APENAS as informações úteis (roteiro, o que levar, dicas) e ignorar falas aleatórias, vícios de linguagem ou interrupções.

      REGRAS DE FORMATAÇÃO (MUITO IMPORTANTE):
      1. NÃO use formatação Markdown (como **asteriscos** ou # hashtags).
      2. Para destacar palavras, alertas ou subtítulos importantes, use CAIXA ALTA (letras maiúsculas).
      3. Não use código HTML. O texto deve ser texto puro.
      4. Separe os assuntos usando parágrafos bem espaçados (quebra de linha dupla).
      5. Se houver itens soltos (como coisas inclusas ou o que levar), crie uma lista usando emojis relevantes (🎒, 🥾, 🥪) ou um simples traço (-), mas NUNCA use asteriscos para listas.
      
      Apenas retorne o texto final formatado, pronto para ser lido no site, sem introduções ou conversas.
      `;
    }

    // Processar Texto
    prompt += `\n\n=== TRANSCRIÇÃO DE VOZ ===\n"${text}"\n===========================`;
    const result = await model.generateContent(prompt);

    const response = await result.response;
    const formattedText = response.text();

    return NextResponse.json({ result: formattedText });

  } catch (error: any) {
    console.error("Erro na API Gemini:", error);
    return NextResponse.json({ error: 'Erro ao gerar mensagem', details: error.message }, { status: 500 });
  }
}
