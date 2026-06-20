"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, DollarSign, CheckCircle2, ChevronLeft, ChevronRight, Video as VideoIcon, Send, FileText, Image as ImageIcon, Info } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AgendaDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [agenda, setAgenda] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'roteiro' | 'embarque' | 'galeria'>('roteiro');

  useEffect(() => {
    async function fetchAgenda() {
      const { data, error } = await supabase
        .from('agendas')
        .select('*')
        .eq('id', params.id as string)
        .single();
        
      if (!error && data) {
        setAgenda(data);
      }
      setIsLoading(false);
    }
    fetchAgenda();
  }, [params.id]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#0F1722] flex items-center justify-center text-[#F17B37]">Carregando trilha...</div>;
  }

  if (!agenda) {
    return <div className="min-h-screen bg-[#0F1722] flex items-center justify-center text-white">Trilha não encontrada.</div>;
  }

  const nextImage = () => {
    if (agenda.images && agenda.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % agenda.images.length);
    }
  };

  const prevImage = () => {
    if (agenda.images && agenda.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + agenda.images.length) % agenda.images.length);
    }
  };

  const coverImage = agenda.images && agenda.images.length > 0 
    ? agenda.images[currentImageIndex] 
    : "https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=2000&auto=format&fit=crop";

  const eventDateObj = new Date(agenda.date + 'T12:00:00Z');
  const eventDate = eventDateObj.toLocaleDateString('pt-BR');
  
  const whatsappMessage = `Oi, Nívea, eu quero uma vaga para a trilha ${agenda.title} do dia ${eventDate}`;
  const whatsappUrl = `https://wa.me/5531998793939?text=${encodeURIComponent(whatsappMessage)}`;

  const handleShare = async () => {
    const whatsappText = `🌿 *Trilha: ${agenda.title}*\n📅 Data: ${eventDate}\n💰 Valor: R$ ${agenda.price}\n\n👇 *Confira o Flyer oficial:*\n${agenda.flyer_url || agenda.images?.[0] || window.location.href}\n\n✨ *Garanta sua vaga e veja o roteiro completo aqui:*\n${window.location.href}`;

    const shareData = {
      title: `Trilha: ${agenda.title} | Mais Trilha Menos Estresse`,
      text: whatsappText,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(whatsappText);
        alert("Texto e link copiados! Agora é só colar no WhatsApp.");
      }
    } catch (err) {
      console.log('Compartilhamento cancelado ou falhou', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1722] text-white font-sans selection:bg-[#F17B37] selection:text-white pb-32">
      
      {/* Header Botões Superiores */}
      <div className="absolute top-6 left-6 right-6 z-30 flex justify-between">
        <button onClick={() => router.push('/agenda')} className="bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 hover:bg-white/10 transition">
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <button onClick={handleShare} className="bg-[#F17B37]/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-[#F17B37] transition flex items-center gap-2 font-bold text-sm shadow-lg">
          <Send className="h-4 w-4" /> Compartilhar
        </button>
      </div>

      {/* Carrossel / Imagem de Capa */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative h-[45vh] w-full group"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1722] via-[#0F1722]/60 to-transparent z-10" />
        
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            src={coverImage}
            alt={agenda.title} 
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {agenda.images && agenda.images.length > 1 && (
          <div className="absolute inset-0 z-20 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition">
            <button onClick={prevImage} className="bg-black/50 p-2 rounded-full backdrop-blur"><ChevronLeft /></button>
            <button onClick={nextImage} className="bg-black/50 p-2 rounded-full backdrop-blur"><ChevronRight /></button>
          </div>
        )}
      </motion.div>

      {/* Conteúdo Principal */}
      <div className="relative z-20 max-w-2xl mx-auto px-6 -mt-16">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Header da Trilha */}
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">{agenda.title}</h1>
            <div className="inline-flex items-center gap-2 bg-[#25D366]/20 text-[#25D366] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-[#25D366]/30 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
              Vagas Abertas
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <Calendar className="text-[#F17B37] mb-2 h-6 w-6" />
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Data</p>
              <p className="font-medium text-lg">{eventDate}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <DollarSign className="text-[#25D366] mb-2 h-6 w-6" />
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Valor</p>
              <p className="font-medium text-lg">R$ {agenda.price}</p>
            </div>
          </div>

          {/* Navegação de Abas */}
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-md sticky top-4 z-40 shadow-2xl">
            <button 
              onClick={() => setActiveTab('roteiro')}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'roteiro' ? 'bg-[#F17B37] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <FileText className="h-4 w-4" /> Roteiro
            </button>
            <button 
              onClick={() => setActiveTab('embarque')}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'embarque' ? 'bg-[#F17B37] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <MapPin className="h-4 w-4" /> Embarque
            </button>
            <button 
              onClick={() => setActiveTab('galeria')}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'galeria' ? 'bg-[#F17B37] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <ImageIcon className="h-4 w-4" /> Galeria
            </button>
          </div>

          {/* Área de Conteúdo das Abas */}
          <div className="min-h-[300px]">
            <AnimatePresence mode="wait">
              
              {/* ABA: ROTEIRO */}
              {activeTab === 'roteiro' && (
                <motion.div 
                  key="roteiro"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="bg-[#151D2A] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl max-h-[60vh] overflow-y-auto dark-scrollbar">
                    <h3 className="text-xl font-bold mb-6 text-[#F17B37] flex items-center gap-2">
                      <Info className="h-5 w-5" /> Detalhes da Aventura
                    </h3>
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-base md:text-lg">
                      {agenda.description}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ABA: EMBARQUE */}
              {activeTab === 'embarque' && (
                <motion.div 
                  key="embarque"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="bg-[#151D2A] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl max-h-[60vh] overflow-y-auto dark-scrollbar">
                    <h3 className="text-xl font-bold mb-6 text-[#F17B37] flex items-center gap-2">
                      <MapPin className="h-5 w-5" /> Locais de Embarque
                    </h3>
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-base md:text-lg">
                      {agenda.meeting_point}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ABA: GALERIA */}
              {activeTab === 'galeria' && (
                <motion.div 
                  key="galeria"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 max-h-[60vh] overflow-y-auto dark-scrollbar pr-2"
                >
                  {agenda.video_url && (
                    <div className="bg-[#151D2A] border border-white/5 rounded-3xl p-4 shadow-xl">
                      <h3 className="text-lg font-bold mb-4 text-[#F17B37] flex items-center gap-2 px-2">
                        <VideoIcon className="h-5 w-5" /> Vídeo Promocional
                      </h3>
                      <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video relative bg-black">
                        <video 
                          src={agenda.video_url} 
                          controls 
                          className="w-full h-full object-contain"
                          controlsList="nodownload"
                          preload="metadata"
                        >
                          Seu navegador não suporta a exibição deste vídeo.
                        </video>
                      </div>
                    </div>
                  )}

                  {agenda.images && agenda.images.length > 0 && (
                    <div className="bg-[#151D2A] border border-white/5 rounded-3xl p-6 shadow-xl">
                      <h3 className="text-lg font-bold mb-4 text-[#F17B37] flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" /> Fotos do Local
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {agenda.images.map((img: string, idx: number) => (
                          <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-white/10 group">
                            <img src={img} alt={`Foto ${idx+1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!agenda.images || agenda.images.length === 0) && !agenda.video_url && (
                    <div className="text-center py-12 text-gray-500">
                      Nenhuma mídia disponível para esta trilha no momento.
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
          
        </motion.div>
      </div>

      {/* Footer Fixo */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#0F1722] via-[#0F1722] to-transparent z-40"
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white p-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-[#20b858] hover:scale-[1.02] transition-all"
          >
            <CheckCircle2 className="h-6 w-6" />
            Garantir Vaga (WhatsApp)
          </a>
        </div>
      </motion.div>

    </div>
  );
}
