"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Calendar, MapPin, DollarSign, FileText, Send, Image as ImageIcon, Video, Loader2, Trash2, CalendarDays, Edit2, Sparkles, CheckCircle2, FileUp, Mic, Square, Navigation, Camera, AlertCircle, Bot, X, MessageSquare, Plus, Eye, User, ShieldCheck } from "lucide-react";
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
  notifyGroup: boolean;
  notifyClients: boolean;
};

type ChatMessage = {
  sender: 'user' | 'bot';
  text: string;
};

export default function AdminPage() {
  const { register, handleSubmit, reset, watch, setValue, getValues } = useForm<AgendaForm>();
  const [isLoading, setIsLoading] = useState(false);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [globalViews, setGlobalViews] = useState<number>(0);
  const [clients, setClients] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [editingAgenda, setEditingAgenda] = useState<any>(null);
  const [editingClient, setEditingClient] = useState<any>(null);

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este cliente do sistema?")) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClients(clients.filter(c => c.id !== id));
      alert("Cliente excluído com sucesso.");
    } catch (err: any) {
      alert("Erro ao excluir cliente: " + err.message);
    }
  };

  const handleSaveEditedClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('clients')
        .update({
          full_name: editingClient.full_name,
          email: editingClient.email,
          cpf: editingClient.cpf,
          rg: editingClient.rg,
          phone: editingClient.phone,
          health_notes: editingClient.health_notes
        })
        .eq('id', editingClient.id);
      
      if (error) throw error;
      setClients(clients.map(c => c.id === editingClient.id ? editingClient : c));
      setEditingClient(null);
      alert("Cliente atualizado com sucesso!");
    } catch (err: any) {
      alert("Erro ao editar cliente: " + err.message);
    }
  };
  
  const [mainTab, setMainTab] = useState<'trilhas' | 'clientes'>('trilhas');
  const [activeTab, setActiveTab] = useState<'geral' | 'textos' | 'midias'>('geral');

  const [isFormattingMeetingPoint, setIsFormattingMeetingPoint] = useState(false);
  const [isFormattingDescription, setIsFormattingDescription] = useState(false);
  const [aiSuccessMeeting, setAiSuccessMeeting] = useState(false);
  const [aiSuccessDesc, setAiSuccessDesc] = useState(false);

  const [recordingType, setRecordingType] = useState<'meeting_point' | 'description' | 'assistant' | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados do Agente Assistente (Chat)
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isAssistantProcessing, setIsAssistantProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([{ sender: 'bot', text: 'Olá! Sou sua assistente. Pergunte qualquer coisa ou me mande cadastrar uma trilha!' }]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const selectedFlyer = watch("flyer");
  const selectedImages = watch("images");
  const selectedVideo = watch("video");

  const fetchAgendasAndCleanup = async () => {
    setIsFetching(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('agendas').delete().lt('date', today);
      const { data, error } = await supabase.from('agendas').select('*').order('date', { ascending: true });
      if (error) throw error;
      setAgendas(data || []);
      
      const { data: statsData } = await supabase.from('global_stats').select('total_views').eq('id', 1).single();
      if (statsData) setGlobalViews(statsData.total_views || 0);

      const { data: clientsData } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      setClients(clientsData || []);
      
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

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isAssistantProcessing]);

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
    setActiveTab('geral');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingAgenda(null);
    setAiSuccessMeeting(false);
    setAiSuccessDesc(false);
    setActiveTab('geral');
    reset();
  };

  const startRecording = async (type: 'meeting_point' | 'description' | 'assistant') => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert("Seu navegador não suporta digitação por voz nativa. Tente usar o Google Chrome ou Safari.");
        return;
      }

      if ((window as any).currentRecognition) {
        try { (window as any).currentRecognition.stop(); } catch(e) {}
        (window as any).currentRecognition = null;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      const initialText = type === 'assistant' ? "" : (getValues(type) || "");
      let finalTranscript = "";

      recognition.onstart = () => {
        setRecordingType(type);
        setRecordingTime(0);
        if (type === 'assistant') setChatInput("");
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const currentText = finalTranscript + interimTranscript;
        if (type === 'assistant') {
          setChatInput(currentText);
        } else {
          setValue(type, initialText + (initialText ? "\n" : "") + currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Erro no reconhecimento de voz:", event.error);
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          alert("Erro ao captar a voz: " + event.error);
        }
        stopRecording();
      };

      recognition.onend = () => {
        stopRecording();
        if (type !== 'assistant') {
          formatTextWithAI(type);
        }
      };

      (window as any).currentRecognition = recognition;
      recognition.start();

    } catch (err) {
      console.error("Erro ao iniciar microfone", err);
    }
  };

  const stopRecording = () => {
    if ((window as any).currentRecognition) {
      try { (window as any).currentRecognition.stop(); } catch(e) {}
      (window as any).currentRecognition = null;
    }
    setRecordingType(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSendChatMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg = text.trim();
    setChatInput("");
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsAssistantProcessing(true);

    try {
      const res = await fetch("/api/generate-full-agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userMsg, history: chatHistory.slice(-5) }) // Manda as ultimas mensagens de contexto
      });
      const data = await res.json();
      
      if (data.result) {
        if (data.result.type === 'chat') {
          setChatHistory(prev => [...prev, { sender: 'bot', text: data.result.message }]);
        } else if (data.result.type === 'agenda') {
          setValue('title', data.result.title);
          if (data.result.date) setValue('date', data.result.date);
          setValue('price', data.result.price);
          setValue('meeting_point', data.result.meeting_point);
          setValue('description', data.result.description);
          
          setChatHistory(prev => [...prev, { sender: 'bot', text: `✨ Prontinho! Acabei de preencher os dados da trilha "${data.result.title}" no painel pra você. Se precisar, pode editar ou apenas clicar em Cadastrar!` }]);
          setActiveTab('geral');
        }
      } else {
        setChatHistory(prev => [...prev, { sender: 'bot', text: "❌ Desculpe, deu um erro aqui no meu servidor. Tente novamente." }]);
      }
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { sender: 'bot', text: "❌ Falha de conexão. A internet caiu?" }]);
    } finally {
      setIsAssistantProcessing(false);
    }
  };

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
        // Se for edição, mantém as fotos antigas e apenas adiciona as novas
        if (!editingAgenda) {
          imageUrls = [];
        }
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
        const { data: newAgenda, error: insertError } = await supabase.from('agendas').insert([payload]).select();
        if (insertError) throw insertError;
        alert("Trilha cadastrada com sucesso!");
        
        reset();
      }
      
      setAiSuccessMeeting(false);
      setAiSuccessDesc(false);
      setActiveTab('geral');
      fetchAgendasAndCleanup();
    } catch (error: any) {
      console.error("Erro completo:", error);
      alert(`Ocorreu um erro: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const globalSiteUrl = "https://www.maistrilhasmenosestresse.com/agenda";
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
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden print:overflow-x-visible print:max-w-none bg-gray-50 pb-28 md:pb-12 text-gray-900 relative">
      <div className="p-4 md:p-12 w-full max-w-6xl print:max-w-none print:p-0 mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Painel da Administradora</h1>
            <p className="text-sm md:text-base text-gray-500">Gerencie suas trilhas, clientes e seguros.</p>
          </div>
          <div className="flex gap-2">
          </div>
        </header>

        <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6 print:hidden">
          <button 
            onClick={() => setMainTab('trilhas')} 
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mainTab === 'trilhas' ? 'bg-[#1D2A3A] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            ⛰️ Trilhas
          </button>
          <button 
            onClick={() => setMainTab('clientes')} 
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mainTab === 'clientes' ? 'bg-[#1D2A3A] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            👥 Clientes e Seguros
          </button>
        </div>

        {mainTab === 'trilhas' ? (
        <div className="grid lg:grid-cols-[1fr_400px] gap-6 md:gap-8 print:hidden">
          
          <div className={`bg-white rounded-2xl shadow-sm border transition-all ${editingAgenda ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-gray-100'} overflow-hidden`}>
            
            <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CalendarDays className={`h-5 w-5 ${editingAgenda ? 'text-orange-600' : 'text-orange-500'}`} /> 
                {editingAgenda ? 'Editando Trilha' : 'Nova Trilha'}
              </h2>
              {editingAgenda && (
                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold animate-pulse">Modo de Edição</span>
              )}
            </div>

            <div className="flex border-b border-gray-100 bg-white sticky top-0 z-20">
              <button 
                type="button"
                onClick={() => setActiveTab('geral')}
                className={`flex-1 py-3.5 text-xs md:text-sm font-bold flex flex-col md:flex-row items-center justify-center gap-1.5 border-b-2 transition-all ${activeTab === 'geral' ? 'border-[#F17B37] text-[#F17B37]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <Navigation className="h-4 w-4" /> Dados
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('textos')}
                className={`flex-1 py-3.5 text-xs md:text-sm font-bold flex flex-col md:flex-row items-center justify-center gap-1.5 border-b-2 transition-all ${activeTab === 'textos' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <Mic className="h-4 w-4" /> Áudio e Textos
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('midias')}
                className={`flex-1 py-3.5 text-xs md:text-sm font-bold flex flex-col md:flex-row items-center justify-center gap-1.5 border-b-2 transition-all ${activeTab === 'midias' ? 'border-orange-400 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <Camera className="h-4 w-4" /> Mídias
              </button>
            </div>
            
            <form id="admin-form" onSubmit={handleSubmit(onSubmit)} className="p-4 md:p-6 min-h-[300px]">
              
              {activeTab === 'geral' && (
                <div className="space-y-4 md:space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">Título da Trilha</label>
                    <input 
                      {...register("title", { required: true })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all" 
                      placeholder="Ex: Serra do Cipó" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-1.5 text-gray-700">Data</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                        <input 
                          type="date"
                          {...register("date", { required: true })}
                          className="pl-10 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-1.5 text-gray-700">Valor (R$)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                        <input 
                          {...register("price", { required: true })}
                          inputMode="decimal"
                          className="pl-10 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all" 
                          placeholder="Ex: 150.00" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3 mt-4">
                    <AlertCircle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-800">
                      Preencheu tudo aqui? Clique na aba <strong>Áudio e Textos</strong> lá no topo para continuar preenchendo a sua trilha com a IA.
                    </p>
                  </div>
                  
                </div>
              )}

              {activeTab === 'textos' && (
                <div className="space-y-4 md:space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  
                  <div className={`p-4 rounded-xl border transition-colors ${aiSuccessMeeting ? 'bg-green-50 border-green-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                      <label className="text-sm font-bold text-gray-800">📍 Pontos de Encontro</label>
                      
                      <div className="flex items-center gap-2">
                        {recordingType === 'meeting_point' ? (
                          <button type="button" onClick={stopRecording} className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 animate-pulse border border-red-200 shadow-sm">
                            <Square className="h-3 w-3 fill-red-700" /> {formatRecordingTime(recordingTime)} - PARAR E GERAR
                          </button>
                        ) : (
                          <button type="button" onClick={() => startRecording('meeting_point')} disabled={isFormattingMeetingPoint || recordingType !== null} className="text-xs bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg font-bold hover:bg-red-100 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                            <Mic className="h-4 w-4" /> ÁUDIO IA
                          </button>
                        )}
                        <button type="button" onClick={() => formatTextWithAI('meeting_point')} disabled={isFormattingMeetingPoint || recordingType !== null} className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-2 rounded-lg font-bold hover:bg-blue-100 transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm">
                          {isFormattingMeetingPoint ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Formatar
                        </button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <textarea 
                        {...register("meeting_point", { required: true })}
                        className={`w-full h-[30vh] max-h-[400px] p-3 bg-white border border-gray-200 rounded-xl outline-none resize-none transition-all focus:border-blue-400 custom-scrollbar ${isFormattingMeetingPoint ? 'opacity-50' : ''}`} 
                        placeholder="Clique no botão 'ÁUDIO IA' e fale os locais e horários. Ex: 'O ônibus passa no Terminal às 5 horas...'" 
                        readOnly={isFormattingMeetingPoint}
                      />
                      {isFormattingMeetingPoint && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl backdrop-blur-sm z-10">
                          <span className="flex items-center gap-2 text-sm font-bold text-blue-700 bg-white px-4 py-2 rounded-full shadow-lg"><Loader2 className="animate-spin h-4 w-4"/> A Inteligência Artificial está escrevendo...</span>
                        </div>
                      )}
                    </div>
                    {aiSuccessMeeting && <p className="text-xs text-green-600 mt-2 font-medium">✅ Formatado perfeitamente!</p>}
                  </div>

                  <div className={`p-4 rounded-xl border transition-colors ${aiSuccessDesc ? 'bg-green-50 border-green-200' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100'}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                      <label className="text-sm font-bold text-gray-800">📝 Roteiro e Descrição</label>
                      
                      <div className="flex items-center gap-2">
                        {recordingType === 'description' ? (
                          <button type="button" onClick={stopRecording} className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 animate-pulse border border-red-200 shadow-sm">
                            <Square className="h-3 w-3 fill-red-700" /> {formatRecordingTime(recordingTime)} - PARAR E GERAR
                          </button>
                        ) : (
                          <button type="button" onClick={() => startRecording('description')} disabled={isFormattingDescription || recordingType !== null} className="text-xs bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg font-bold hover:bg-red-100 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                            <Mic className="h-4 w-4" /> ÁUDIO IA
                          </button>
                        )}
                        <button type="button" onClick={() => formatTextWithAI('description')} disabled={isFormattingDescription || recordingType !== null} className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-2 rounded-lg font-bold hover:bg-purple-100 transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm">
                          {isFormattingDescription ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Revisar
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <textarea 
                        {...register("description", { required: true })}
                        className={`w-full h-[40vh] max-h-[500px] p-3 bg-white border border-gray-200 rounded-xl outline-none resize-none transition-all focus:border-purple-400 custom-scrollbar ${isFormattingDescription ? 'opacity-50' : ''}`} 
                        placeholder="Clique no botão 'ÁUDIO IA' e comece a descrever a trilha, as belezas naturais e as recomendações..." 
                        readOnly={isFormattingDescription}
                      />
                      {isFormattingDescription && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl backdrop-blur-sm z-10">
                          <span className="flex items-center gap-2 text-sm font-bold text-purple-700 bg-white px-4 py-2 rounded-full shadow-lg"><Loader2 className="animate-spin h-4 w-4"/> A Inteligência Artificial está escrevendo...</span>
                        </div>
                      )}
                    </div>
                    {aiSuccessDesc && <p className="text-xs text-green-600 mt-2 font-medium">✅ Roteiro gerado com sucesso!</p>}
                  </div>

                </div>
              )}

              {activeTab === 'midias' && (
                <div className="space-y-4 md:space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-[#F17B37] bg-[#F17B37]/5 rounded-xl p-6 text-center hover:bg-[#F17B37]/10 transition relative group flex flex-col items-center">
                      <FileUp className="mx-auto h-8 w-8 text-[#F17B37] mb-3 group-hover:scale-110 transition" />
                      <p className="text-base text-gray-800 font-bold">{editingAgenda ? 'Substituir Flyer Principal' : 'Flyer/Capa (Para WhatsApp)'}</p>
                      <p className="text-sm font-bold text-[#F17B37] mt-2 bg-white inline-block px-4 py-1 rounded-full shadow-sm">
                        {selectedFlyer && selectedFlyer.length > 0 ? `Flyer selecionado` : 'Toque para Selecionar'}
                      </p>
                      <input type="file" accept="image/*" {...register("flyer")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    </div>

                    <div className="border-2 border-dashed border-orange-200 bg-orange-50/50 rounded-xl p-6 text-center hover:bg-orange-50 transition relative group">
                      <ImageIcon className="mx-auto h-8 w-8 text-orange-400 mb-3 group-hover:scale-110 transition" />
                      <p className="text-base text-gray-700 font-bold">{editingAgenda ? 'Adicionar mais Fotos' : 'Fotos do Local'}</p>
                      <p className="text-sm font-bold text-orange-600 mt-2 bg-white inline-block px-4 py-1 rounded-full shadow-sm">
                        {selectedImages && selectedImages.length > 0 ? `${selectedImages.length} fotos selecionadas` : 'Selecionar Múltiplas'}
                      </p>
                      <input type="file" multiple accept="image/*" {...register("images")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>

                    <div className="md:col-span-2 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-6 text-center hover:bg-blue-50 transition relative group">
                      <Video className="mx-auto h-8 w-8 text-blue-400 mb-3 group-hover:scale-110 transition" />
                      <p className="text-base text-gray-700 font-bold">Upload de Vídeo Promocional</p>
                      <p className="text-sm font-bold text-blue-600 mt-2 bg-white inline-block px-4 py-1 rounded-full shadow-sm">
                        {selectedVideo && selectedVideo.length > 0 ? `Vídeo pronto para envio` : 'Toque para Selecionar (Opcional)'}
                      </p>
                      <input type="file" accept="video/*" {...register("video")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                  </div>
                </div>
              )}

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 md:relative md:bg-transparent md:border-0 md:p-0 md:mt-8 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] md:shadow-none flex items-center gap-3">
                
                <div className="flex gap-3 max-w-6xl mx-auto w-full">
                  <button 
                    type="submit" 
                    form="admin-form"
                    disabled={isLoading || recordingType !== null}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#1D2A3A] to-gray-800 text-white p-4 rounded-xl font-bold hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100 shadow-lg text-sm md:text-base"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>{editingAgenda ? '💾 Salvar Alterações da Trilha' : '🚀 Cadastrar Nova Trilha'}</>
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

          <div className="space-y-6">
            
            <div className="bg-gradient-to-br from-[#1D2A3A] to-gray-900 rounded-2xl p-6 text-white shadow-xl border border-gray-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366] rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
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
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white p-3.5 rounded-xl font-semibold hover:bg-[#1ebd5a] transition hover:shadow-[0_0_20px_rgba(37,211,102,0.4)]"
              >
                <Send className="h-5 w-5" />
                Compartilhar no Grupo
              </a>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 h-[400px] md:h-auto overflow-hidden flex flex-col">
              <h3 className="font-bold text-gray-800 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  Trilhas Ativas
                  <span className="bg-[#F17B37]/10 text-[#F17B37] text-xs py-1 px-3 rounded-full font-bold">{agendas.length}</span>
                </div>
                {globalViews !== undefined && (
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl border border-green-200 shadow-sm">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">Total de Acessos: {globalViews}</span>
                  </div>
                )}
              </h3>
              
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar">
                {isFetching ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-3 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin text-[#F17B37]" />
                    <p className="text-sm font-medium">Carregando agendas...</p>
                  </div>
                ) : agendas.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">Nenhuma trilha futura cadastrada ainda.</p>
                  </div>
                ) : (
                  agendas.map((agenda) => (
                    <div key={agenda.id} className={`flex items-center justify-between p-3.5 bg-gray-50 border rounded-xl hover:border-gray-300 transition-all ${editingAgenda?.id === agenda.id ? 'border-[#F17B37] bg-[#F17B37]/5 shadow-sm' : 'border-gray-100 hover:shadow-md'}`}>
                      <div className="truncate pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-gray-800 truncate">{agenda.title}</p>
                          <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-blue-200 shrink-0 shadow-sm" title="Pessoas que entraram nesta trilha">
                            <Eye className="h-3 w-3" /> {agenda.views || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-gray-400" /> {formatDateDisplay(agenda.date)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-green-600"><DollarSign className="h-3 w-3" /> {agenda.price}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => handleEdit(agenda)}
                          className={`p-2 rounded-lg transition-colors ${editingAgenda?.id === agenda.id ? 'text-white bg-[#F17B37]' : 'text-gray-400 hover:text-white hover:bg-[#F17B37]'}`}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => deleteAgenda(agenda.id)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
                          title="Excluir"
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
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 print:hidden">
              <div>
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2"><User className="text-[#F17B37]" /> Clientes & Seguros</h2>
                <p className="text-gray-500 text-sm mt-1">Gerencie os formulários de saúde e seguro-aventura.</p>
              </div>
              <button 
                onClick={() => window.print()}
                className="bg-[#1D2A3A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition"
              >
                <FileText className="h-4 w-4" /> Imprimir Relatório para Seguradora
              </button>
            </div>

            {/* Cabeçalho apenas visível na Impressão */}
            <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
              <style>{`@media print { @page { size: landscape; margin: 10mm; } }`}</style>
              <h1 className="text-3xl font-black uppercase tracking-widest mb-2">Relatório de Seguros</h1>
              <p className="text-gray-600">Mais Trilha Menos Estresse - Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="overflow-x-auto print:overflow-visible rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm whitespace-nowrap print:whitespace-normal print:text-[10px]">
                <thead className="bg-gray-100 text-gray-700 print:text-[10px]">
                  <tr>
                    <th className="p-4 font-bold border-b print:border-black">Cliente</th>
                    <th className="p-4 font-bold border-b print:border-black">Documentos</th>
                    <th className="p-4 font-bold border-b print:border-black">Contato</th>
                    <th className="p-4 font-bold border-b print:border-black">Emergência</th>
                    <th className="p-4 font-bold border-b print:border-black w-1/4">Saúde / Observações</th>
                    <th className="p-4 font-bold border-b print:hidden text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-black">
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">
                        Nenhum cliente cadastrado ainda. Compartilhe o link <strong className="text-[#F17B37]">www.maistrilhasmenosestresse.com/cadastro</strong>
                      </td>
                    </tr>
                  ) : (
                    clients.map(client => (
                      <tr key={client.id} className="hover:bg-gray-50 transition-colors print:break-inside-avoid">
                        <td className="p-4 flex items-center gap-3">
                          {client.photo_url ? (
                            <img src={client.photo_url} alt="Foto" className="h-10 w-10 rounded-full object-cover shrink-0 print:hidden border border-gray-200" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0 print:hidden">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900">{client.full_name}</p>
                            <p className="text-xs text-gray-500">Nasc: {new Date(client.birth_date).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-gray-900"><strong>CPF:</strong> {client.cpf}</p>
                          <p className="text-gray-500 text-xs mt-0.5"><strong>RG:</strong> {client.rg}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-gray-900 font-bold whitespace-nowrap">{client.phone}</p>
                          <p className="text-gray-500 text-xs mt-0.5 whitespace-nowrap">{client.email || 'Sem e-mail'}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-gray-900 font-medium">{client.emergency_contact_name}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{client.emergency_contact_phone}</p>
                        </td>
                        <td className="p-4 whitespace-normal min-w-[250px]">
                          <span className={`block whitespace-pre-wrap text-xs font-bold px-2.5 py-1.5 rounded-md ${client.health_notes && client.health_notes.toLowerCase() !== 'nenhuma' && client.health_notes.toLowerCase() !== 'não tem' ? 'bg-red-50 text-red-700 border border-red-200 print:border-red-700 print:bg-transparent' : 'bg-gray-50 text-gray-600 print:bg-transparent'}`}>
                            {client.health_notes || "Nenhuma observação"}
                          </span>
                        </td>
                        <td className="p-4 print:hidden">
                          <div className="flex items-center justify-center gap-2">
                            <a 
                              href={`/admin/termo/${client.id}`}
                              target="_blank"
                              className="p-2 text-gray-400 hover:text-[#F17B37] hover:bg-[#F17B37]/10 rounded-lg transition-colors"
                              title="Ver Termo Assinado"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                            <button 
                              onClick={() => setEditingClient(client)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar Cliente"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteClient(client.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir Cliente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 print:hidden">
              <ShieldCheck className="h-6 w-6 text-blue-500 shrink-0" />
              <div>
                <p className="font-bold text-blue-900">Link Público de Cadastro</p>
                <p className="text-sm text-blue-700 mb-2">Envie este link para as pessoas preencherem o formulário no celular:</p>
                <a href="/cadastro" target="_blank" className="font-mono bg-white text-blue-600 px-3 py-1.5 rounded border border-blue-200 text-sm hover:bg-blue-600 hover:text-white transition">
                  www.maistrilhasmenosestresse.com/cadastro
                </a>
              </div>
            </div>
            
          </div>
        )}

      </div>

      {/* BOTÃO FLUTUANTE DO ASSISTENTE IA */}
      <button
        onClick={() => setIsAssistantOpen(true)}
        className="fixed bottom-[90px] md:bottom-8 right-4 md:right-8 bg-transparent text-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.4)] hover:scale-110 transition-transform z-40 animate-bounce border-2 border-[#F17B37] overflow-hidden print:hidden"
        title="Assistente IA (Chat Mágico)"
      >
        <img src="/logo.png" alt="Logo Mais Trilha" className="h-16 w-16 object-cover scale-110" />
      </button>

      {/* MODAL DO ASSISTENTE IA (CHAT HÍBRIDO) */}
      {isAssistantOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col h-[85vh] max-h-[800px]">
            
            <div className="bg-gradient-to-r from-gray-900 to-black border-b-2 border-[#F17B37] p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="rounded-full overflow-hidden border border-white/20 shadow-sm w-10 h-10 flex shrink-0">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-110" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Assistente IA</h3>
                  <p className="text-purple-100 text-xs mt-0.5">Converse ou mande cadastrar trilhas</p>
                </div>
              </div>
              <button onClick={() => { setIsAssistantOpen(false); stopRecording(); }} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 bg-gray-50 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-purple-600 text-white rounded-br-none shadow-sm' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm whitespace-pre-wrap'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isAssistantProcessing && (
                <div className="flex w-full justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1.5 shadow-sm">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="bg-white border-t border-gray-100 p-3 shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 p-1.5 rounded-3xl focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all">
                <textarea 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isAssistantProcessing && recordingType !== 'assistant') {
                        handleSendChatMessage(chatInput);
                      }
                    }
                  }}
                  placeholder="Digite ou grave áudio..."
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent outline-none p-3 text-sm resize-none custom-scrollbar"
                  rows={1}
                />
                
                {chatInput.trim() && recordingType !== 'assistant' ? (
                  <button 
                    onClick={() => handleSendChatMessage(chatInput)}
                    disabled={isAssistantProcessing}
                    className="bg-purple-600 text-white h-11 w-11 rounded-full flex items-center justify-center shrink-0 hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Send className="h-5 w-5 ml-1" />
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (recordingType === 'assistant') {
                        stopRecording();
                        // Como o finalTranscript de dentro da closure pode estar desatualizado,
                        // pegamos o texto atual do chatInput e enviamos
                        if (chatInput.trim().length > 3) {
                          handleSendChatMessage(chatInput.trim());
                        }
                      } else {
                        startRecording('assistant');
                      }
                    }}
                    disabled={isAssistantProcessing}
                    className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      recordingType === 'assistant' 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {recordingType === 'assistant' ? <Square className="h-5 w-5 fill-white" /> : <Mic className="h-5 w-5" />}
                  </button>
                )}
              </div>
              {recordingType === 'assistant' && (
                <p className="text-center text-xs text-red-500 font-bold mt-2 animate-pulse">Gravando... {formatRecordingTime(recordingTime)}</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE CLIENTE */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditedClient} className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button 
              type="button"
              onClick={() => setEditingClient(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-500" /> Editar Cliente
            </h2>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                <input 
                  type="text" required
                  value={editingClient.full_name}
                  onChange={e => setEditingClient({...editingClient, full_name: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">CPF</label>
                  <input 
                    type="text" required
                    value={editingClient.cpf}
                    onChange={e => setEditingClient({...editingClient, cpf: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">RG</label>
                  <input 
                    type="text" required
                    value={editingClient.rg}
                    onChange={e => setEditingClient({...editingClient, rg: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">E-mail</label>
                  <input 
                    type="email" required
                    value={editingClient.email}
                    onChange={e => setEditingClient({...editingClient, email: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label>
                  <input 
                    type="text" required
                    value={editingClient.phone}
                    onChange={e => setEditingClient({...editingClient, phone: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Saúde / Observações</label>
                <textarea 
                  value={editingClient.health_notes}
                  onChange={e => setEditingClient({...editingClient, health_notes: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none" 
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                type="button" 
                onClick={() => setEditingClient(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" /> Salvar Edição
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
