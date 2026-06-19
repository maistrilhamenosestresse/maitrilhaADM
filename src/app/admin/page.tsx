"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Calendar, MapPin, DollarSign, FileText, Send, Image as ImageIcon, Video, Loader2, Trash2, CalendarDays, Edit2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AgendaForm = {
  title: string;
  location: string;
  date: string;
  price: string;
  description: string;
  meeting_point: string;
  images: FileList;
  video: FileList;
};

export default function AdminPage() {
  const { register, handleSubmit, reset, watch, setValue } = useForm<AgendaForm>();
  const [isLoading, setIsLoading] = useState(false);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [editingAgenda, setEditingAgenda] = useState<any>(null);
  
  const selectedImages = watch("images");
  const selectedVideo = watch("video");

  const fetchAgendasAndCleanup = async () => {
    setIsFetching(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      await supabase
        .from('agendas')
        .delete()
        .lt('date', today);

      const { data, error } = await supabase
        .from('agendas')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setAgendas(data || []);
    } catch (error) {
      console.error("Erro ao buscar agendas:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAgendasAndCleanup();
  }, []);

  const deleteAgenda = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta trilha?")) return;
    try {
      const { error } = await supabase.from('agendas').delete().eq('id', id);
      if (error) throw error;
      
      if (editingAgenda?.id === id) {
        cancelEdit();
      }
      
      fetchAgendasAndCleanup();
    } catch (error: any) {
      alert("Erro ao excluir trilha: " + error.message);
    }
  };

  const handleEdit = (agenda: any) => {
    setEditingAgenda(agenda);
    setValue("title", agenda.title);
    setValue("date", agenda.date);
    setValue("price", agenda.price.toString().replace('.', ','));
    setValue("meeting_point", agenda.meeting_point);
    setValue("description", agenda.description);
    // Nota: campos de arquivo (images e video) não podem ser setados programaticamente por segurança do navegador
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingAgenda(null);
    reset();
  };

  const onSubmit = async (data: AgendaForm) => {
    setIsLoading(true);
    
    try {
      let imageUrls: string[] = editingAgenda ? editingAgenda.images || [] : [];
      let videoUrl: string | null = editingAgenda ? editingAgenda.video_url : null;
      
      // Upload de Novas Imagens (substitui se enviar novas)
      if (data.images && data.images.length > 0) {
        imageUrls = []; // Limpa as velhas se enviou novas
        for (let i = 0; i < data.images.length; i++) {
          const file = data.images[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `img_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage.from('fotos_agendas').upload(fileName, file);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('fotos_agendas').getPublicUrl(fileName);
          imageUrls.push(publicUrlData.publicUrl);
        }
      }

      // Upload de Novo Vídeo (substitui se enviar novo)
      if (data.video && data.video.length > 0) {
        const file = data.video[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `vid_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('fotos_agendas').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('fotos_agendas').getPublicUrl(fileName);
        videoUrl = publicUrlData.publicUrl;
      }

      const payload = {
        title: data.title,
        date: data.date,
        price: parseFloat(data.price.replace(',', '.')),
        description: data.description,
        meeting_point: data.meeting_point,
        images: imageUrls,
        video_url: videoUrl
      };

      if (editingAgenda) {
        // Atualizar
        const { error: updateError } = await supabase
          .from('agendas')
          .update(payload)
          .eq('id', editingAgenda.id);
          
        if (updateError) throw updateError;
        alert("Trilha atualizada com sucesso!");
        cancelEdit();
      } else {
        // Inserir Novo
        const { error: insertError } = await supabase
          .from('agendas')
          .insert([payload]);

        if (insertError) throw insertError;
        alert("Trilha cadastrada com sucesso!");
        reset();
      }
      
      fetchAgendasAndCleanup();
    } catch (error: any) {
      console.error("Erro completo:", error);
      alert(`Ocorreu um erro: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const globalSiteUrl = "https://maitrilhaadm.vercel.app/agenda";
  const whatsappMessage = `⛰️ A nossa agenda oficial chegou! Prepare as botas!\n\nClique no link abaixo para conferir as nossas próximas trilhas, ver as fotos, roteiros e garantir sua vaga:\n\n👉 ${globalSiteUrl}`;
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Painel da Administradora</h1>
          <p className="text-gray-500">Cadastre, gerencie as trilhas e envie o calendário atualizado.</p>
        </header>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          
          <div className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${editingAgenda ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CalendarDays className={`h-5 w-5 ${editingAgenda ? 'text-orange-600' : 'text-orange-500'}`} /> 
                {editingAgenda ? 'Editando Trilha' : 'Nova Trilha'}
              </h2>
              {editingAgenda && (
                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold animate-pulse">Modo de Edição</span>
              )}
            </div>
            
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

              {editingAgenda && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-sm text-blue-800">
                  <strong>Dica de Edição:</strong> Se você não selecionar novas fotos ou vídeos abaixo, os antigos serão mantidos automaticamente.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Upload Fotos */}
                <div className="border-2 border-dashed border-orange-200 bg-orange-50/50 rounded-xl p-4 text-center hover:bg-orange-50 transition relative">
                  <ImageIcon className="mx-auto h-6 w-6 text-orange-400 mb-2" />
                  <p className="text-sm text-gray-700 font-medium">{editingAgenda ? 'Substituir Fotos' : 'Fotos'}</p>
                  <p className="text-xs font-bold text-orange-600 mt-1">
                    {selectedImages && selectedImages.length > 0 ? `${selectedImages.length} selecionada(s)` : 'Selecionar'}
                  </p>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    {...register("images")}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Upload Vídeo */}
                <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-4 text-center hover:bg-blue-50 transition relative">
                  <Video className="mx-auto h-6 w-6 text-blue-400 mb-2" />
                  <p className="text-sm text-gray-700 font-medium">{editingAgenda ? 'Substituir Vídeo' : '1 Vídeo (Opcional)'}</p>
                  <p className="text-xs font-bold text-blue-600 mt-1">
                    {selectedVideo && selectedVideo.length > 0 ? `Vídeo pronto` : 'Selecionar'}
                  </p>
                  <input 
                    type="file" 
                    accept="video/*"
                    {...register("video")}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1D2A3A] text-white p-4 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-70 shadow-lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>{editingAgenda ? 'Salvar Alterações' : 'Cadastrar Trilha na Agenda'}</>
                  )}
                </button>
                
                {editingAgenda && (
                  <button 
                    type="button" 
                    onClick={cancelEdit}
                    disabled={isLoading}
                    className="flex-none px-6 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                )}
              </div>

            </form>
          </div>

          <div className="space-y-6">
            
            <div className="bg-gradient-to-br from-[#1D2A3A] to-gray-900 rounded-2xl p-6 text-white shadow-lg border border-gray-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366] rounded-full blur-[80px] opacity-20" />
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                <Send className="h-5 w-5 text-[#25D366]" />
                Enviar Calendário
              </h3>
              <p className="text-sm text-gray-300 mb-5 leading-relaxed">
                Este botão envia o link do <strong className="text-white">Calendário Oficial</strong> para o grupo.
              </p>
              <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white p-3.5 rounded-xl font-semibold hover:bg-[#1ebd5a] transition shadow-lg shadow-[#25D366]/20"
              >
                <Send className="h-5 w-5" />
                Compartilhar no Grupo
              </a>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                Trilhas Ativas
                <span className="bg-orange-100 text-orange-600 text-xs py-1 px-2 rounded-full">{agendas.length}</span>
              </h3>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {isFetching ? (
                  <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
                ) : agendas.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhuma trilha futura cadastrada.</p>
                ) : (
                  agendas.map((agenda) => (
                    <div key={agenda.id} className={`flex items-center justify-between p-3 bg-gray-50 border rounded-xl hover:border-gray-200 transition ${editingAgenda?.id === agenda.id ? 'border-orange-500 bg-orange-50/30' : 'border-gray-100'}`}>
                      <div className="truncate pr-2">
                        <p className="text-sm font-bold text-gray-800 truncate">{agenda.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(agenda.date).toLocaleDateString('pt-BR')} • R$ {agenda.price}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => handleEdit(agenda)}
                          className={`p-2 rounded-lg transition ${editingAgenda?.id === agenda.id ? 'text-orange-600 bg-orange-100' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                          title="Editar Trilha"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => deleteAgenda(agenda.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Excluir Trilha"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
