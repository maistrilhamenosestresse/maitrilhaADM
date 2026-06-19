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
        .gte('date', today)
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

      <header className="pt-16 pb-12 px-6 max-w-7xl mx-auto relative z-10 text-center">
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
          Calendário <br className="md:hidden" />de <span className="text-[#F17B37]">Aventuras</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 text-lg max-w-2xl mx-auto"
        >
          Escolha o seu próximo destino, convide a galera e recarregue as energias.
        </motion.p>
      </header>

      <div className="px-6 max-w-7xl mx-auto relative z-10">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-white/5 border border-white/10 rounded-3xl w-full animate-pulse"></div>
            ))}
          </div>
        ) : agendas.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md max-w-2xl mx-auto"
          >
            <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">O calendário está sendo preparado.</p>
            <p className="text-sm text-gray-500 mt-2">Nenhuma trilha futura cadastrada no momento.</p>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agendas.map((agenda, index) => {
              // Corrigir fuso horário para não diminuir 1 dia (-03:00)
              const eventDate = new Date(agenda.date + 'T12:00:00Z');
              const day = eventDate.toLocaleDateString('pt-BR', { day: '2-digit' });
              const month = eventDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
              
              return (
                <Link key={agenda.id} href={`/agenda/${agenda.id}`} className="block group">
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#F17B37]/10 relative h-full flex flex-col"
                  >
                    
                    {/* Imagem de Capa do Card */}
                    <div className="h-48 relative overflow-hidden shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a2332] to-transparent z-10" />
                      {agenda.images && agenda.images.length > 0 ? (
                        <img src={agenda.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="Capa" />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center"><ImageIcon className="text-gray-600 h-10 w-10" /></div>
                      )}
                      
                      {/* Badge da Data */}
                      <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2 px-4 text-center shadow-xl">
                        <p className="text-[#F17B37] font-bold tracking-widest text-[10px] uppercase mb-0.5">{month}</p>
                        <p className="text-2xl font-black leading-none">{day}</p>
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="p-6 flex-1 flex flex-col relative z-20 bg-[#1a2332]">
                      <h3 className="text-xl font-bold mb-4 group-hover:text-[#F17B37] transition line-clamp-2">{agenda.title}</h3>
                      
                      <div className="space-y-3 mb-6 mt-auto">
                        <div className="flex items-start gap-3 text-sm text-gray-400">
                          <MapPin className="h-4 w-4 text-[#F17B37] shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{agenda.meeting_point}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <DollarSign className="h-4 w-4 text-[#25D366]" />
                          <span className="font-semibold text-white">R$ {agenda.price}</span>
                        </div>
                      </div>

                      <div className="inline-flex w-full justify-center items-center text-[#F17B37] text-sm font-bold uppercase tracking-wide bg-[#F17B37]/10 px-4 py-3 rounded-xl group-hover:bg-[#F17B37] group-hover:text-white transition">
                        Acessar Roteiro <ChevronRight className="h-4 w-4 ml-1" />
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
