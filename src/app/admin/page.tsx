"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Calendar, MapPin, DollarSign, FileText, Send, Image as ImageIcon, Video, Loader2, Trash2, CalendarDays, Edit2, Sparkles, CheckCircle2, FileUp, Mic, Square } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AgendaForm = {
  title: string;
  location: string;
  date: string;
  price: string;
  description: string;
  meeting_point: string;
  flyer: FileList;
  images: FileList;
  video: FileList;
};

export default function AdminPage() {
  const { register, handleSubmit, reset, watch, setValue, getValues } = useForm<AgendaForm>();
  const [isLoading, setIsLoading] = useState(false);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [editingAgenda, setEditingAgenda] = useState<any>(null);
  
  // Status de Formatação e Áudio
  const [isFormattingMeetingPoint, setIsFormattingMeetingPoint] = useState(false);
  const [isFormattingDescription, setIsFormattingDescription] = useState(false);
  const [aiSuccessMeeting, setAiSuccessMeeting] = useState(false);
  const [aiSuccessDesc, setAiSuccessDesc] = useState(false);

  // Estados do Gravador de Áudio
  const [recordingType, setRecordingType] = useState<'meeting_point' | 'description' | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const selectedFlyer = watch("flyer");
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const deleteAgenda = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta trilha?")) return;
    try {
      const { error } = await supabase.from('agendas').delete().eq('id', id);
      if (error) throw error;
      if (editingAgenda?.id === id) cancelEdit();
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
    setAiSuccessMeeting(false);
    setAiSuccessDesc(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingAgenda(null);
    setAiSuccessMeeting(false);
    setAiSuccessDesc(false);
    reset();
  };

  // Funções de Áudio
  const startRecording = async (type: 'meeting_point' | 'description') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Converter Blob para Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          await processAudioWithAI(base64data, type, mimeType);
        };

        // Limpar recursos do microfone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingType(type);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Erro ao acessar microfone", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecordingType(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const processAudioWithAI = async (audioBase64: string, type: 'meeting_point' | 'description', mimeType: string = 'audio/webm') => {
    if (type === 'meeting_point') {
      setIsFormattingMeetingPoint(true);
      setAiSuccessMeeting(false);
    } else {
      setIsFormattingDescription(true);
      setAiSuccessDesc(false);
    }

    try {
      const res = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, mimeType, type })
      });
      const data = await res.json();
      
      if (data.result) {
        setValue(type, data.result);
        if (type === 'meeting_point') setAiSuccessMeeting(true);
        else setAiSuccessDesc(true);
      } else {
        alert("Erro ao transcrever o áudio na IA.");
      }
    } catch (error) {
      console.error(error);
      alert("Falha de conexão com a IA.");
    } finally {
      if (type === 'meeting_point') setIsFormattingMeetingPoint(false);
      else setIsFormattingDescription(false);
    }
  };

  // Função para chamar a IA com Texto
  const formatTextWithAI = async (type: 'meeting_point' | 'description') => {
    const text = getValues(type);
    if (!text || text.trim().length < 5) {
      alert("Escreva um pouco de texto primeiro antes de usar a IA.");
      return;
    }

    if (type === 'meeting_point') {
      setIsFormattingMeetingPoint(true);
      setAiSuccessMeeting(false);
    } else {
      setIsFormattingDescription(true);
      setAiSuccessDesc(false);
    }

    try {
      const res = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, type })
      });
      const data = await res.json();
      
      if (data.result) {
        setValue(type, data.result);
        if (type === 'meeting_point') setAiSuccessMeeting(true);
        else setAiSuccessDesc(true);
      } else {
        alert("Erro na resposta da IA.");
      }
    } catch (error) {
      console.error(error);
      alert("Falha de conexão com a IA.");
    } finally {
      if (type === 'meeting_point') setIsFormattingMeetingPoint(false);
      else setIsFormattingDescription(false);
    }
  };

  const onSubmit = async (data: AgendaForm) => {
    setIsLoading(true);
    
    try {
      let imageUrls: string[] = editingAgenda ? editingAgenda.images || [] : [];
      let videoUrl: string | null = editingAgenda ? editingAgenda.video_url : null;
      let flyerUrl: string | null = editingAgenda ? editingAgenda.flyer_url : null;
      
      if (data.flyer && data.flyer.length > 0) {
        const file = data.flyer[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `flyer_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('fotos_agendas').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('fotos_agendas').getPublicUrl(fileName);
        flyerUrl = publicUrlData.publicUrl;
      }

      if (data.images && data.images.length > 0) {
        imageUrls = [];
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
        video_url: videoUrl,
        flyer_url: flyerUrl
      };

      if (editingAgenda) {
        const { error: updateError } = await supabase.from('agendas').update(payload).eq('id', editingAgenda.id);
        if (updateError) throw updateError;
        alert("Trilha atualizada com sucesso!");
        cancelEdit();
      } else {
        const { error: insertError } = await supabase.from('agendas').insert([payload]);
        if (insertError) throw insertError;
        alert("Trilha cadastrada com sucesso!");
        reset();
      }
      
      setAiSuccessMeeting(false);
      setAiSuccessDesc(false);
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

  const formatDateDisplay = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-12 text-gray-900">
      <div className="p-4 md:p-12 max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        <header className="space-y-1 md:space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Painel da Administradora</h1>
          <p className="text-sm md:text-base text-gray-500">Cadastre, gerencie as trilhas e use a IA para transcrever seus áudios.</p>
        </header>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6 md:gap-8">
          
          <div className={`bg-white p-4 md:p-6 rounded-2xl shadow-sm border transition-all ${editingAgenda ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CalendarDays className={`h-5 w-5 ${editingAgenda ? 'text-orange-600' : 'text-orange-500'}`} /> 
                {editingAgenda ? 'Editando Trilha' : 'Nova Trilha'}
              </h2>
              {editingAgenda && (
                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold animate-pulse">Modo de Edição</span>
              )}
            </div>
            
            <form id="admin-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-5">
              
              <div>
                <label className="block text-sm font-medium mb-1">Título da Trilha</label>
                <input 
                  {...register("title", { required: true })}
                  className="w-full p-3 md:p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="Ex: Serra do Cipó" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 md:top-3 h-5 w-5 text-gray-400" />
                    <input 
                      type="date"
                      {...register("date", { required: true })}
                      className="pl-10 w-full p-3 md:p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Valor (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3.5 md:top-3 h-5 w-5 text-gray-400" />
                    <input 
                      {...register("price", { required: true })}
                      inputMode="decimal"
                      className="pl-10 w-full p-3 md:p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                      placeholder="Ex: 150.00" 
                    />
                  </div>
                </div>
              </div>

              {/* Botão e Campo com IA para Ponto de Encontro */}
              <div className={`p-3 md:p-4 rounded-xl border transition-colors ${aiSuccessMeeting ? 'bg-green-50 border-green-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                  <label className="text-sm font-bold text-gray-800">Pontos de Encontro</label>
                  
                  <div className="flex items-center gap-2">
                    {recordingType === 'meeting_point' ? (
                      <button type="button" onClick={stopRecording} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 animate-pulse border border-red-200">
                        <Square className="h-3 w-3 fill-red-700" /> {formatRecordingTime(recordingTime)} - Parar
                      </button>
                    ) : (
                      <button type="button" onClick={() => startRecording('meeting_point')} disabled={isFormattingMeetingPoint || recordingType !== null} className="text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-bold hover:bg-gray-100 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                        <Mic className="h-3 w-3 text-red-500" /> Falar
                      </button>
                    )}

                    <button type="button" onClick={() => formatTextWithAI('meeting_point')} disabled={isFormattingMeetingPoint || recordingType !== null} className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full font-bold hover:bg-blue-100 transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm">
                      {isFormattingMeetingPoint ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-blue-500" />}
                      Formatar
                    </button>
                  </div>
                </div>
                
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea 
                    {...register("meeting_point", { required: true })}
                    rows={4}
                    className={`pl-10 w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none resize-none ${isFormattingMeetingPoint ? 'opacity-50' : ''}`} 
                    placeholder="Digite os horários ou grave um áudio pelo botão 'Falar'..." 
                    readOnly={isFormattingMeetingPoint}
                  />
                  {isFormattingMeetingPoint && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-xl backdrop-blur-sm z-10">
                      <span className="flex items-center gap-2 text-sm font-bold text-blue-700"><Loader2 className="animate-spin h-4 w-4"/> IA Processando...</span>
                    </div>
                  )}
                </div>
                {aiSuccessMeeting && <p className="text-xs text-green-600 mt-2 font-medium">✅ Formatado pela Inteligência Artificial!</p>}
              </div>

              {/* Botão e Campo com IA para Descrição */}
              <div className={`p-3 md:p-4 rounded-xl border transition-colors ${aiSuccessDesc ? 'bg-green-50 border-green-200' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                  <label className="text-sm font-bold text-gray-800">Descrição / Roteiro</label>
                  
                  <div className="flex items-center gap-2">
                    {recordingType === 'description' ? (
                      <button type="button" onClick={stopRecording} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 animate-pulse border border-red-200">
                        <Square className="h-3 w-3 fill-red-700" /> {formatRecordingTime(recordingTime)} - Parar
                      </button>
                    ) : (
                      <button type="button" onClick={() => startRecording('description')} disabled={isFormattingDescription || recordingType !== null} className="text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-bold hover:bg-gray-100 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                        <Mic className="h-3 w-3 text-red-500" /> Falar
                      </button>
                    )}

                    <button type="button" onClick={() => formatTextWithAI('description')} disabled={isFormattingDescription || recordingType !== null} className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-full font-bold hover:bg-purple-100 transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm">
                      {isFormattingDescription ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-purple-500" />}
                      Formatar
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea 
                    {...register("description", { required: true })}
                    rows={5}
                    className={`pl-10 w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none resize-none ${isFormattingDescription ? 'opacity-50' : ''}`} 
                    placeholder="Escreva ou grave um áudio para transcrever automaticamente..." 
                    readOnly={isFormattingDescription}
                  />
                  {isFormattingDescription && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-xl backdrop-blur-sm z-10">
                      <span className="flex items-center gap-2 text-sm font-bold text-purple-700"><Loader2 className="animate-spin h-4 w-4"/> IA Processando...</span>
                    </div>
                  )}
                </div>
                {aiSuccessDesc && <p className="text-xs text-green-600 mt-2 font-medium">✅ Revisado pela Inteligência Artificial!</p>}
              </div>

              {/* Seção de Mídia */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                
                {/* Upload do Flyer/Capa */}
                <div className="col-span-2 md:col-span-3 border-2 border-dashed border-[#F17B37] bg-[#F17B37]/5 rounded-xl p-3 md:p-4 text-center hover:bg-[#F17B37]/10 transition relative">
                  <FileUp className="mx-auto h-5 w-5 md:h-6 md:w-6 text-[#F17B37] mb-1" />
                  <p className="text-sm text-gray-800 font-bold">{editingAgenda ? 'Substituir Flyer' : 'Flyer/Capa (P/ Zap)'}</p>
                  <p className="text-[10px] md:text-xs font-bold text-[#F17B37] mt-1">
                    {selectedFlyer && selectedFlyer.length > 0 ? `Flyer selecionado` : 'Selecionar'}
                  </p>
                  <input type="file" accept="image/*" {...register("flyer")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>

                {/* Upload Fotos */}
                <div className="col-span-1 md:col-span-2 border-2 border-dashed border-orange-200 bg-orange-50/50 rounded-xl p-3 md:p-4 text-center hover:bg-orange-50 transition relative">
                  <ImageIcon className="mx-auto h-5 w-5 md:h-6 md:w-6 text-orange-400 mb-1" />
                  <p className="text-xs md:text-sm text-gray-700 font-medium">{editingAgenda ? 'Substituir Fotos' : 'Fotos Local'}</p>
                  <p className="text-[10px] md:text-xs font-bold text-orange-600 mt-1">
                    {selectedImages && selectedImages.length > 0 ? `${selectedImages.length} selecionadas` : 'Múltiplas'}
                  </p>
                  <input type="file" multiple accept="image/*" {...register("images")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>

                {/* Upload Vídeo */}
                <div className="col-span-1 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-3 md:p-4 text-center hover:bg-blue-50 transition relative">
                  <Video className="mx-auto h-5 w-5 md:h-6 md:w-6 text-blue-400 mb-1" />
                  <p className="text-xs md:text-sm text-gray-700 font-medium">Vídeo</p>
                  <p className="text-[10px] md:text-xs font-bold text-blue-600 mt-1">
                    {selectedVideo && selectedVideo.length > 0 ? `Pronto` : 'Opcional'}
                  </p>
                  <input type="file" accept="video/*" {...register("video")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              </div>

              {/* Mobile Sticky Bar: Fixa os botões de ação na parte inferior da tela no celular */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 md:relative md:bg-transparent md:border-0 md:p-0 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] md:shadow-none">
                <div className="flex gap-3 max-w-6xl mx-auto">
                  <button 
                    type="submit" 
                    form="admin-form"
                    disabled={isLoading || recordingType !== null}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#1D2A3A] text-white p-4 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-70 shadow-lg text-sm md:text-base"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>{editingAgenda ? 'Salvar Alterações' : 'Cadastrar Trilha'}</>
                    )}
                  </button>
                  
                  {editingAgenda && (
                    <button 
                      type="button" 
                      onClick={cancelEdit}
                      disabled={isLoading}
                      className="flex-none px-4 md:px-6 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition text-sm md:text-base"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

            </form>
          </div>

          {/* Painel Lateral: Trilhas Ativas */}
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

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 h-[400px] md:h-auto overflow-hidden flex flex-col">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                Trilhas Ativas
                <span className="bg-orange-100 text-orange-600 text-xs py-1 px-2 rounded-full">{agendas.length}</span>
              </h3>
              
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 pb-10">
                {isFetching ? (
                  <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
                ) : agendas.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhuma trilha futura cadastrada.</p>
                ) : (
                  agendas.map((agenda) => (
                    <div key={agenda.id} className={`flex items-center justify-between p-3 bg-gray-50 border rounded-xl hover:border-gray-200 transition ${editingAgenda?.id === agenda.id ? 'border-orange-500 bg-orange-50/30' : 'border-gray-100'}`}>
                      <div className="truncate pr-2">
                        <p className="text-sm font-bold text-gray-800 truncate">{agenda.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDateDisplay(agenda.date)} • R$ {agenda.price}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => handleEdit(agenda)}
                          className={`p-2 rounded-lg transition ${editingAgenda?.id === agenda.id ? 'text-orange-600 bg-orange-100' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => deleteAgenda(agenda.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
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
