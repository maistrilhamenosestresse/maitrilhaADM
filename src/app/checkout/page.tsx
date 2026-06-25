"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, KeyRound, CheckCircle2, Loader2, Calendar, ArrowRight, User as UserIcon, ArrowLeft, Save } from "lucide-react";

export default function CheckoutAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agendaId = searchParams.get('agenda_id');
  
  const [step, setStep] = useState<'email' | 'otp' | 'cart' | 'edit'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [agenda, setAgenda] = useState<any>(null);
  const [clientData, setClientData] = useState<any>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState<any>({});

  // 1. Fetch Agenda
  useEffect(() => {
    if (agendaId) {
      supabase.from('agendas').select('*').eq('id', agendaId).single().then(({data}) => {
        if (data) setAgenda(data);
      });
    }
  }, [agendaId]);

  // 2. Check Session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        // Find client
        const { data: existingClient } = await supabase.from('clients')
          .select('*')
          .eq('email', session.user.email.toLowerCase())
          .single();
          
        if (existingClient) {
          setClientData(existingClient);
          setStep('cart');
        }
      }
      setIsInitializing(false);
    };
    checkSession();
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Verifica se o cliente existe na base de dados
    const { data: existingClient } = await supabase.from('clients').select('*').eq('email', email.trim().toLowerCase()).single();
    
    if (!existingClient) {
      // Se não existir, vai pro cadastro completo
      router.push(`/cadastro?agenda_id=${agendaId}&email=${encodeURIComponent(email)}`);
      return;
    }
    
    setClientData(existingClient);
    
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
    });
    
    setIsLoading(false);
    
    if (error) {
      alert("Erro ao enviar código: " + error.message);
    } else {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    let { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: 'email'
    });
    
    if (error) {
      const retry1 = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp, type: 'magiclink' });
      error = retry1.error;
    }

    if (error) {
      const retry2 = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp, type: 'signup' });
      error = retry2.error;
    }
    
    setIsLoading(false);
    
    if (error) {
      alert("Código inválido ou expirado.");
    } else {
      setStep('cart');
    }
  };

  const openEdit = () => {
    setEditForm({ ...clientData });
    setStep('edit');
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.from('clients').update({
        full_name: editForm.full_name,
        cpf: editForm.cpf,
        rg: editForm.rg,
        phone: editForm.phone,
        birth_date: editForm.birth_date,
        emergency_contact_name: editForm.emergency_contact_name,
        emergency_contact_phone: editForm.emergency_contact_phone,
        health_notes: editForm.health_notes
      }).eq('id', clientData.id);

      if (error) throw error;
      setClientData(editForm);
      setStep('cart');
    } catch (err) {
      alert("Erro ao salvar os dados.");
    }
    setIsLoading(false);
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      // 1. Cria a reserva pendente
      const { data: reservaData, error: reservaError } = await supabase.from('reservas').insert([{
        client_id: clientData.id,
        agenda_id: agendaId,
        status_pagamento: 'pendente',
        valor_pago: 0
      }]).select();
      
      if (reservaError) throw reservaError;
      const reservaId = reservaData[0].id;

      // 2. Chama a API da InfinitePay
      const reqCheckout = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reserva_id: reservaId,
          agenda_title: agenda?.title || 'Trilha',
          price: agenda?.price || 0,
          customer: {
            name: clientData.full_name,
            email: clientData.email,
            phone_number: clientData.phone
          }
        })
      });
      const resCheckout = await reqCheckout.json();
      
      if (resCheckout.url) {
        window.location.href = resCheckout.url;
      } else {
        throw new Error("Link não gerado");
      }
    } catch (err: any) {
      console.error(err);
      alert("Ocorreu um erro ao gerar o pagamento. Tente novamente.");
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return <div className="min-h-screen bg-[#0F1722] flex items-center justify-center"><Loader2 className="animate-spin text-[#F17B37] w-8 h-8" /></div>;
  }

  const eventDate = agenda ? new Date(agenda.date + 'T12:00:00Z').toLocaleDateString('pt-BR') : '';

  return (
    <div className="min-h-screen bg-[#0F1722] text-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F17B37] rounded-full blur-[150px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#25D366] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          
          {step === 'email' && (
            <motion.form key="email" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSendOtp} className="bg-[#1a2332] border border-white/10 p-8 rounded-3xl shadow-2xl relative">
              <button type="button" onClick={() => router.push(`/agenda/${agendaId}`)} className="absolute top-6 left-6 text-gray-400 hover:text-white transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-center mb-8 mt-4">
                <div className="w-16 h-16 bg-[#F17B37]/20 text-[#F17B37] rounded-2xl flex items-center justify-center mx-auto mb-4"><UserIcon className="h-8 w-8" /></div>
                <h1 className="text-2xl font-bold mb-2">Já fez trilha com a gente?</h1>
                <p className="text-gray-400 text-sm">Insira seu e-mail para puxar seus dados rapidamente ou ser direcionado ao cadastro.</p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-300 mb-2">Seu E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-500" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600" placeholder="email@exemplo.com" />
                </div>
              </div>
              <button type="submit" disabled={isLoading || !email} className="w-full bg-[#F17B37] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#d9682b] transition disabled:opacity-50">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continuar <ArrowRight className="h-5 w-5" /></>}
              </button>
            </motion.form>
          )}

          {step === 'otp' && (
            <motion.form key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleVerifyOtp} className="bg-[#1a2332] border border-white/10 p-8 rounded-3xl shadow-2xl relative">
              <button type="button" onClick={() => setStep('email')} className="absolute top-6 left-6 text-gray-400 hover:text-white transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-center mb-8 mt-4">
                <div className="w-16 h-16 bg-[#25D366]/20 text-[#25D366] rounded-2xl flex items-center justify-center mx-auto mb-4"><KeyRound className="h-8 w-8" /></div>
                <h1 className="text-2xl font-bold mb-2">Código Enviado!</h1>
                <p className="text-gray-400 text-sm">Enviamos um código para o e-mail <strong>{email}</strong>.</p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-300 mb-2">Código de Verificação</label>
                <input type="text" required maxLength={8} value={otp} onChange={e => setOtp(e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all text-center tracking-[1em] text-xl font-bold" placeholder="00000000" />
              </div>
              <button type="submit" disabled={isLoading || otp.length < 8} className="w-full bg-[#F17B37] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#d9682b] transition disabled:opacity-50">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Verificar Código</>}
              </button>
            </motion.form>
          )}

          {step === 'cart' && agenda && clientData && (
            <motion.div key="cart" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a2332] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative">
              <button type="button" onClick={() => router.push(`/agenda/${agendaId}`)} className="absolute top-6 left-6 text-gray-400 hover:text-white transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-center mb-6 mt-4">
                <h1 className="text-2xl font-bold mb-1">Resumo da Compra</h1>
                <p className="text-gray-400 text-sm">Quase lá, {clientData.full_name.split(' ')[0]}!</p>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-6">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black">
                    <img src={agenda.images?.[0] || 'https://via.placeholder.com/150'} alt="Trilha" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-bold text-lg leading-tight mb-1">{agenda.title}</h3>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-1"><Calendar className="w-3 h-3" /> {eventDate}</div>
                    <div className="flex items-center gap-1 text-[#25D366] font-bold">R$ {agenda.price}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {clientData.photo_url ? (
                    <img src={clientData.photo_url} alt="Cliente" className="w-12 h-12 rounded-full object-cover border border-white/20" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#F17B37]/20 flex items-center justify-center text-[#F17B37]"><UserIcon /></div>
                  )}
                  <div>
                    <p className="font-bold text-sm leading-tight">{clientData.full_name}</p>
                    <p className="text-xs text-gray-400 mt-1">{clientData.cpf}</p>
                  </div>
                </div>
                <button onClick={openEdit} className="text-xs text-[#F17B37] hover:underline font-bold bg-white/5 px-3 py-2 rounded-xl">Editar</button>
              </div>
              
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl mb-6 text-xs text-orange-200">
                Ao prosseguir, você confirma que leu e está ciente dos riscos desta expedição, concordando com as regras do seguro e utilização de imagem.
              </div>

              <button onClick={handleCheckout} disabled={isLoading} className="w-full bg-gradient-to-r from-[#25D366] to-[#20b858] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition shadow-[0_0_20px_rgba(37,211,102,0.3)] disabled:opacity-50">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> Confirmar e Pagar</>}
              </button>
            </motion.div>
          )}

          {step === 'edit' && (
            <motion.form key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={saveEdit} className="bg-[#1a2332] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative w-full max-h-[85vh] overflow-y-auto custom-scrollbar">
              <button type="button" onClick={() => setStep('cart')} className="absolute top-6 left-6 text-gray-400 hover:text-white transition z-20">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-center mb-6 mt-4">
                <h1 className="text-2xl font-bold mb-1">Atualizar Dados</h1>
                <p className="text-gray-400 text-sm">Modifique suas informações abaixo.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Nome Completo</label>
                  <input type="text" required value={editForm.full_name || ''} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">E-mail</label>
                  <input type="email" readOnly value={editForm.email || ''} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl outline-none opacity-50 cursor-not-allowed" title="O e-mail é o seu login e não pode ser alterado por aqui." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Telefone / WhatsApp</label>
                  <input type="tel" required value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl outline-none" />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full mt-6 bg-[#F17B37] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#d9682b] transition disabled:opacity-50">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Salvar Alterações</>}
              </button>
            </motion.form>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
