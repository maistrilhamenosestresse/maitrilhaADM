"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, DollarSign, FileText, Send, Image as ImageIcon, Video, Loader2, Trash2, 
  CalendarDays, Edit2, Sparkles, CheckCircle2, FileUp, Mic, Square, Navigation, 
  Camera, AlertCircle, X, Plus, Eye, User, ShieldCheck, Search, ChevronDown, ChevronUp 
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AgendaForm = {
  title: string; location: string; date: string; price: string;
  description: string; meeting_point: string;
  flyer: FileList; images: FileList; video: FileList;
};

type ChatMessage = { sender: 'user' | 'bot'; text: string; };

export default function AdminPage() {
  const { register, handleSubmit, reset, watch, setValue, getValues } = useForm<AgendaForm>();
  const [isLoading, setIsLoading] = useState(false);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [globalViews, setGlobalViews] = useState<number>(0);
  const [clients, setClients] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Novos estados para a UI tipo App
  const [mainTab, setMainTab] = useState<'trilhas' | 'clientes'>('trilhas');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [expandedAgendaId, setExpandedAgendaId] = useState<string | null>(null);
  const [editingAgenda, setEditingAgenda] = useState<any>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'textos' | 'midias'>('geral');

  // Estados de IA e Gravação (Mantidos intactos)
  const [isFormattingMeetingPoint, setIsFormattingMeetingPoint] = useState(false);
  const [isFormattingDescription, setIsFormattingDescription] = useState(false);
  const [aiSuccessMeeting, setAiSuccessMeeting] = useState(false);
  const [aiSuccessDesc, setAiSuccessDesc] = useState(false);
  const [recordingType, setRecordingType] = useState<'meeting_point' | 'description' | 'assistant' | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAssistantProcessing]);

  // --- Funções de Clientes ---
  const filteredClients = clients.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cpf.includes(searchTerm)
  );

  const toggleClientExpand = (id: string) => {
    setExpandedClientId(expandedClientId === id ? null : id);
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este cliente permanentemente?")) return;
    try {
      await supabase.from('clients').delete().eq('id', id);
      setClients(clients.filter(c => c.id !== id));
    } catch (err: any) { alert("Erro ao excluir cliente."); }
  };

  const handleSaveEditedClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('clients').update({
        full_name: editingClient.full_name, email: editingClient.email,
        cpf: editingClient.cpf, rg: editingClient.rg,
        phone: editingClient.phone, health_notes: editingClient.health_notes
      }).eq('id', editingClient.id);
      setClients(clients.map(c => c.id === editingClient.id ? editingClient : c));
      setEditingClient(null);
      alert("Cliente atualizado!");
    } catch (err: any) { alert("Erro ao editar cliente."); }
  };

  // --- Funções de Trilhas e IA (Mantidas intactas) ---
  const deleteAgenda = async (id: string) => {
    if (!window.confirm("Excluir esta trilha?")) return;
    try {
      await supabase.from('agendas').delete().eq('id', id);
      fetchAgendasAndCleanup();
    } catch (error: any) { alert("Erro ao excluir."); }
  };

  const handleEdit = (agenda: any) => {
    setEditingAgenda(agenda);
    setValue("title", agenda.title); setValue("date", agenda.date);
    setValue("price", agenda.price.toString().replace('.', ','));
    setValue("meeting_point", agenda.meeting_point); setValue("description", agenda.description);
    setActiveTab('geral');
    setIsFormModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingAgenda(null); reset(); setIsFormModalOpen(false);
  };

  const startRecording = async (type: 'meeting_point' | 'description' | 'assistant') => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) { alert("Navegador não suporta voz."); return; }

      if ((window as any).currentRecognition) {
        try { (window as any).currentRecognition.stop(); } catch(e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR'; recognition.continuous = true; recognition.interimResults = true;

      const initialText = type === 'assistant' ? "" : (getValues(type) || "");
      let finalTranscript = "";

      recognition.onstart = () => {
        setRecordingType(type); setRecordingTime(0);
        if (type === 'assistant') setChatInput("");
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
          else interimTranscript += event.results[i][0].transcript;
        }
        const currentText = finalTranscript + interimTranscript;
        if (type === 'assistant') setChatInput(currentText);
        else setValue(type, initialText + (initialText ? "\\n" : "") + currentText);
      };

      recognition.onend = () => {
        setRecordingType(null); if (timerRef.current) clearInterval(timerRef.current);
        if (type !== 'assistant') formatTextWithAI(type);
      };

      (window as any).currentRecognition = recognition; recognition.start();
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => {
    if ((window as any).currentRecognition) {
      try { (window as any).currentRecognition.stop(); } catch(e) {}
    }
    setRecordingType(null); if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSendChatMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = text.trim(); setChatInput("");
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsAssistantProcessing(true);

    try {
      const res = await fetch("/api/generate-full-agenda", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userMsg, history: chatHistory.slice(-5) })
      });
      
      if (!res.ok) throw new Error(`Erro no servidor: ${res.status}`);
      
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
          setChatHistory(prev => [...prev, { sender: 'bot', text: `✨ Preenchi os dados de "${data.result.title}".` }]);
          setIsFormModalOpen(true);
        }
      }
    } catch (error: any) {
      console.error("Erro no Chat da IA:", error);
      setChatHistory(prev => [...prev, { sender: 'bot', text: `❌ Falha na IA. Verifique o terminal do servidor ou sua API Key. (Erro: ${error.message})` }]);
    } finally { setIsAssistantProcessing(false); }
  };

  const formatTextWithAI = async (type: 'meeting_point' | 'description') => {
    const text = getValues(type);
    if (!text || text.trim().length < 5) return;

    if (type === 'meeting_point') setIsFormattingMeetingPoint(true);
    else setIsFormattingDescription(true);

    try {
      const res = await fetch("/api/generate-message", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, type })
      });
      
      if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
      
      const data = await res.json();
      if (data.result) {
        setValue(type, data.result);
        if (type === 'meeting_point') setAiSuccessMeeting(true); else setAiSuccessDesc(true);
      }
    } catch (error: any) {
      console.error("Erro na Formatação da IA:", error);
      alert(`Ops! A Inteligência Artificial falhou. Verifique se o backend está rodando ou se sua chave (API Key) não expirou.\n\nDetalhe: ${error.message}`);
    } 
    finally {
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
      
      // Upload Flyer
      if (data.flyer && data.flyer.length > 0) {
        const file = data.flyer[0];
        const fileName = `flyer_${Date.now()}.${file.name.split('.').pop()}`;
        await supabase.storage.from('fotos_agendas').upload(fileName, file);
        flyerUrl = supabase.storage.from('fotos_agendas').getPublicUrl(fileName).data.publicUrl;
      }
      // Upload Images
      if (data.images && data.images.length > 0) {
        if (!editingAgenda) imageUrls = [];
        for (let i = 0; i < data.images.length; i++) {
          const file = data.images[i];
          const fileName = `img_${Date.now()}_${i}.${file.name.split('.').pop()}`;
          await supabase.storage.from('fotos_agendas').upload(fileName, file);
          imageUrls.push(supabase.storage.from('fotos_agendas').getPublicUrl(fileName).data.publicUrl);
        }
      }

      
      if (data.video && data.video.length > 0) {
        const file = data.video[0];
        const fileName = `vid_${Date.now()}.${file.name.split('.').pop()}`;
        await supabase.storage.from('fotos_agendas').upload(fileName, file);
        videoUrl = supabase.storage.from('fotos_agendas').getPublicUrl(fileName).data.publicUrl;
      }

      const payload = {
        title: data.title, date: data.date, price: parseFloat(data.price.replace(',', '.')),
        description: data.description, meeting_point: data.meeting_point,
        images: imageUrls, video_url: videoUrl, flyer_url: flyerUrl
      };

      if (editingAgenda) {
        await supabase.from('agendas').update(payload).eq('id', editingAgenda.id);
      } else {
        await supabase.from('agendas').insert([payload]);
      }
      
      setIsFormModalOpen(false);
      reset();
      fetchAgendasAndCleanup();
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateDisplay = (dateString: string) => {
    const [year, month, day] = dateString.split('-'); return `${day}/${month}/${year}`;
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(`⛰️ A nossa agenda oficial chegou! Prepare as botas!\n\n👉 https://www.maistrilhasmenosestresse.com/agenda`)}`;

  return (
    <div suppressHydrationWarning className="h-[100dvh] print:h-auto print:min-h-screen w-full flex flex-col bg-gray-50 overflow-hidden print:overflow-visible relative">
      
      {/* 1. HEADER FIXO ESTILO APP */}
      <header className="bg-white border-b border-gray-100 px-5 py-4 shrink-0 shadow-sm flex items-center justify-between z-10 print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-[#1D2A3A] p-2 rounded-xl shadow-md">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-tight">Painel Admin</h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Mais Trilha Menos Estresse</p>
          </div>
        </div>
        {mainTab === 'clientes' && (
          <div className="flex gap-2">
            <button 
                  onClick={() => {
                    const text = clients.map((c, i) => 
                      `*${i + 1}. ${c.full_name}*\nNasc: ${new Date(c.birth_date).toLocaleDateString('pt-BR')}\nCPF: ${c.cpf} | RG: ${c.rg}\nTel: ${c.phone}\nEmergência: ${c.emergency_contact_name} (${c.emergency_contact_phone})\nSaúde: ${c.health_notes || 'Nenhuma'}`
                    ).join('\n\n');
                    const header = `*RELATÓRIO DE SEGUROS - MAIS TRILHA*\nData: ${new Date().toLocaleDateString('pt-BR')}\nTotal de Clientes: ${clients.length}\n\n`;
                    navigator.clipboard.writeText(header + text).then(() => alert('Lista copiada com sucesso! Agora é só colar no WhatsApp.')).catch(() => alert('Erro ao copiar. Tente novamente.'));
                  }}
                  className="bg-[#25D366] text-white p-2.5 rounded-full hover:bg-[#20bd5a] transition shadow-sm" title="Copiar p/ WhatsApp"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </button>
            <button onClick={() => window.print()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-full transition" title="Imprimir Relatório">
              <FileText className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>

      {/* 2. ÁREA CENTRAL DE CONTEÚDO ROLÁVEL */}
      <main className="flex-1 overflow-y-auto print:overflow-visible custom-scrollbar p-4 md:p-6 pb-28">
        <div className="max-w-4xl mx-auto w-full">
          
          <AnimatePresence mode="wait">
            {/* --- VISÃO DAS TRILHAS --- */}
            {mainTab === 'trilhas' && (
              <motion.div key="trilhas" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                
                {/* Banner de Enviar Calendário */}
                <div className="bg-gradient-to-br from-[#1D2A3A] to-gray-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366] rounded-full blur-[60px] opacity-20" />
                  <h3 className="font-bold text-lg mb-1">Enviar Calendário</h3>
                  <p className="text-sm text-gray-300 mb-5 max-w-[80%]">Compartilhe as próximas aventuras no WhatsApp.</p>
                  <a href={whatsappLink} target="_blank" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:scale-105 transition">
                    <Send className="h-4 w-4" /> Enviar no Grupo
                  </a>
                </div>

                {/* Lista de Trilhas */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      Trilhas Ativas
                      <span className="bg-[#F17B37]/10 text-[#F17B37] text-xs py-1 px-3 rounded-full font-black">{agendas.length}</span>
                    </h3>
                    {globalViews > 0 && (
                      <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-xl border border-green-200 shadow-sm">
                        <Eye className="h-4 w-4" />
                        <span className="text-xs font-extrabold uppercase tracking-wide">Acessos: {globalViews}</span>
                      </div>
                    )}
                  </div>
                  
                  {isFetching ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#F17B37]" /></div>
                  ) : agendas.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">
                      <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">Nenhuma aventura planejada.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {agendas.map((agenda) => (
                        <div key={agenda.id} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${expandedAgendaId === agenda.id ? 'border-[#F17B37] ring-1 ring-[#F17B37]/20' : 'border-gray-100 hover:shadow-md'}`}>
                          <div 
                            onClick={() => setExpandedAgendaId(expandedAgendaId === agenda.id ? null : agenda.id)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 gap-4"
                          >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className="h-14 w-14 rounded-xl bg-[#F17B37]/10 flex flex-col items-center justify-center shrink-0 border border-[#F17B37]/20">
                                <span className="text-xs font-bold text-[#F17B37]">{formatDateDisplay(agenda.date).substring(0, 5)}</span>
                              </div>
                              <div className="flex-1 min-w-0 pr-2">
                                <h4 className="font-bold text-gray-900 truncate">{agenda.title}</h4>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <p className="text-sm font-medium text-green-600">R$ {agenda.price}</p>
                                  <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                                    <Eye className="h-3 w-3" /> {agenda.views || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-gray-400">
                              {expandedAgendaId === agenda.id ? <ChevronUp /> : <ChevronDown />}
                            </div>
                          </div>

                          <AnimatePresence>
                            {expandedAgendaId === agenda.id && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-gray-100 bg-gray-50/50"
                              >
                                <div className="p-4 flex flex-col sm:flex-row items-center justify-end gap-3">
                                  <button onClick={() => handleEdit(agenda)} className="w-full sm:w-auto py-2.5 px-6 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition flex items-center justify-center gap-2"><Edit2 className="h-4 w-4" /> Editar Trilha</button>
                                  <button onClick={() => deleteAgenda(agenda.id)} className="w-full sm:w-auto py-2.5 px-6 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* --- VISÃO DOS CLIENTES --- */}
            {mainTab === 'clientes' && (
              <motion.div key="clientes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                
                {/* Cabeçalho Impressão */}
                <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
                  <style>{`
                    @media print { 
                      @page { size: landscape; margin: 10mm; } 
                      html, body { width: 1000px !important; min-width: 1000px !important; overflow: visible !important; }
                    }
                  `}</style>
                  <h1 className="text-3xl font-black uppercase tracking-widest mb-2">Relatório de Seguros</h1>
                  <p suppressHydrationWarning className="text-gray-600">Mais Trilha Menos Estresse - Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                {/* Barra de Pesquisa */}
                <div className="relative print:hidden">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input 
                    type="search" 
                    placeholder="Buscar por nome ou CPF..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#F17B37] outline-none font-medium"
                  />
                </div>

                <div className="print:hidden">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">Total: {filteredClients.length} Cadastrados</p>
                  
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-10">
                      <User className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Nenhum cliente encontrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[55vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
                      {filteredClients.map(client => (
                        <div key={client.id} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${expandedClientId === client.id ? 'border-[#F17B37] ring-1 ring-[#F17B37]/20' : 'border-gray-200'}`}>
                          
                          {/* Cabeçalho do Card (Sempre visível) */}
                          <div 
                            onClick={() => toggleClientExpand(client.id)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {client.photo_url ? (
                                <img src={client.photo_url} className="h-12 w-12 rounded-full object-cover shrink-0 border-2 border-gray-100" />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                  <User className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0 pr-2">
                                <h4 className="font-bold text-gray-900 truncate">{client.full_name}</h4>
                                <p className="text-sm text-gray-500">{client.phone}</p>
                              </div>
                            </div>
                            <div className="shrink-0 text-gray-400">
                              {expandedClientId === client.id ? <ChevronUp /> : <ChevronDown />}
                            </div>
                          </div>

                          {/* Detalhes do Card (Sanfona) */}
                          <AnimatePresence>
                            {expandedClientId === client.id && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-gray-100 bg-gray-50/50"
                              >
                                <div className="p-4 space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><p className="text-gray-500 text-xs font-bold uppercase">CPF</p><p className="font-medium">{client.cpf}</p></div>
                                    <div><p className="text-gray-500 text-xs font-bold uppercase">RG</p><p className="font-medium">{client.rg}</p></div>
                                    <div className="col-span-2"><p className="text-gray-500 text-xs font-bold uppercase">Contato Emergência</p><p className="font-medium">{client.emergency_contact_name} - {client.emergency_contact_phone}</p></div>
                                  </div>
                                  
                                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                    <p className="text-red-800 text-xs font-bold uppercase mb-1">Saúde & Observações</p>
                                    <p className="text-sm font-medium text-red-900 whitespace-pre-wrap">{client.health_notes || "Nenhuma anotação."}</p>
                                  </div>

                                  <div className="flex items-center gap-2 pt-2">
                                    <a href={`/admin/termo/${client.id}`} target="_blank" className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition shadow-sm"><FileText className="h-4 w-4"/> Ver Termo</a>
                                    <button onClick={() => setEditingClient(client)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition"><Edit2 className="h-4 w-4"/></button>
                                    <button onClick={() => handleDeleteClient(client.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"><Trash2 className="h-4 w-4"/></button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Link de Cadastro */}
                <div className="mt-8 bg-blue-50 border border-blue-100 p-5 rounded-2xl print:hidden">
                  <ShieldCheck className="h-8 w-8 text-blue-500 mb-2" />
                  <p className="font-bold text-blue-900 text-lg">Link Público de Cadastro</p>
                  <p className="text-sm text-blue-700 mb-3">Envie este link para preenchimento de formulário e seguro:</p>
                  <a href="/cadastro" target="_blank" className="font-mono bg-white text-blue-600 p-3 rounded-xl border border-blue-200 text-sm hover:bg-blue-600 hover:text-white transition block break-all text-center font-bold shadow-sm">
                    www.maistrilhasmenosestresse.com/cadastro
                  </a>
                </div>

                {/* Tabela só para Impressão */}
                <div className="hidden print:block">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead><tr><th className="border p-2">Cliente</th><th className="border p-2">Documentos</th><th className="border p-2">Contato</th><th className="border p-2">Emergência</th><th className="border p-2">Saúde</th></tr></thead>
                    <tbody>
                      {clients.map(c => (
                        <tr key={c.id}>
                          <td className="border p-2 font-bold">{c.full_name}<br/><span suppressHydrationWarning className="font-normal text-[8px]">Nasc: {new Date(c.birth_date).toLocaleDateString('pt-BR')}</span></td>
                          <td className="border p-2">CPF: {c.cpf}<br/>RG: {c.rg}</td>
                          <td className="border p-2">{c.phone}<br/>{c.email}</td>
                          <td className="border p-2">{c.emergency_contact_name}<br/>{c.emergency_contact_phone}</td>
                          <td className="border p-2 text-red-700 font-bold max-w-[200px] whitespace-pre-wrap">{c.health_notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 3. BOTÃO FLUTUANTE (FAB) PARA NOVA TRILHA */}
      {mainTab === 'trilhas' && (
        <button 
          onClick={() => { reset(); setEditingAgenda(null); setIsFormModalOpen(true); }}
          className="fixed bottom-24 right-5 md:bottom-8 md:right-8 bg-[#F17B37] text-white p-4 rounded-full shadow-[0_8px_30px_rgba(241,123,55,0.4)] hover:scale-105 active:scale-95 transition-all z-20 print:hidden flex items-center justify-center"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      {/* 4. MENU INFERIOR (BOTTOM NAVIGATION) TIPO APP */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full z-30 pb-safe print:hidden shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <div className="flex justify-around items-center max-w-md mx-auto relative">
          <button 
            onClick={() => setMainTab('trilhas')}
            className={`flex flex-col items-center justify-center w-full py-3 transition-colors relative ${mainTab === 'trilhas' ? 'text-[#F17B37]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {mainTab === 'trilhas' && <motion.div layoutId="nav-pill" className="absolute top-0 w-12 h-1 bg-[#F17B37] rounded-b-full" />}
            <CalendarDays className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-bold tracking-wide">Trilhas</span>
          </button>
          
          {/* BOTÃO ASSISTENTE IA CENTRALIZADO COM ANIMAÇÕES MODERNAS */}
          <div className="relative -top-6 flex justify-center w-[80px] shrink-0">
            
            {/* Anel de Pulso (Efeito Sonar contínuo) */}
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 w-[64px] h-[64px] bg-[#F17B37] rounded-full z-30 pointer-events-none"
            />

            {/* Botão Principal Flutuante e Interativo */}
            <motion.button
              onClick={() => setIsAssistantOpen(true)}
              animate={{ y: [0, -6, 0] }} // Flutuação suave
              transition={{ y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9, rotate: -5 }} // Efeito esmagar ao tocar
              className="absolute bg-white rounded-full shadow-[0_0_20px_rgba(241,123,55,0.6)] z-40 border-[3px] border-[#F17B37] overflow-hidden flex items-center justify-center p-0.5"
              style={{ width: '64px', height: '64px' }}
            >
              <img src="/logo.png" alt="IA" className="h-full w-full object-cover scale-110 rounded-full" />
            </motion.button>
          </div>

          <button 
            onClick={() => setMainTab('clientes')}
            className={`flex flex-col items-center justify-center w-full py-3 transition-colors relative ${mainTab === 'clientes' ? 'text-[#F17B37]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {mainTab === 'clientes' && <motion.div layoutId="nav-pill" className="absolute top-0 w-12 h-1 bg-[#F17B37] rounded-b-full" />}
            <User className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-bold tracking-wide">Clientes</span>
          </button>
        </div>
      </nav>

      {/* --- MODAL: FORMULÁRIO DE TRILHA (TELA CHEIA) --- */}
      <AnimatePresence>
        {isFormModalOpen && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col h-[100dvh] overflow-hidden print:hidden"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CalendarDays className={`h-5 w-5 ${editingAgenda ? 'text-blue-500' : 'text-[#F17B37]'}`} /> 
                {editingAgenda ? 'Editar Trilha' : 'Nova Trilha'}
              </h2>
              <button type="button" onClick={cancelEdit} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex border-b border-gray-100 bg-white shrink-0">
              <button type="button" onClick={() => setActiveTab('geral')} className={`flex-1 min-w-0 py-3.5 text-xs font-bold border-b-2 transition-all ${activeTab === 'geral' ? 'border-[#F17B37] text-[#F17B37]' : 'border-transparent text-gray-500'}`}>Dados</button>
              <button type="button" onClick={() => setActiveTab('textos')} className={`flex-1 min-w-0 py-3.5 text-xs font-bold border-b-2 transition-all ${activeTab === 'textos' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>IA / Textos</button>
              <button type="button" onClick={() => setActiveTab('midias')} className={`flex-1 min-w-0 py-3.5 text-xs font-bold border-b-2 transition-all ${activeTab === 'midias' ? 'border-orange-400 text-orange-500' : 'border-transparent text-gray-500'}`}>Mídias</button>
            </div>
            
            <form id="admin-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24">
              
              {activeTab === 'geral' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div><label className="block text-sm font-bold mb-1">Título</label><input {...register("title", { required: true })} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#F17B37]" placeholder="Ex: Serra do Cipó" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1">Data</label><input type="date" {...register("date", { required: true })} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#F17B37]" /></div>
                    <div><label className="block text-sm font-bold mb-1">Valor</label><input {...register("price", { required: true })} inputMode="decimal" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#F17B37]" placeholder="150.00" /></div>
                  </div>
                </div>
              )}

              {activeTab === 'textos' && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="p-4 rounded-2xl border bg-blue-50/50 border-blue-100">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-bold text-gray-800">📍 Pontos de Encontro</label>
                      <button type="button" onClick={() => recordingType === 'meeting_point' ? stopRecording() : startRecording('meeting_point')} className={`text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1 ${recordingType === 'meeting_point' ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-blue-600 shadow-sm border border-blue-200'}`}>
                        {recordingType === 'meeting_point' ? <Square className="h-3 w-3 fill-white" /> : <Mic className="h-4 w-4" />} Gravar
                      </button>
                    </div>
                    <textarea {...register("meeting_point", { required: true })} className="w-full h-32 p-4 bg-white border border-gray-200 rounded-xl outline-none resize-none text-sm" placeholder="Grave ou digite..." />
                    <button 
                        type="button" 
                        onClick={() => formatTextWithAI('meeting_point')}
                        disabled={isFormattingMeetingPoint || !watch('meeting_point')}
                        className="mt-2 w-full text-sm bg-blue-600 text-white py-2 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {isFormattingMeetingPoint ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {aiSuccessMeeting ? "Texto Formatado!" : "Formatar com IA"}
                      </button>
                  </div>

                  <div className="p-4 rounded-2xl border bg-purple-50/50 border-purple-100">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-bold text-gray-800">📝 Roteiro</label>
                      <button type="button" onClick={() => recordingType === 'description' ? stopRecording() : startRecording('description')} className={`text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1 ${recordingType === 'description' ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-purple-600 shadow-sm border border-purple-200'}`}>
                        {recordingType === 'description' ? <Square className="h-3 w-3 fill-white" /> : <Mic className="h-4 w-4" />} Gravar
                      </button>
                    </div>
                    <textarea {...register("description", { required: true })} className="w-full h-40 p-4 bg-white border border-gray-200 rounded-xl outline-none resize-none text-sm" placeholder="Grave ou digite..." />
                    <button 
                        type="button" 
                        onClick={() => formatTextWithAI('description')}
                        disabled={isFormattingDescription || !watch('description')}
                        className="mt-2 w-full text-sm bg-purple-600 text-white py-2 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-purple-700 transition disabled:opacity-50"
                      >
                        {isFormattingDescription ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {aiSuccessDesc ? "Texto Formidável!" : "Gerar Texto Lindo com IA"}
                      </button>
                  </div>
                </div>
              )}

              {activeTab === 'midias' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl p-6 text-center relative group">
                    <Video className="mx-auto h-8 w-8 text-blue-400 mb-2" />
                    <p className="font-bold">Upload de Vídeo Promocional</p>
                    <p className="text-xs font-bold text-blue-600 mt-2 bg-white inline-block px-3 py-1 rounded-full">
                      {selectedVideo && selectedVideo.length > 0 ? 'Vídeo pronto' : 'Selecionar (Opcional)'}
                    </p>
                    <input type="file" accept="video/*" {...register("video")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                  <div className="border-2 border-dashed border-[#F17B37] bg-[#F17B37]/5 rounded-2xl p-6 text-center relative group">
                    <FileUp className="mx-auto h-8 w-8 text-[#F17B37] mb-2" />
                    <p className="font-bold">Flyer Principal</p>
                    <input type="file" accept="image/*" {...register("flyer")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                  <div className="border-2 border-dashed border-orange-200 bg-orange-50/50 rounded-2xl p-6 text-center relative">
                    <ImageIcon className="mx-auto h-8 w-8 text-orange-400 mb-2" />
                    <p className="font-bold">Fotos Galeria (Múltiplas)</p>
                    <input type="file" multiple accept="image/*" {...register("images")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>
              )}
            </form>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-safe">
              <button type="submit" form="admin-form" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-[#1D2A3A] text-white p-4 rounded-2xl font-bold shadow-lg disabled:opacity-70">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (editingAgenda ? 'Salvar Edição' : 'Cadastrar Trilha')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    
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