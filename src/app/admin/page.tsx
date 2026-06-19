"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Calendar, MapPin, DollarSign, FileText, Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AgendaForm = {
  title: string;
  location: string;
  date: string;
  price: string;
  description: string;
  meeting_point: string;
  images: FileList;
};

export default function AdminPage() {
  const { register, handleSubmit, reset, watch } = useForm<AgendaForm>();
  const [isLoading, setIsLoading] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState("");
  
  const selectedFiles = watch("images");

  const onSubmit = async (data: AgendaForm) => {
    setIsLoading(true);
    
    try {
      // 1. Fazer upload das imagens para o Supabase Storage
      const imageUrls: string[] = [];
      
      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const file = data.images[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('fotos_agendas')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Pegar URL pública da imagem
          const { data: publicUrlData } = supabase.storage
            .from('fotos_agendas')
            .getPublicUrl(filePath);
            
          imageUrls.push(publicUrlData.publicUrl);
        }
      }

      // 2. Salvar os dados da agenda no Banco de Dados Supabase
      const { data: agendaData, error: dbError } = await supabase
        .from('agendas')
        .insert([
          {
            title: data.title,
            date: data.date,
            price: parseFloat(data.price.replace(',', '.')),
            description: data.description,
            meeting_point: data.meeting_point,
            images: imageUrls
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Criar link do WhatsApp mais direto
      const siteUrl = `https://maitrilhaadm.vercel.app/agenda/${agendaData.id}`;
      const message = `A nossa próxima agenda chegou! ⛰️\n\n*${data.title}*\nConfira todas as fotos, informações e garanta sua vaga aqui:\n${siteUrl}`;
      
      setWhatsappLink(`https://wa.me/?text=${encodeURIComponent(message)}`);
      
      alert("Agenda criada com sucesso! As fotos foram enviadas.");
      reset(); // Limpar formulário
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao salvar a agenda. Veja o console.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Painel da Administradora</h1>
          <p className="text-gray-500">Cadastre uma nova trilha, faça upload das fotos e gere o link de compartilhamento.</p>
        </header>

        <div className="grid md:grid-cols-[1fr_300px] gap-8">
          
          {/* Formulário */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              
              <div>
                <label className="block text-sm font-medium mb-1">Título da Trilha</label>
                <input 
                  {...register("title", { required: true })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="Ex: Serra do Cipó: Cachoeira Grande" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input 
                      type="date"
                      {...register("date", { required: true })}
                      className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Valor (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input 
                      {...register("price", { required: true })}
                      className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                      placeholder="Ex: 150.00" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ponto de Encontro e Horário</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input 
                    {...register("meeting_point", { required: true })}
                    className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                    placeholder="Ex: Praça da Liberdade às 06:00" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrição e Recomendações</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea 
                    {...register("description", { required: true })}
                    rows={4}
                    className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none" 
                    placeholder="Detalhes sobre a trilha, o que levar..." 
                  />
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition relative">
                <ImageIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Fazer upload de Fotos/Vídeos</p>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedFiles && selectedFiles.length > 0 ? `${selectedFiles.length} arquivo(s) selecionado(s)` : 'Nenhuma imagem selecionada'}
                </p>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,video/*"
                  {...register("images")}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#1D2A3A] text-white p-3.5 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Salvar Agenda e Gerar Link</>
                )}
              </button>

            </form>
          </div>

          {/* Resultado do Link */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#1D2A3A] to-gray-900 rounded-2xl p-6 text-white h-[fit-content] shadow-lg border border-gray-800 relative overflow-hidden sticky top-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F17B37] rounded-full blur-[80px] opacity-20" />
              
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <Send className="h-5 w-5 text-[#F17B37]" />
                WhatsApp
              </h3>
              
              {whatsappLink ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-300">A agenda foi salva no banco de dados e as fotos enviadas!</p>
                  <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white p-3.5 rounded-xl font-semibold hover:bg-[#1ebd5a] transition shadow-lg shadow-[#25D366]/20"
                  >
                    <Send className="h-5 w-5" />
                    Enviar para o Grupo
                  </a>
                  <p className="text-xs text-gray-400 mt-2 text-center">Ao clicar, o Zap abrirá com o texto pronto. Você pode anexar as fotos por lá também, se quiser.</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Preencha e salve o formulário para gerar o link direto de compartilhamento.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
