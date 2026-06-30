"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, MapPin } from "lucide-react";

export default function CarrinhoPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getTotalPrice, getTotalQuantity } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0F1722] text-white font-sans pb-32">
      {/* Background Decorativo */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F17B37] rounded-full blur-[150px] opacity-5 pointer-events-none" />
      
      <header className="px-6 pt-12 pb-8 relative z-10">
        <button onClick={() => router.push('/')} className="bg-white/5 p-3 rounded-full border border-white/10 hover:bg-white/10 transition mb-6">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-[#F17B37]" /> Meu Carrinho
        </h1>
        <p className="text-gray-400 mt-2">Você tem {getTotalQuantity()} itens no carrinho.</p>
      </header>

      <div className="max-w-4xl mx-auto px-6">
        {items.length === 0 ? (
          <div className="bg-[#1a2332] border border-white/10 rounded-3xl p-12 text-center shadow-2xl">
            <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Seu carrinho está vazio</h2>
            <p className="text-gray-400 mb-8">Bora escolher sua próxima aventura?</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-white/10 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/20 transition"
            >
              Ver Trilhas Disponíveis
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <motion.div 
                key={item.agendaId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1a2332] border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-lg md:text-xl text-[#F17B37] mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {item.date}
                  </p>
                </div>
                
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-3 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button 
                      onClick={() => updateQuantity(item.agendaId, Math.max(1, item.quantity - 1))}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                    >
                      -
                    </button>
                    <span className="font-bold w-6 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.agendaId, item.quantity + 1)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Subtotal</p>
                    <p className="font-bold text-[#25D366] text-lg">R$ {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  
                  <button 
                    onClick={() => removeItem(item.agendaId)}
                    className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition"
                    title="Remover Item"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}

            <div className="bg-[#1a2332] border border-white/10 rounded-2xl p-6 shadow-xl mt-8">
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-6">
                <span className="text-xl font-bold text-gray-300">Total da Compra</span>
                <span className="text-3xl font-black text-[#25D366]">R$ {getTotalPrice().toFixed(2)}</span>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <button 
                  onClick={() => router.push('/')}
                  className="flex-1 px-6 py-4 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition border border-white/10"
                >
                  Continuar Comprando
                </button>
                <button 
                  onClick={() => router.push('/cadastro')}
                  className="flex-[2] bg-gradient-to-r from-[#F17B37] to-[#f9a03f] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg shadow-[#F17B37]/20 transition"
                >
                  <ShieldCheck className="h-5 w-5" />
                  Finalizar Compra Segura
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
