"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, DollarSign, ChevronRight } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AgendaList() {
  const [agendas, setAgendas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAgendas() {
      const { data, error } = await supabase
        .from('agendas')
        .select('*')
        .order('date', { ascending: true });
        
      if (!error && data) {
        setAgendas(data);
      }
      setIsLoading(false);
    }
    fetchAgendas();
  }, []);

  return (
    <div className="min-h-screen bg-[#0F1722] text-white font-sans selection:bg-[#F17B37] selection:text-white pb-20">
      
      <header className="pt-16 pb-8 px-6">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold tracking-tight mb-2"
        >
          Próximas <span className="text-[#F17B37]">Trilhas</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400"
        >
          Escolha o seu próximo destino e garanta a sua vaga.
        </motion.p>
      </header>

      <div className="px-6 space-y-4 max-w-md mx-auto">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-white/5 rounded-2xl w-full"></div>
            ))}
          </div>
        ) : agendas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Nenhuma trilha agendada no momento. Volte em breve!</p>
          </div>
        ) : (
          agendas.map((agenda, index) => (
            <Link key={agenda.id} href={`/agenda/${agenda.id}`}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition group"
              >
                {agenda.images && agenda.images.length > 0 && (
                  <div className="h-32 w-full overflow-hidden">
                    <img 
                      src={agenda.images[0]} 
                      alt={agenda.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                )}
                
                <div className="p-5">
                  <h3 className="text-xl font-bold mb-3">{agenda.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-[#F17B37]" />
                      {new Date(agenda.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-[#25D366]" />
                      {agenda.price}
                    </div>
                  </div>
                  <div className="flex items-center text-[#F17B37] text-sm font-semibold uppercase tracking-wide">
                    Ver Roteiro <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))
        )}
      </div>

    </div>
  );
}
