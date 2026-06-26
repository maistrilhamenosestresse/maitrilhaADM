"use client";

import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ArrowLeft, Quote, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

function CanvasTrail() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: width / 2, y: height / 2 };
    const lastMouse = { x: width / 2, y: height / 2 };
    let isMoving = false;
    let moveTimeout: any;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;
      mouse.x = clientX;
      mouse.y = clientY;
      isMoving = true;
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => { isMoving = false; }, 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove);

    class Particle {
      x: number; y: number; vx: number; vy: number;
      life: number; maxLife: number; size: number; color: string;
      
      constructor(x: number, y: number, isWave: boolean, wavePhase: number) {
        this.x = x; this.y = y;
        this.maxLife = isWave ? Math.random() * 40 + 20 : Math.random() * 20 + 10;
        this.life = this.maxLife;
        this.size = Math.random() * 3 + 1.5;
        this.color = Math.random() > 0.25 ? '#F17B37' : '#FFFFFF';
        
        if (isWave) {
          // Forma de onda: Cria um rastro senoidal natural ao mover
          const dx = mouse.x - lastMouse.x;
          const dy = mouse.y - lastMouse.y;
          const angle = Math.atan2(dy, dx) + Math.PI / 2; // Perpendicular ao movimento
          const amplitude = Math.random() * 3 + 1; // Largura da onda
          this.vx = Math.cos(angle) * Math.sin(wavePhase) * amplitude + (dx * 0.05);
          this.vy = Math.sin(angle) * Math.sin(wavePhase) * amplitude + (dy * 0.05);
        } else {
          // Dispersão: Explode suavemente em direções aleatórias quando para
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 1;
          this.vx = Math.cos(angle) * speed;
          this.vy = Math.sin(angle) * speed;
        }
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        // Fricção natural do ar
        this.vx *= 0.92;
        this.vy *= 0.92;
      }

      draw(ctx: CanvasRenderingContext2D) {
        const opacity = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    }

    const particles: Particle[] = [];
    let wavePhase = 0;
    let wasMoving = false;
    let animationFrame: number;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const dx = mouse.x - lastMouse.x;
      const dy = mouse.y - lastMouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (isMoving && dist > 1) {
        wavePhase += 0.4;
        // Joga 3 a 4 partículas por frame formando a onda e o rastro
        for(let i = 0; i < 4; i++) {
          particles.push(new Particle(mouse.x, mouse.y, true, wavePhase + (i * 0.5)));
        }
        wasMoving = true;
      } else if (wasMoving) {
        // Mouse parou: Dispersa as partículas!
        for(let i = 0; i < 40; i++) {
          particles.push(new Particle(mouse.x, mouse.y, false, 0));
        }
        wasMoving = false;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Amortece a diferença do lastMouse
      lastMouse.x += (mouse.x - lastMouse.x) * 0.15;
      lastMouse.y += (mouse.y - lastMouse.y) * 0.15;

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-50 pointer-events-none" />;
}

export default function OlharesPage() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Efeito Parallax super suave para os textos e partículas
  const yHero = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const olhares = [
    {
      src: "/FotosEvideos/OLHARES/IMG_8892.JPG",
      text: "A força que nos faz dar o próximo passo, mesmo quando o cansaço bate."
    },
    {
      src: "/FotosEvideos/OLHARES/IMG_8889.JPG",
      text: "A alegria de chegar ao topo e saber que não estamos sozinhos."
    },
    {
      src: "/FotosEvideos/OLHARES/SCRL_0007.jpg",
      text: "A paz que só se encontra depois de vencer uma montanha."
    },
    {
      src: "/FotosEvideos/OLHARES/IMG_8892 - Copia.JPG",
      text: "Os encontros reais que a natureza nos proporciona."
    }
  ];

  return (
    <div className="bg-[#05080c] text-white min-h-screen overflow-x-hidden font-sans selection:bg-[#F17B37] selection:text-white">
      
      {/* O RASTRO DE ONDA E DISPERSÃO EM CANVAS */}
      {isClient && <CanvasTrail />}

      {/* PARTÍCULAS DE POEIRA CINEMATOGRÁFICAS (FAGULHAS E NÉVOA DE FUNDO) */}
      {isClient && (
        <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden">
          {[...Array(60)].map((_, i) => {
            const size = Math.random() * 3 + 2; // Tamanhos entre 2px e 5px
            const isOrange = i % 4 !== 0; // 75% das partículas serão laranjas!
            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  backgroundColor: isOrange ? '#F17B37' : '#ffffff', // Maioria laranja
                  boxShadow: isOrange ? '0 0 12px 2px #F17B37' : '0 0 5px #ffffff', // Brilho maior no laranja
                  filter: 'blur(1px)'
                }}
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  opacity: 0,
                }}
                animate={{
                  y: [null, Math.random() * -300 - 100], // Sobem flutuando muito mais
                  x: [null, Math.random() * 200 - 100],  // Balançam para os lados
                  opacity: [0, Math.random() * 0.9 + 0.3, 0], // Acendem e apagam mais fortes
                }}
                transition={{
                  duration: Math.random() * 15 + 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            );
          })}
        </div>
      )}

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

      {/* HERO DRAMÁTICO COM FUNDO FOTOGRÁFICO */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* A imagem de fundo (os olhares específicos pedidos) com máscara de transparência */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 65%)'
          }}
        >
          <img 
            src="/FotosEvideos/OLHARES/IMG_8893%20-%20Copia%20(2).JPG" 
            alt="Olhares Especiais" 
            className="w-full h-[50vh] md:h-full object-contain md:object-cover opacity-20 grayscale"
          />
        </div>
        
        <motion.div 
          style={{ y: yHero, opacity: opacityHero }}
          initial={{ opacity: 0, filter: "blur(20px)", scale: 1.1 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
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
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-40 relative z-10">
        {olhares.map((item, index) => (
          <motion.div 
            key={item.src}
            initial={{ opacity: 0, y: 150, filter: "blur(15px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 md:gap-24 items-center`}
          >
            <div className="flex-1 w-full relative group">
              {/* Máscara de transparência real, agora com degradê extremamente suave para não ficar chapado */}
              <div 
                className="relative aspect-[4/5] md:aspect-[4/4]"
                style={{
                  WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
                  maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)'
                }}
              >
                <img 
                  src={item.src} 
                  alt="Um olhar nas trilhas" 
                  className="w-full h-full object-cover object-center grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-[2000ms] ease-out"
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
