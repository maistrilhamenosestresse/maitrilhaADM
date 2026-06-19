"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Calendar, MapPin, DollarSign, FileText, Wand2, Send } from "lucide-react";

type AgendaForm = {
  location: string;
  date: string;
  price: string;
  description: string;
};

export default function AdminPage() {
  const { register, handleSubmit } = useForm<AgendaForm>();
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState("");

  const onSubmit = async (data: AgendaForm) => {
    setIsLoading(true);
    setGeneratedMessage("");
    
    try {
      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Falha ao gerar mensagem");
      
      const result = await response.json();
      setGeneratedMessage(result.message);
      
      const fakeId = new Date().getTime().toString(36);
      const siteUrl = `https://maitrilhaadm.vercel.app/agenda/${fakeId}`;
      const fullMessage = `${result.message}\n\n👉 *Confira tudo e reserve sua vaga aqui:*\n${siteUrl}`;
      
      setWhatsappLink(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`);
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao conectar com a IA.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Painel da Administradora</h1>
          <p className="text-gray-500">Cadastre uma nova trilha e deixe a IA preparar a divulgação.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local da Trilha</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input {...register("location", { required: true })} className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition" placeholder="Ex: Serra do Cipó" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input type="date" {...register("date", { required: true })} className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input {...register("price", { required: true })} className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition" placeholder="Ex: 150,00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea {...register("description", { required: true })} rows={4} className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition resize-none" placeholder="Detalhes importantes sobre a trilha..." />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-[#1D2A3A] text-white p-3.5 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-70">
                  {isLoading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Wand2 className="h-5 w-5 text-[#F17B37]" />Gerar Mensagem com IA</>}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#1D2A3A] to-gray-900 rounded-2xl p-6 text-white h-full shadow-lg border border-gray-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F17B37] rounded-full blur-[80px] opacity-20" />
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4"><Send className="h-5 w-5 text-[#F17B37]" />Prévia do WhatsApp</h3>
              <div className="bg-white/10 rounded-xl p-4 min-h-[250px] border border-white/5 backdrop-blur-sm whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {generatedMessage || "A mensagem mágica vai aparecer aqui..."}
              </div>
              {whatsappLink && (
                <div className="mt-6">
                  <a href={whatsappLink} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white p-3.5 rounded-xl font-semibold hover:bg-[#1ebd5a] transition shadow-lg shadow-[#25D366]/20"><Send className="h-5 w-5" />Enviar para o Grupo</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
