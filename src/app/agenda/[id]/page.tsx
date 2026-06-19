"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, DollarSign, CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function AgendaPage() {
  const params = useParams();
  
  return (
    <div className="min-h-screen bg-[#0F1722] text-white font-sans selection:bg-[#F17B37] selection:text-white">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="relative h-[45vh] w-full">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1722] via-[#0F1722]/60 to-transparent z-10" />
        <img src="https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=2000&auto=format&fit=crop" alt="Trilha" className="w-full h-full object-cover" />
        <div className="absolute top-6 left-6 z-20">
          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-sm font-semibold tracking-wider uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
            Vagas Abertas
          </div>
        </div>
      </motion.div>

      <div className="relative z-20 max-w-lg mx-auto px-6 -mt-16 pb-24">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="space-y-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Serra do Cipó: Cachoeira Grande</h1>
            <p className="text-gray-400 text-lg">Um final de semana inesquecível em contato puro com a natureza.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <Calendar className="text-[#F17B37] mb-2 h-6 w-6" />
              <p className="text-xs text-gray-500 uppercase font-semibold">Data</p>
              <p className="font-medium">15 a 17 de Nov</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <DollarSign className="text-[#25D366] mb-2 h-6 w-6" />
              <p className="text-xs text-gray-500 uppercase font-semibold">Valor</p>
              <p className="font-medium">R$ 150,00</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="text-[#F17B37] shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Ponto de Encontro</h3>
                <p className="text-gray-400 text-sm leading-relaxed mt-1">Praça da Liberdade, Belo Horizonte - Saída pontualmente às 06:00 da manhã.</p>
              </div>
            </div>
          </div>

          <div className="prose prose-invert prose-orange max-w-none pt-4">
            <h3 className="text-xl font-semibold mb-4">O que levar ??</h3>
            <ul className="space-y-3 text-gray-300 list-none pl-0">
              <li className="flex items-center gap-3"><CheckCircle2 className="text-[#F17B37] h-5 w-5" /> Bota de trilha amaciada</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-[#F17B37] h-5 w-5" /> Protetor solar e repelente</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-[#F17B37] h-5 w-5" /> Água (mínimo 2L) e lanches</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-[#F17B37] h-5 w-5" /> Roupa de banho e toalha</li>
            </ul>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 0.6, delay: 0.8, type: "spring" }} className="fixed bottom-0 left-0 right-0 p-4 bg-[#0F1722]/90 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="max-w-lg mx-auto flex gap-4 items-center">
          <div className="flex-1">
            <p className="text-xs text-gray-400 font-medium">Investimento</p>
            <p className="text-xl font-bold">R$ 150<span className="text-sm font-normal text-gray-500">/pessoa</span></p>
          </div>
          <button className="flex-1 bg-gradient-to-r from-[#F17B37] to-orange-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-[#F17B37]/30 hover:scale-[1.02] active:scale-95 transition-all text-center">
            Garantir Vaga
          </button>
        </div>
      </motion.div>
    </div>
  );
}
