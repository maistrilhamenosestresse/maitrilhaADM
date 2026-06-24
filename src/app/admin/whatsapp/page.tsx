"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, AlertCircle, CheckCircle2, Search, UserCircle2, Megaphone, Loader2, Eraser, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function WhatsAppAdmin() {
  const [botStatus, setBotStatus] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Chat state
  const [activeContact, setActiveContact] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Broadcast Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastMediaFile, setBroadcastMediaFile] = useState<File | null>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const uploadMedia = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `chat_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('fotos_agendas').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('fotos_agendas').getPublicUrl(fileName);
    return data.publicUrl;
  };

  useEffect(() => {
    checkStatus();
    loadClients();
  }, []);

  // Poll active chat history every 5s if active
  useEffect(() => {
    let interval: any;
    if (activeContact) {
      loadChatHistory(activeContact.phone);
      interval = setInterval(() => loadChatHistory(activeContact.phone), 5000);
    }
    return () => clearInterval(interval);
  }, [activeContact]);

  // Auto scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp');
      const data = await res.json();
      setBotStatus(data);
    } catch (e) {
      setBotStatus({ error: 'Erro de conexão' });
    }
  };

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('full_name', { ascending: true });
    if (data) {
      // Remover duplicatas por telefone
      const uniqueClients = Array.from(new Map(data.map(item => [item.phone, item])).values());
      setClients(uniqueClients);
      setFilteredClients(uniqueClients);
    }
  };

  useEffect(() => {
    setFilteredClients(
      clients.filter(c => c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone?.includes(searchQuery))
    );
  }, [searchQuery, clients]);

  const loadChatHistory = async (phone: string) => {
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('client_phone', phone)
      .order('created_at', { ascending: true });
    if (data) setChatHistory(data);
  };

  // Envio Instantâneo de 1 pra 1
  const handleSendIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !mediaFile) || !activeContact) return;

    const tempMessage = messageText;
    const tempFile = mediaFile;
    setMessageText('');
    setMediaFile(null);
    setIsSending(true);

    try {
      let media_url = null;
      if (tempFile) {
        media_url = await uploadMedia(tempFile);
      }

      // 1. Dispara instantaneamente pela rota individual
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'individual', phone: activeContact.phone, message: tempMessage, media_url })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

      // 2. Salva no banco como sent
      await supabase.from('whatsapp_messages').insert([{
        client_name: activeContact.full_name,
        client_phone: activeContact.phone,
        message: tempMessage,
        media_url: media_url,
        status: 'sent'
      }]);

      loadChatHistory(activeContact.phone);
    } catch (error: any) {
      alert("Erro ao enviar: " + error.message);
      // Salva no banco como error
      await supabase.from('whatsapp_messages').insert([{
        client_name: activeContact.full_name,
        client_phone: activeContact.phone,
        message: tempMessage,
        media_url: tempFile ? 'error_upload' : null,
        status: 'error',
        error_log: error.message
      }]);
      loadChatHistory(activeContact.phone);
    } finally {
      setIsSending(false);
    }
  };

  // Envio em Massa (Megafone) -> Vai para a Fila
  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() && !broadcastMediaFile) return alert('Digite a mensagem ou anexe um arquivo para a campanha.');
    setIsSending(true);

    try {
      let media_url = null;
      if (broadcastMediaFile) {
        media_url = await uploadMedia(broadcastMediaFile);
      }

      const payload = clients.map(client => ({
        client_name: client.full_name,
        client_phone: client.phone,
        message: broadcastMessage,
        media_url: media_url,
        status: 'pending'
      }));

      const { error } = await supabase.from('whatsapp_messages').insert(payload);

      if (error) {
        alert("Erro ao agendar campanha: " + error.message);
      } else {
        setBroadcastMessage('');
        setIsBroadcastModalOpen(false);
        alert(`✅ Campanha enviada para a Fila do Robô! ${payload.length} clientes receberão a mensagem.`);
        setBroadcastMediaFile(null);
        
        // Força o robô a puxar a fila agora
        fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'trigger' })
        }).catch(() => {});
      }
    } catch (error: any) {
      alert("Erro no envio em massa: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#e5ddd5] font-sans overflow-hidden">
      
      {/* Cabeçalho Global */}
      <header className="bg-[#00a884] text-white p-3 shadow-md z-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 hover:bg-white/10 rounded-full transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold leading-tight">Mais Trilha CRM</h1>
            <div className="flex items-center gap-1 text-xs text-white/80">
              {botStatus?.online ? (
                <><CheckCircle2 className="w-3 h-3 text-green-300" /> Robô Online</>
              ) : (
                <><AlertCircle className="w-3 h-3 text-red-300" /> Robô Offline</>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsBroadcastModalOpen(true)}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-sm font-bold transition"
        >
          <Megaphone className="w-4 h-4" /> <span className="hidden sm:inline">Disparo em Massa</span>
        </button>
      </header>

      {/* ÁREA DE TRABALHO (Mobile First) */}
      <div className="flex flex-1 overflow-hidden max-w-screen-2xl w-full mx-auto bg-white shadow-xl relative">
        
        {/* COLUNA ESQUERDA - LISTA DE CONTATOS */}
        <div className={`w-full md:w-[350px] lg:w-[400px] flex flex-col border-r border-gray-200 transition-transform duration-300 absolute md:relative z-10 bg-white h-full ${activeContact ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredClients.map(client => (
              <div 
                key={client.id} 
                onClick={() => setActiveContact(client)}
                className={`flex items-center gap-3 p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${activeContact?.id === client.id ? 'bg-gray-100' : ''}`}
              >
                {client.photo_url ? (
                  <img src={client.photo_url} alt={client.full_name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <UserCircle2 className="w-12 h-12 text-gray-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-gray-900 truncate">{client.full_name}</h3>
                  <p className="text-[13px] text-gray-500 truncate">{client.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA - CHAT ATIVO */}
        <div className={`flex-1 flex flex-col bg-[#efeae2] relative bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-repeat bg-center transition-transform duration-300 absolute md:relative z-20 w-full h-full ${activeContact ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
          
          {activeContact ? (
            <>
              {/* Header do Chat */}
              <div className="bg-[#f0f2f5] px-4 py-2 border-b border-gray-300 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveContact(null)} className="md:hidden p-2 text-gray-600 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {activeContact.photo_url ? (
                    <img src={activeContact.photo_url} alt={activeContact.full_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-10 h-10 text-gray-400" />
                  )}
                  <div>
                    <h2 className="text-[16px] font-semibold text-gray-900 leading-tight">{activeContact.full_name}</h2>
                    <p className="text-[13px] text-gray-500">{activeContact.phone}</p>
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    if(confirm(`Tem certeza que deseja apagar o histórico de mensagens de ${activeContact.full_name}?`)) {
                      await supabase.from('whatsapp_messages').delete().eq('client_phone', activeContact.phone);
                      setChatHistory([]);
                    }
                  }}
                  title="Limpar Histórico" 
                  className="p-2 text-gray-500 hover:bg-red-100 hover:text-red-500 rounded-full transition"
                >
                  <Eraser className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo do Chat */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
                {chatHistory.length === 0 ? (
                  <div className="bg-yellow-100/80 text-yellow-800 text-xs text-center p-2 rounded-lg mx-auto max-w-sm mt-4 shadow-sm">
                    Inicie uma nova conversa com {activeContact.full_name.split(' ')[0]}.
                  </div>
                ) : (
                  chatHistory.map((msg) => (
                    <div key={msg.id} className="self-end bg-[#dcf8c6] max-w-[85%] md:max-w-[70%] rounded-lg p-2 shadow-sm flex flex-col relative">
                      {msg.media_url && (
                        <a href={msg.media_url} target="_blank" rel="noreferrer">
                          <img src={msg.media_url} className="rounded-lg mb-1 w-full max-h-48 object-cover border border-[#c4e3a8]" />
                        </a>
                      )}
                      {msg.message && <p className="text-[14px] text-gray-900 whitespace-pre-wrap">{msg.message}</p>}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500">
                        <span>{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.status === 'sent' ? (
                          <span className="text-blue-500 font-bold">✓✓</span>
                        ) : msg.status === 'error' ? (
                          <span className="text-red-500" title={msg.error_log}>❌</span>
                        ) : (
                          <span>⏳</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input de Mensagem */}
              <form onSubmit={handleSendIndividual} className="bg-[#f0f2f5] p-3 shrink-0 flex flex-col gap-2">
                {mediaFile && (
                  <div className="relative inline-block self-start p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                    <button 
                      type="button" 
                      onClick={() => setMediaFile(null)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {mediaFile.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(mediaFile)} alt="Anexo" className="h-16 w-16 object-cover rounded" />
                    ) : (
                      <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center flex-col text-[10px] text-gray-500">
                        <ImageIcon className="w-6 h-6 mb-1 text-gray-400" />
                        Arquivo
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-end gap-2 w-full">
                  <label className="cursor-pointer p-3 text-gray-500 hover:text-gray-700 transition self-center">
                    <Paperclip className="w-5 h-5" />
                    <input 
                      type="file" 
                      accept="image/*,video/mp4,application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          if(e.target.files[0].size > 16 * 1024 * 1024) {
                            alert("O arquivo não pode ter mais de 16MB.");
                            return;
                          }
                          setMediaFile(e.target.files[0]);
                        }
                      }} 
                      className="hidden" 
                    />
                  </label>
                  
                  <textarea 
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendIndividual(e);
                      }
                    }}
                    placeholder="Mensagem"
                    className="flex-1 bg-white border border-gray-300 rounded-2xl px-4 py-2 text-[15px] focus:outline-none focus:border-[#00a884] resize-none max-h-32 custom-scrollbar"
                  />
                  <button 
                    type="submit"
                    disabled={isSending || (!messageText.trim() && !mediaFile)}
                    className="bg-[#00a884] hover:bg-[#01886a] text-white p-3 rounded-full transition disabled:opacity-50 shrink-0 self-center"
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-500">
              <div className="w-64 h-64 bg-gray-200 rounded-full mb-6 opacity-50 flex items-center justify-center">
                 <img src="https://static.whatsapp.net/rsrc.php/v3/y6/r/wa669aeJeom.png" className="w-32 opacity-50" />
              </div>
              <h2 className="text-2xl font-light text-gray-600">Mais Trilha CRM</h2>
              <p className="text-sm mt-2">Selecione um contato para visualizar o histórico ou enviar uma mensagem.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Disparo em Massa */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#00a884]" /> Disparo em Massa
            </h2>
            <p className="text-sm text-gray-500 mb-4">Esta mensagem será enviada para **todos** os {clients.length} clientes cadastrados, com intervalo de 15 segundos entre cada envio para evitar banimento.</p>
            
            <textarea 
              rows={4}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Digite a mensagem da campanha aqui..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00a884] mb-4"
            />
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Anexar Arquivo (Opcional)</label>
              <input 
                type="file" 
                accept="image/*,video/mp4,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    if(e.target.files[0].size > 16 * 1024 * 1024) {
                      alert("O arquivo não pode ter mais de 16MB.");
                      return;
                    }
                    setBroadcastMediaFile(e.target.files[0]);
                  }
                }} 
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setIsBroadcastModalOpen(false)}
                className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button 
                onClick={handleBroadcast}
                disabled={isSending || (!broadcastMessage.trim() && !broadcastMediaFile)}
                className="px-6 py-2 bg-[#00a884] text-white font-bold rounded-lg flex items-center gap-2 hover:bg-[#01886a] disabled:opacity-50"
              >
                {isSending ? 'Processando...' : 'Iniciar Disparo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
