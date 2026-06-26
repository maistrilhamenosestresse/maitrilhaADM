"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Quote, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OlharesPage() {
  const router = useRouter();

  const olhares = [
    {
      src: "/FotosEvideos/OLHARES/65C93F8F-E396-47C3-AC11-432631232140.jpg",
      text: "A força que nos faz dar o próximo passo, mesmo quando o cansaço bate."
    },
    {
      src: "/FotosEvideos/OLHARES/IMG_8889.JPG",
      text: "A alegria de chegar ao topo e saber que não estamos sozinhos."
    },
    {
      src: "/FotosEvideos/OLHARES/IMG_8892.JPG",
      text: "A paz que só se encontra depois de vencer uma montanha."
    },
    {
      src: "/FotosEvideos/OLHARES/IMG_8893.JPG",
      text: "Os encontros reais que a natureza nos proporciona."
    }
  ];

  return (
    <div className="bg-[#05080c] text-white min-h-screen overflow-x-hidden font-sans selection:bg-[#F17B37] selection:text-white">
      
      {/* NAVEGAÇÃO MINIMALISTA */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-6">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium tracking-widest uppercase">Voltar à Essência</span>
        </button>
      </nav>

      {/* HERO DRAMÁTICO */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#F17B37]/10 via-[#05080c]/90 to-[#05080c] z-0" />
        
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="relative z-10 max-w-4xl"
        >
          <Quote className="h-16 w-16 text-[#F17B37] mx-auto mb-8 opacity-50 drop-shadow-[0_0_15px_rgba(241,123,55,0.4)]" />
          <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[0.9] drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
            A vocês,<br/> que trilham.
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed max-w-3xl mx-auto italic drop-shadow-lg">
            Nenhuma paisagem seria a mesma sem o olhar de quem a contempla. Esta é uma homenagem profunda àqueles que, final de semana após final de semana, entregam seu suor, suas risadas e seus olhares para construir o que chamamos de Mais Trilha.
          </p>
        </motion.div>
      </section>

      {/* GALERIA CINEMATOGRÁFICA DE OLHARES */}
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-40">
        {olhares.map((item, index) => (
          <motion.div 
            key={item.src}
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 md:gap-24 items-center`}
          >
            <div className="flex-1 w-full relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#F17B37]/20 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="relative aspect-[4/5] md:aspect-square overflow-hidden rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5">
                <img 
                  src={item.src} 
                  alt="Um olhar nas trilhas" 
                  className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 ease-out"
                />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="w-12 h-[2px] bg-[#F17B37] mb-8 mx-auto md:mx-0 opacity-50" />
              <p className="text-3xl md:text-5xl font-black text-gray-200 leading-tight drop-shadow-xl">
                {item.text}
              </p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* FOOTER DRAMÁTICO */}
      <section className="py-32 text-center relative overflow-hidden mt-20">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-[#05080c] to-[#05080c]" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 2 }}
          className="relative z-10 max-w-2xl mx-auto px-6"
        >
          <Heart className="h-12 w-12 text-[#F17B37] mx-auto mb-8 opacity-80 animate-pulse" />
          <h2 className="text-4xl font-bold mb-6 text-white">Nosso mais profundo obrigado.</h2>
          <p className="text-gray-400 text-lg mb-12">Cada trilha é escrita pelos seus passos.</p>
          
          <button 
            onClick={() => router.push('/')}
            className="text-sm font-bold tracking-[0.3em] uppercase text-[#F17B37] hover:text-white transition-colors border-b border-[#F17B37]/30 pb-2 hover:border-white"
          >
            Voltar para a página inicial
          </button>
        </motion.div>
      </section>
    </div>
  );
}
