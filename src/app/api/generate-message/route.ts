import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { location, date, price, description } = await req.json();

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Você é um organizador de aventuras da "Mais Trilha Menos Estresse". Crie uma mensagem para o WhatsApp do nosso grupo.
Informações:
- Destino: ${location}
- Data: ${date}
- Valor: R$ ${price}
- Detalhes: ${description}

A mensagem deve ser empolgante, ter emojis de natureza/trilha e usar o formato do WhatsApp (*negrito*). Não inclua o link, apenas diga "Clique no link abaixo para ver o roteiro completo e garantir sua vaga!".`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return NextResponse.json({ message: response.text });
  } catch (error) {
    console.error("Erro na geração:", error);
    return NextResponse.json({ error: "Erro ao gerar mensagem" }, { status: 500 });
  }
}
