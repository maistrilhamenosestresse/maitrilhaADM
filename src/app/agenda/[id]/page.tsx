"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, DollarSign, CheckCircle2, ChevronLeft, ChevronRight, Video as VideoIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AgendaDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [agenda, setAgenda] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const eventDate = new Date(agenda.date).toLocaleDateString('pt-BR');
  
  // Link dinâmico formatado com Título e Data
  const whatsappMessage = `Oi, Nívea, eu quero uma vaga para a trilha ${agenda.title} do dia ${eventDate}`;
  const whatsappUrl = `https://wa.me/5531998793939?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-[#0F1722] text-white font-sans selection:bg-[#F17B37] selection:text-white pb-32">
      
      {/* Botão Voltar */}
      <div className="absolute top-6 left-6 z-30">
        <button onClick={() => router.push('/agenda')} className="bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 hover:bg-white/10 transition">
          <ChevronLeft className="h-5 w-5" />
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
          className="space-y-8"
        >
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
              <p className="text-xs text-gray-500 uppercase font-semibold">Data</p>
              <p className="font-medium text-lg">{eventDate}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <DollarSign className="text-[#25D366] mb-2 h-6 w-6" />
              <p className="text-xs text-gray-500 uppercase font-semibold">Valor</p>
              <p className="font-medium text-lg">R$ {agenda.price}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="text-[#F17B37] shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Ponto de Encontro</h3>
                <p className="text-gray-400 text-sm leading-relaxed mt-1">{agenda.meeting_point}</p>
              </div>
            </div>
          </div>

          <div className="prose prose-invert prose-orange max-w-none pt-4">
            <h3 className="text-xl font-semibold mb-4 text-[#F17B37]">Descrição e Recomendações</h3>
            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-md bg-white/5 p-6 rounded-2xl border border-white/5">
              {agenda.description}
            </div>
          </div>

          {/* Seção de Vídeo (Se existir) */}
          {agenda.video_url && (
            <div className="pt-6 pb-4">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <VideoIcon className="text-[#F17B37]" />
                Conheça o Local
              </h3>
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video relative">
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
          
        </motion.div>
      </div>

      {/* Footer Fixo */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.8, type: "spring" }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-[#0F1722]/90 backdrop-blur-xl border-t border-white/10 z-50"
      >
        <div className="max-w-2xl mx-auto flex gap-4 items-center">
          <div className="flex-1 hidden md:block">
            <p className="text-xs text-gray-400 font-medium">Investimento</p>
            <p className="text-xl font-bold">R$ {agenda.price}<span className="text-sm font-normal text-gray-500">/pessoa</span></p>
          </div>
          <a 
            href={whatsappUrl}
            target="_blank"
            className="flex-1 md:flex-none md:w-2/3 bg-gradient-to-r from-[#25D366] to-[#1ebd5a] text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-[#25D366]/30 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
          >
            Garantir Vaga no WhatsApp
          </a>
        </div>
      </motion.div>
    </div>
  );
}
