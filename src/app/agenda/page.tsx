"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, DollarSign, ChevronRight, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AgendaList() {
  const [agendas, setAgendas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAgendas() {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('agendas')
        .select('*')
        .gte('date', today) // Filtra apenas hoje em diante
        .order('date', { ascending: true });
        
      if (!error && data) {
        setAgendas(data);
      }
      setIsLoading(false);
    }
    fetchAgendas();
  }, []);

  return (
    <div className="min-h-screen bg-[#0F1722] text-white font-sans selection:bg-[#F17B37] selection:text-white pb-20 overflow-hidden relative">
      
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F17B37] rounded-full blur-[150px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#25D366] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <header className="pt-16 pb-8 px-6 max-w-2xl mx-auto relative z-10 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-block bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6 backdrop-blur-md"
        >
          <span className="text-[#F17B37] text-sm font-bold tracking-widest uppercase">Mais Trilha Menos Estresse</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 leading-tight"
        >
          Calendário <br/>de <span className="text-[#F17B37]">Aventuras</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 text-lg"
        >
          Escolha o seu próximo destino, convide a galera e recarregue as energias.
        </motion.p>
      </header>

      <div className="px-6 space-y-6 max-w-2xl mx-auto relative z-10">
        {isLoading ? (
          <div className="animate-pulse space-y-6 mt-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-white/5 border border-white/10 rounded-3xl w-full"></div>
            ))}
          </div>
        ) : agendas.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md mt-10"
          >
            <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">O calendário está sendo preparado.</p>
            <p className="text-sm text-gray-500 mt-2">Nenhuma trilha futura cadastrada no momento.</p>
          </motion.div>
        ) : (
          <div className="relative border-l-2 border-white/10 pl-6 ml-4 md:ml-0 md:pl-0 md:border-l-0 space-y-12 md:space-y-8 mt-10">
            {agendas.map((agenda, index) => {
              const eventDate = new Date(agenda.date);
              const day = eventDate.toLocaleDateString('pt-BR', { day: '2-digit' });
              const month = eventDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
              
              return (
                <Link key={agenda.id} href={`/agenda/${agenda.id}`} className="block relative group">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    
                    {/* Indicador de Linha do Tempo (Mobile) */}
                    <div className="absolute -left-[35px] top-8 w-4 h-4 rounded-full border-4 border-[#0F1722] bg-[#F17B37] md:hidden z-20 shadow-[0_0_10px_rgba(241,123,55,0.5)]" />

                    <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden hover:bg-white/10 transition-all duration-300 md:flex items-center group-hover:border-white/20 group-hover:shadow-2xl group-hover:shadow-orange-500/10 relative">
                      
                      {/* Marca d'água do dia gigante no fundo (Desktop) */}
                      <div className="absolute right-[-20px] bottom-[-40px] text-[180px] font-black text-white/[0.02] pointer-events-none select-none z-0 hidden md:block">
                        {day}
                      </div>

                      {/* Bloco de Data */}
                      <div className="bg-[#1a2332] md:bg-transparent md:border-r border-white/5 p-6 md:p-8 flex items-center gap-6 md:flex-col md:justify-center md:w-48 shrink-0 relative z-10">
                        <div className="text-center">
                          <p className="text-[#F17B37] font-bold tracking-widest text-sm mb-1">{month}</p>
                          <p className="text-5xl md:text-6xl font-black text-white">{day}</p>
                        </div>
                        
                        {/* Imagem Circular na versão Desktop (opcional) */}
                        {agenda.images && agenda.images.length > 0 && (
                          <div className="h-16 w-16 md:h-20 md:w-20 rounded-full border-2 border-white/10 overflow-hidden shrink-0 shadow-lg hidden md:block group-hover:border-[#F17B37]/50 transition">
                            <img src={agenda.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="Capa" />
                          </div>
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="p-6 md:p-8 flex-1 relative z-10">
                        <h3 className="text-2xl font-bold mb-3 group-hover:text-[#F17B37] transition">{agenda.title}</h3>
                        
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <MapPin className="h-4 w-4 text-[#F17B37]" />
                            <span className="truncate">{agenda.meeting_point}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <DollarSign className="h-4 w-4 text-[#25D366]" />
                            <span className="font-semibold text-white">R$ {agenda.price}</span>
                          </div>
                          {agenda.images && agenda.images.length > 0 && (
                            <div className="flex items-center gap-3 text-sm text-gray-400 md:hidden">
                              <ImageIcon className="h-4 w-4 text-blue-400" />
                              <span>{agenda.images.length} fotos disponíveis</span>
                            </div>
                          )}
                        </div>

                        <div className="inline-flex items-center text-[#F17B37] text-sm font-bold uppercase tracking-wide bg-[#F17B37]/10 px-4 py-2 rounded-full group-hover:bg-[#F17B37] group-hover:text-white transition">
                          Acessar Roteiro <ChevronRight className="h-4 w-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
