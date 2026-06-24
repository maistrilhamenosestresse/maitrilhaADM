"use client";

import { useState } from 'react';

export default function WhatsAppTest() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Mensagem de teste!');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const testVercelAPI = async () => {
    setIsLoading(true);
    addLog(`Enviando para Vercel API: /api/whatsapp`);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'individual', phone, message })
      });
      
      addLog(`Vercel Status: ${res.status} ${res.statusText}`);
      
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        addLog(`Vercel Response JSON: ${JSON.stringify(json, null, 2)}`);
      } catch (e) {
        addLog(`Vercel Response Text: ${text}`);
      }
    } catch (e: any) {
      addLog(`Erro Crítico Vercel: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testRailwayAPI = async () => {
    setIsLoading(true);
    const railwayUrl = 'https://maitrilhaadm-production.up.railway.app/api/send/individual';
    addLog(`Enviando DIRETO para Railway API: ${railwayUrl}`);
    try {
      const res = await fetch(railwayUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'M@isTrilh@S3cur3K3y2026'
        },
        body: JSON.stringify({ phone, message })
      });
      
      addLog(`Railway Status: ${res.status} ${res.statusText}`);
      
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        addLog(`Railway Response JSON: ${JSON.stringify(json, null, 2)}`);
      } catch (e) {
        addLog(`Railway Response Text: ${text}`);
      }
    } catch (e: any) {
      addLog(`Erro Crítico Railway: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Laboratório de Teste: WhatsApp</h1>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Número (ex: 31999567681)</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mensagem</label>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 h-24 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={testVercelAPI}
              disabled={isLoading || !phone}
              className="flex-1 bg-black text-white font-bold py-2 px-4 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              1. Testar Rota Vercel
            </button>
            <button 
              onClick={testRailwayAPI}
              disabled={isLoading || !phone}
              className="flex-1 bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              2. Testar Rota Railway (Direto)
            </button>
          </div>
        </div>

        <div className="bg-gray-900 rounded p-4 text-green-400 font-mono text-sm overflow-x-auto h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <span className="text-gray-500">Aguardando execução...</span>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-2 whitespace-pre-wrap">{log}</div>
            ))
          )}
        </div>
        
        {logs.length > 0 && (
          <button 
            onClick={() => setLogs([])}
            className="mt-4 text-sm text-red-500 hover:underline"
          >
            Limpar Logs
          </button>
        )}
      </div>
    </div>
  );
}
