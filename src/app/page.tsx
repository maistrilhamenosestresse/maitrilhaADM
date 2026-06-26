"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, ArrowRight, TreePine, Map, Users, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.1]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 100]);

  return (
    <div className="bg-[#0F1722] text-white min-h-screen overflow-x-hidden font-sans selection:bg-[#F17B37] selection:text-white">
      
      {/* NAVEGAÇÃO */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-gradient-to-b from-[#0F1722]/80 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <TreePine className="h-8 w-8 text-[#F17B37]" />
          <span className="font-black text-xl tracking-tighter uppercase">Mais Trilha</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/agenda')}
            className="bg-[#F17B37] hover:bg-[#e06925] text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(241,123,55,0.3)]"
          >
            Ver Trilhas
          </button>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative h-[100dvh] w-full flex flex-col items-center justify-center overflow-hidden"
      >
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-60 mix-blend-overlay"
        >
          <source src="/FotosEvideos/IMG_6161.MP4" type="video/mp4" />
        </video>
        
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F1722]/40 via-transparent to-[#0F1722] z-10" />

        <div className="relative z-20 text-center max-w-4xl px-6 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6">
              Descubra uma <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F17B37] to-[#f9a03f]">coragem</span> que você nem sabia que existia.
            </h1>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-lg md:text-2xl text-gray-300 font-medium max-w-2xl mb-12 leading-relaxed"
          >
            Uma conexão indescritível com a natureza. Superação, encontros reais e paisagens que mudam a forma como você vê o mundo.
          </motion.p>

          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            onClick={() => router.push('/agenda')}
            className="group relative inline-flex items-center justify-center gap-3 bg-white text-[#0F1722] px-8 py-4 rounded-full font-black text-lg overflow-hidden hover:scale-105 transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-2">Começar Aventura <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></span>
          </motion.button>
        </div>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 z-20 text-gray-400"
        >
          <ChevronDown className="h-8 w-8 opacity-50" />
        </motion.div>
      </motion.section>

      {/* 2. A HISTÓRIA (NÍVEA E AS FUNDADORAS) */}
      <section className="py-24 md:py-40 px-6 relative z-20 bg-[#0F1722]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="mb-20 text-center"
          >
            <h2 className="text-[#F17B37] font-bold tracking-widest uppercase text-sm mb-4">A Nossa História</h2>
            <h3 className="text-4xl md:text-5xl font-black">Como tudo começou</h3>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="prose prose-invert prose-lg"
            >
              <p className="text-xl leading-relaxed text-gray-300 font-light">
                Me chamo <strong className="text-white">Nívea Magalhães</strong>... tenho 35 anos... e há 3 anos venho me aventurando e me desafiando no mundo do ecoturismo.
              </p>
              <p className="text-xl leading-relaxed text-gray-300 font-light mt-6">
                Sempre tive uma conexão muito forte com a natureza. Gosto do simples, do essencial. E é em meio a ela que eu me sinto verdadeiramente acolhida. Na minha família, o hábito de acampar e caminhar ao ar livre sempre esteve presente, mas foi o meu tio quem despertou em mim algo maior.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl group"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <img src="/FotosEvideos/Nivea/IMG_3414.webp" alt="Nívea Magalhães" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute bottom-6 left-6 z-20">
                <p className="font-bold text-lg">Nívea Magalhães</p>
                <p className="text-[#F17B37] text-sm font-bold uppercase tracking-widest">Fundadora</p>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto mb-32"
          >
            <p className="text-2xl md:text-3xl font-medium leading-relaxed italic text-gray-200">
              "Mesmo com esse sonho dentro de mim... por muito tempo eu acreditei que aquilo não era pra mim. Que não era para uma mulher... casada... mãe... aos 32 anos."
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-16 items-center flex-col-reverse md:flex-row-reverse">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="prose prose-invert prose-lg"
            >
              <p className="text-xl leading-relaxed text-gray-300 font-light">
                Até que decidi convidar meu tio para refazer uma trilha muito especial: a Cachoeira do Tabuleiro. Ele não pôde ir, então decidi ir sozinha. Ou pelo menos, essa era a ideia.
              </p>
              <p className="text-xl leading-relaxed text-gray-300 font-light mt-6">
                Contei para uma amiga, que chamou outra, e quando percebi minha mãe também estava dentro. Lá estávamos nós: <strong className="text-white">cinco mulheres</strong> de madrugada, dentro de um carro, prontas para viver algo que mudaria tudo.
              </p>
              <p className="text-xl leading-relaxed text-[#F17B37] font-medium mt-6">
                Enfrentamos frio, perrengues com o carro, mas nada impediu de ser uma das maiores experiências das nossas vidas. Foi ali que descobri uma coragem que nem sabia que existia em mim.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative aspect-[4/3] md:aspect-square rounded-3xl overflow-hidden shadow-2xl group"
            >
              <img src="/FotosEvideos/AS FUNDADORAS/IMG_6144.webp" alt="As Fundadoras" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. SEÇÃO "OLHARES" (CINEMATOGRÁFICO) */}
      <section className="py-32 relative bg-black overflow-hidden flex flex-col items-center justify-center min-h-[80vh]">
        <div className="absolute inset-0 opacity-40">
          <img src="/FotosEvideos/OLHARES/IMG_6341.webp" alt="Background Olhares" className="w-full h-full object-cover blur-sm" />
          <div className="absolute inset-0 bg-black/80" />
        </div>

        <div className="relative z-10 text-center max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5 }}
          >
            <Heart className="h-12 w-12 text-[#F17B37] mx-auto mb-8 opacity-80" />
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
              O brilho nos olhos. <br/>O encantamento.
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed mb-12">
              "Hoje, eu continuo me aventurando, mas também de forma profissional. O que me move é levar pessoas a lugares que elas nunca imaginaram que seriam capazes de chegar. Ter o privilégio de viver isso todos os dias é simplesmente indescritível."
            </p>
          </motion.div>
        </div>
      </section>

      {/* 4. GALERIA MASONRY */}
      <section className="py-24 px-6 bg-[#0F1722]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Nossa Comunidade</h2>
            <p className="text-gray-400">Momentos inesquecíveis vividos em grupo.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div className="col-span-2 row-span-2 relative aspect-square rounded-2xl overflow-hidden" whileHover={{ scale: 0.98 }}>
              <img src="/FotosEvideos/Grupo/IMG_6334.webp" className="w-full h-full object-cover" alt="Grupo" />
            </motion.div>
            <motion.div className="relative aspect-square rounded-2xl overflow-hidden" whileHover={{ scale: 0.98 }}>
              <img src="/FotosEvideos/paisagem/IMG_1772.webp" className="w-full h-full object-cover" alt="Paisagem" />
            </motion.div>
            <motion.div className="relative aspect-square rounded-2xl overflow-hidden" whileHover={{ scale: 0.98 }}>
              <img src="/FotosEvideos/PESSOAS ESPECIAIS/IMG_5732.webp" className="w-full h-full object-cover" alt="Pessoas" />
            </motion.div>
            <motion.div className="col-span-2 relative aspect-[2/1] rounded-2xl overflow-hidden" whileHover={{ scale: 0.98 }}>
              <img src="/FotosEvideos/Grupo/IMG_6352.webp" className="w-full h-full object-cover" alt="Grupo" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION & FOOTER */}
      <section className="py-32 relative bg-gradient-to-t from-black to-[#0F1722] text-center px-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-6">Pronto para a sua próxima aventura?</h2>
          <p className="text-xl text-gray-400 mb-12">Junte-se a nós e descubra do que você é capaz.</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => router.push('/agenda')} className="w-full sm:w-auto bg-[#F17B37] hover:bg-[#e06925] text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_30px_rgba(241,123,55,0.4)] flex items-center justify-center gap-2">
              <Map className="h-5 w-5" /> Ver Próximas Trilhas
            </button>
            <a href="https://wa.me/5531998793939?text=Oi Nívea! Quero entrar no grupo VIP do Mais Trilha!" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2">
              <Users className="h-5 w-5" /> Entrar no Grupo VIP
            </a>
          </div>

          <div className="mt-20 pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-gray-400">
            <div className="flex items-center gap-2">
              <TreePine className="h-6 w-6 text-[#F17B37]" />
              <span className="font-bold">Mais Trilha Menos Estresse</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="https://www.instagram.com/maistrilhamenosestresse/" target="_blank" className="hover:text-white transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg> Instagram
              </a>
              <a href="https://wa.me/5531998793939" target="_blank" className="hover:text-white transition-colors flex items-center gap-2">
                Fale com a Nívea
              </a>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
