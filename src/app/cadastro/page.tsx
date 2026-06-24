"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Camera, User, FileText, Calendar, Phone, HeartPulse, AlertTriangle, CheckCircle2, Loader2, ChevronRight, ShieldCheck, PenTool, Eraser } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

export default function CadastroPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    cpf: "",
    rg: "",
    birth_date: "",
    phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    health_notes: "",
    allergies: "",
    medical_conditions: "",
    photo: null as File | null,
    image_authorization: "sim",
    signature_url: "" // will hold base64 temporarily before upload
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({ ...formData, photo: file });
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const formatCPF = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return v;
  };

  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    return v;
  };

  const formatRG = (v: string) => {
    v = v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    let letters = v.replace(/[^A-Z]/g, "").substring(0, 2);
    let numbers = v.replace(/[^0-9]/g, "").substring(0, 9);
    
    if (numbers.length > 0) {
      if (numbers.length > 5) {
        numbers = numbers.replace(/^(\d{2})(\d{3})(\d{1,4})/, "$1.$2.$3");
      } else if (numbers.length > 2) {
        numbers = numbers.replace(/^(\d{2})(\d{1,3})/, "$1.$2");
      }
    }

    if (letters.length === 2) {
      return numbers.length > 0 ? `${letters}-${numbers}` : letters;
    }
    return letters + numbers;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 0. Verifica Duplicidade
      const { data: existing } = await supabase.from('clients')
        .select('id')
        .or(`cpf.eq.${formData.cpf},phone.eq.${formData.phone},email.eq.${formData.email}`);
      
      if (existing && existing.length > 0) {
        alert("Ops! Já existe um cadastro no nosso sistema com esse mesmo CPF, Email ou Telefone.");
        setIsLoading(false);
        return;
      }

      let photoUrl = "";
      let signatureUrl = "";

      // 1. Upload Photo
      if (formData.photo) {
        const fileExt = formData.photo.name.split('.').pop();
        const fileName = `client_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('fotos_agendas')
          .upload(fileName, formData.photo);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('fotos_agendas')
          .getPublicUrl(fileName);
          
        photoUrl = publicUrlData.publicUrl;
      }

      // 1.5 Upload Signature
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        
        const signatureName = `signature_${Math.random().toString(36).substring(2)}_${Date.now()}.png`;
        const { error: sigUploadError } = await supabase.storage
          .from('fotos_agendas')
          .upload(signatureName, blob, { contentType: 'image/png' });
          
        if (sigUploadError) throw sigUploadError;

        const { data: publicSigData } = supabase.storage
          .from('fotos_agendas')
          .getPublicUrl(signatureName);
        
        signatureUrl = publicSigData.publicUrl;
      }

      // Concatena as observações de saúde
      const formattedHealthNotes = `Alergias a medicação: ${formData.allergies || 'Não tem'}\nDoenças/Condições: ${formData.medical_conditions || 'Não tem'}\nOutras Notas: ${formData.health_notes || 'Nenhuma'}`;

      // 2. Save to Supabase
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        cpf: formData.cpf,
        rg: formData.rg,
        birth_date: formData.birth_date,
        phone: formData.phone,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        health_notes: formattedHealthNotes,
        photo_url: photoUrl,
        image_authorization: formData.image_authorization === "sim",
        signature_url: signatureUrl
      };

      const { data: insertedData, error: insertError } = await supabase.from('clients').insert([payload]).select();
      if (insertError) throw insertError;

      const savedClient = insertedData && insertedData.length > 0 ? insertedData[0] : payload;

      // 3. Send Email Notification
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_registration',
          client: savedClient
        })
      }).catch(err => console.error("Erro ignorado de email", err));

      setIsSuccess(true);
      
    } catch (error: any) {
      console.error("Erro completo:", error);
      const errorMessage = error.message || error.error_description || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      alert("Ocorreu um erro ao enviar o cadastro: " + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0F1722] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1a2332] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Cadastro Concluído!</h2>
          <p className="text-gray-400 mb-8">
            Seus dados foram enviados com segurança. Prepare as botas e até a próxima aventura!
          </p>
          <button 
            onClick={() => window.location.href = '/agenda'}
            className="w-full bg-[#F17B37] text-white py-3 rounded-xl font-bold hover:bg-[#d9682b] transition"
          >
            Ver Próximas Trilhas
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1722] text-white font-sans pb-20 overflow-x-hidden relative flex flex-col items-center">
      {/* Background Decorativo */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F17B37] rounded-full blur-[150px] opacity-10 pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#25D366] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <header className="w-full max-w-2xl px-6 pt-12 pb-8 relative z-10 text-center">
        <ShieldCheck className="h-12 w-12 text-[#F17B37] mx-auto mb-4" />
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Ficha de Aventura</h1>
        <p className="text-gray-400 text-sm md:text-base">Preencha seus dados para ativarmos o seu Seguro de Trilha.</p>
      </header>

      <div className="w-full max-w-2xl px-6 relative z-10">
        <form onSubmit={onSubmit} className="bg-[#1a2332] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
          
          <div className="flex mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-2 bg-gray-800 first:rounded-l-full last:rounded-r-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#F17B37]"
                  initial={{ width: "0%" }}
                  animate={{ width: step >= i ? "100%" : "0%" }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold flex items-center justify-center gap-2"><User className="text-[#F17B37]" /> Quem é você?</h2>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="relative group cursor-pointer">
                    <div className={`w-32 h-32 rounded-full border-2 overflow-hidden flex flex-col items-center justify-center transition-all ${photoPreview ? 'border-[#F17B37]' : 'border-dashed border-gray-600 bg-white/5 hover:border-[#F17B37] hover:bg-white/10'}`}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Sua foto" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="h-8 w-8 text-gray-500 mb-2 group-hover:text-[#F17B37]" />
                          <span className="text-xs text-gray-400 font-bold">Foto de Rosto</span>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" required onChange={handlePhotoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600" 
                    placeholder="João da Silva Pereira"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">E-mail</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600" 
                    placeholder="seuemail@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Telefone / WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-4 h-5 w-5 text-gray-500" />
                    <input 
                      type="text" 
                      required
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})}
                      className="w-full pl-12 p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600" 
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleNext}
                  disabled={!formData.full_name || !formData.phone || !formData.photo}
                  className="w-full mt-6 bg-white/10 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition disabled:opacity-50"
                >
                  Continuar <ChevronRight className="h-5 w-5" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold flex items-center justify-center gap-2"><FileText className="text-[#F17B37]" /> Documentos</h2>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">CPF</label>
                  <input 
                    type="text" 
                    required
                    value={formData.cpf}
                    onChange={e => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600" 
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">RG</label>
                  <input 
                    type="text" 
                    required
                    value={formData.rg}
                    onChange={e => setFormData({...formData, rg: formatRG(e.target.value)})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600" 
                    placeholder="MG-00.000.000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Data de Nascimento</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-4 h-5 w-5 text-gray-500" />
                    <input 
                      type="date" 
                      required
                      value={formData.birth_date}
                      onChange={e => setFormData({...formData, birth_date: e.target.value})}
                      className="w-full pl-12 p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all text-white [&::-webkit-calendar-picker-indicator]:invert" 
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={handlePrev} className="flex-none px-6 bg-white/5 text-gray-300 rounded-2xl font-bold hover:bg-white/10 transition">
                    Voltar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleNext}
                    disabled={!formData.cpf || !formData.rg || !formData.birth_date}
                    className="flex-1 bg-white/10 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition disabled:opacity-50"
                  >
                    Continuar <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold flex items-center justify-center gap-2"><HeartPulse className="text-[#F17B37]" /> Saúde e Segurança</h2>
                </div>

                <div className="bg-[#F17B37]/10 border border-[#F17B37]/30 p-4 rounded-2xl">
                  <p className="text-sm text-gray-300 flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#F17B37] shrink-0" />
                    <span>Em caso de emergência na trilha, com quem devemos entrar em contato urgentemente?</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Nome do Contato de Emergência</label>
                  <input 
                    type="text" 
                    required
                    value={formData.emergency_contact_name}
                    onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600" 
                    placeholder="Nome da pessoa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Telefone do Contato</label>
                  <input 
                    type="text" 
                    required
                    value={formData.emergency_contact_phone}
                    onChange={e => setFormData({...formData, emergency_contact_phone: formatPhone(e.target.value)})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600" 
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Você possui alguma alergia a medicamentos?</label>
                  <input 
                    type="text" 
                    value={formData.allergies}
                    onChange={e => setFormData({...formData, allergies: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600" 
                    placeholder="Ex: Alergia a Dipirona, Penicilina, etc. (Opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Possui alguma condição médica/doença?</label>
                  <input 
                    type="text" 
                    value={formData.medical_conditions}
                    onChange={e => setFormData({...formData, medical_conditions: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600" 
                    placeholder="Ex: Pressão alta, asma, diabetes, etc. (Opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Outras Observações (Opcional)</label>
                  <textarea 
                    value={formData.health_notes}
                    onChange={e => setFormData({...formData, health_notes: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600 resize-none h-24" 
                    placeholder="Tipagem sanguínea, cirurgias recentes ou outra nota."
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={handlePrev} className="flex-none px-6 bg-white/5 text-gray-300 rounded-2xl font-bold hover:bg-white/10 transition">
                    Voltar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleNext}
                    disabled={!formData.emergency_contact_name || !formData.emergency_contact_phone}
                    className="flex-1 bg-white/10 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition disabled:opacity-50"
                  >
                    Continuar <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold flex items-center justify-center gap-2"><FileText className="text-[#F17B37]" /> Termos e Assinatura</h2>
                  <p className="text-gray-400 text-sm mt-2">Seguro Atleta e Reconhecimento de Riscos</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl max-h-64 overflow-y-auto text-xs text-gray-300 custom-scrollbar space-y-4">
                  <h3 className="font-bold text-white text-sm">Resumo da Cobertura de Seguro:</h3>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Valor do Day Use:</strong> R$ 4,00 por pessoa/dia</li>
                    <li><strong>Morte Acidental (MA):</strong> Indenização integral em caso de morte acidental (R$ 30.000,00)</li>
                    <li><strong>Invalidez Permanente (IPA):</strong> Invalidez decorrente de acidente (R$ 30.000,00)</li>
                    <li><strong>DMHO:</strong> Despesas Médico Hospitalares e Odontológicas (R$ 3.000,00)</li>
                    <li><strong>Cobertura de deslocamento:</strong> Garante a cobertura no trajeto até o local da atividade</li>
                  </ul>
                  <hr className="border-white/10" />
                  <h3 className="font-bold text-white text-sm">TERMO DE RECONHECIMENTO DE RISCO E ISENÇÃO DE RESPONSABILIDADE</h3>
                  <p>Declaro estar ciente de que a expedição é uma atividade de turismo de aventura e montanhismo, realizada em ambiente natural, estando sujeita a riscos inerentes que não podem ser totalmente eliminados.</p>
                  <p>Declaro voluntariamente que gozo de boa saúde física e mental e que não possuo nenhuma contraindicação médica que me impeça de realizar esforços físicos de intensidade severa.</p>
                  <p>Estou ciente de que é minha estrita obrigação portar e utilizar os equipamentos e vestuários recomendados.</p>
                  <p>Ao assinar este termo de livre e espontânea vontade, assumo integralmente todos os riscos associados à expedição. Isento expressamente a organização Mais Trilha e Menos Estresse de qualquer responsabilidade civil ou criminal.</p>
                  <p>Autorizo a equipe a tomar todas as medidas cabíveis de primeiros socorros e, se necessário, acionar serviços oficiais de resgate.</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <p className="block text-sm font-bold text-gray-300 mb-3">Autorização de Uso de Imagem</p>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="radio" 
                        name="image_auth" 
                        value="sim" 
                        checked={formData.image_authorization === "sim"}
                        onChange={() => setFormData({...formData, image_authorization: "sim"})}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-300">
                        <strong className="text-white">AUTORIZO</strong> o uso de minha imagem e voz para fins de divulgação e marketing em redes sociais de forma gratuita e por prazo indeterminado.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="radio" 
                        name="image_auth" 
                        value="nao" 
                        checked={formData.image_authorization === "nao"}
                        onChange={() => setFormData({...formData, image_authorization: "nao"})}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-300">
                        <strong className="text-white">NÃO AUTORIZO</strong> o uso de minha imagem para fins promocionais.
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer p-2">
                    <input 
                      type="checkbox" 
                      required
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="w-5 h-5 accent-[#F17B37]"
                    />
                    <span className="text-sm font-bold text-gray-300">Li e aceito os termos descritos acima.</span>
                  </label>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-gray-300">Assinatura Digital</label>
                    <button 
                      type="button" 
                      onClick={() => sigCanvas.current?.clear()}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Eraser className="w-3 h-3" /> Limpar
                    </button>
                  </div>
                  <div className="bg-white rounded-2xl overflow-hidden border-2 border-gray-300 touch-none">
                    <SignatureCanvas 
                      ref={sigCanvas}
                      canvasProps={{
                        className: 'w-full h-40 cursor-crosshair'
                      }}
                      backgroundColor="white"
                      penColor="black"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
                    <PenTool className="w-3 h-3" /> Assine com o dedo na tela
                  </p>
                </div>

                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={handlePrev} className="flex-none px-6 bg-white/5 text-gray-300 rounded-2xl font-bold hover:bg-white/10 transition">
                    Voltar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading || !acceptedTerms}
                    className="flex-1 bg-gradient-to-r from-[#F17B37] to-[#f9a03f] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg shadow-[#F17B37]/20 transition disabled:opacity-50 disabled:scale-100"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> Finalizar Cadastro</>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </form>
      </div>
    </div>
  );
}
