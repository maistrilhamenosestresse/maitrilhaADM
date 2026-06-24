"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Users, Send, AlertCircle, CheckCircle2, MessageCircle, Clock, CalendarClock, Search, UserCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function WhatsAppAdmin() {
  const [botStatus, setBotStatus] = useState<any>(null);
  
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  const [queue, setQueue] = useState<any[]>([]);

  const [messageText, setMessageText] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    checkStatus();
    loadClients();
    loadQueue();
    const interval = setInterval(loadQueue, 15000); // Atualiza a fila a cada 15s
    return () => clearInterval(interval);
  }, []);

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
      setClients(data);
      setFilteredClients(data);
    }
  };

  const loadQueue = async () => {
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setQueue(data);
  };

  useEffect(() => {
    setFilteredClients(
      clients.filter(c => c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone?.includes(searchQuery))
    );
  }, [searchQuery, clients]);

  const toggleClientSelection = (id: string) => {
    const newSet = new Set(selectedClients);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedClients(newSet);
  };

  const selectAll = () => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    }
  };

  const handleSend = async () => {
    if (selectedClients.size === 0) return alert('Selecione pelo menos um contato.');
    if (!messageText.trim()) return alert('Digite uma mensagem.');

    setIsSending(true);

    const targetClients = clients.filter(c => selectedClients.has(c.id));
    
    // Inserir na tabela whatsapp_messages (Fila)
    const payload = targetClients.map(client => ({
      client_name: client.full_name,
      client_phone: client.phone,
      message: messageText,
      status: 'pending',
      scheduled_for: scheduleDate ? new Date(scheduleDate).toISOString() : new Date().toISOString()
    }));

    const { error } = await supabase.from('whatsapp_messages').insert(payload);

    if (error) {
      alert("Erro ao agendar mensagens: " + error.message);
    } else {
      setMessageText('');
      setScheduleDate('');
      setSelectedClients(new Set());
      alert(`✅ ${payload.length} mensagens enviadas para a Fila do Robô!`);
      loadQueue();
      
      // Se não foi agendado para o futuro, força o robô a puxar agora
      if (!scheduleDate || new Date(scheduleDate).getTime() <= Date.now()) {
        fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'trigger' })
        }).catch(() => {});
      }
    }

    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#e5ddd5] font-sans overflow-hidden">
      
      {/* Cabeçalho */}
      <header className="bg-[#00a884] text-white p-4 shadow-md z-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-white/10 rounded-full transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">CRM WhatsApp Mais Trilha</h1>
            <div className="flex items-center gap-2 text-sm text-white/80 mt-0.5">
              {botStatus?.online ? (
                <><CheckCircle2 className="w-4 h-4 text-green-300" /> Robô Conectado</>
              ) : (
                <><AlertCircle className="w-4 h-4 text-red-300" /> Robô Offline/Erro</>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Área de Trabalho (Estilo WhatsApp Web) */}
      <div className="flex flex-1 overflow-hidden max-w-screen-2xl w-full mx-auto">
        
        {/* COLUNA ESQUERDA - CONTATOS */}
        <div className="w-full md:w-[400px] bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00a884]"
              />
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{filteredClients.length} Contatos</span>
              <button onClick={selectAll} className="text-xs font-bold text-[#00a884] hover:underline">
                {selectedClients.size === filteredClients.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredClients.map(client => (
              <div 
                key={client.id} 
                onClick={() => toggleClientSelection(client.id)}
                className={`flex items-center gap-3 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${selectedClients.has(client.id) ? 'bg-[#00a884]/10 hover:bg-[#00a884]/20' : ''}`}
              >
                <div className="shrink-0 relative">
                  {client.photo_url ? (
                    <img src={client.photo_url} alt={client.full_name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                  ) : (
                    <UserCircle2 className="w-10 h-10 text-gray-300" />
                  )}
                  <input 
                    type="checkbox" 
                    checked={selectedClients.has(client.id)}
                    readOnly
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded border-gray-300 text-[#00a884] focus:ring-[#00a884] bg-white"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{client.full_name}</h3>
                  <p className="text-xs text-gray-500 truncate">{client.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA - DISPARO E FILA */}
        <div className="flex-1 flex flex-col bg-[#efeae2] relative relative bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-repeat bg-center opacity-95">
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar relative z-10 bg-white/90 backdrop-blur-sm">
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* ÁREA DE ENVIO */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 h-fit">
                <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#00a884]" /> Disparador de Campanhas
                </h2>
                <p className="text-sm text-gray-500 mb-6">Você selecionou <strong>{selectedClients.size}</strong> contato(s) para receber esta mensagem.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Agendamento (Opcional)</label>
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-5 h-5 text-gray-400 shrink-0" />
                      <input 
                        type="datetime-local" 
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#00a884]"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Se deixar vazio, o disparo começará imediatamente.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Mensagem</label>
                    <textarea 
                      rows={6}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Olá! A próxima aventura da Mais Trilha está chegando..."
                      className="w-full bg-gray-50 border border-gray-200 text-sm rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-[#00a884] resize-none"
                    />
                  </div>

                  <button 
                    onClick={handleSend}
                    disabled={isSending || selectedClients.size === 0}
                    className="w-full bg-[#00a884] hover:bg-[#01886a] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md"
                  >
                    <Send className="w-5 h-5" />
                    <span>{isSending ? 'Processando...' : scheduleDate ? 'Agendar Disparo' : 'Enviar Imediatamente'}</span>
                  </button>
                </div>
              </div>

              {/* ÁREA DE FILA / HISTÓRICO */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500" /> Fila e Histórico
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">O robô lê esta fila a cada 1 minuto e dispara as mensagens agendadas com pausas de 15s.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {queue.length === 0 ? (
                    <div className="text-center text-gray-400 py-10 text-sm">Nenhuma mensagem no histórico.</div>
                  ) : (
                    queue.map(msg => (
                      <div key={msg.id} className="flex flex-col bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-gray-900">{msg.client_name || 'Desconhecido'}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(msg.scheduled_for).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 truncate">{msg.client_phone}</p>
                        
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-200">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            msg.status === 'sent' ? 'bg-green-100 text-green-700' :
                            msg.status === 'error' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {msg.status === 'sent' ? '✅ Enviado' : msg.status === 'error' ? '❌ Erro' : '⏳ Na Fila'}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {msg.status === 'error' && (
                              <span className="text-[10px] text-red-500 max-w-[150px] truncate" title={msg.error_log}>{msg.error_log}</span>
                            )}
                            <a 
                              href={`https://wa.me/55${msg.client_phone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-[#00a884] hover:underline flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3" /> Conversar
                            </a>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
