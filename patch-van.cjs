const fs = require('fs');

let content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Update states
content = content.replace(
  /const \[mainTab, setMainTab\] = useState<'trilhas' \| 'clientes' \| 'reservas' \| 'financas'>\('trilhas'\);/,
  "const [mainTab, setMainTab] = useState<'trilhas' | 'clientes' | 'financas'>('trilhas');\n  const [clientesTab, setClientesTab] = useState<'todos' | 'listas'>('todos');\n  const [printMode, setPrintMode] = useState<'todos' | 'van' | 'seguro'>('todos');"
);

// 2. Add Export Logic
const exportLogic = `
  const generateWhatsAppVan = () => {
    if (!selectedAgendaId) return;
    const agenda = agendas.find(a => a.id === selectedAgendaId);
    let text = \`🚐 *LISTA DE EMBARQUE - \${agenda?.title.toUpperCase()}*\\n📅 Data: \${formatDateDisplay(agenda?.date || '')}\\n\\n\`;
    const sorted = [...reservas].filter(r => r.status_pagamento === 'pago' || r.status_pagamento === 'pendente').sort((a,b) => a.clients.full_name.localeCompare(b.clients.full_name));
    if (sorted.length === 0) text += "Nenhum passageiro confirmado.";
    sorted.forEach((r, idx) => {
      text += \`*\${idx + 1}. \${r.clients.full_name}*\\nCPF: \${r.clients.cpf || 'N/A'} | Tel: \${r.clients.phone || 'N/A'}\\n\\n\`;
    });
    navigator.clipboard.writeText(text);
    alert("Lista de Van copiada para o WhatsApp!");
  };

  const generateWhatsAppSeguro = () => {
    if (!selectedAgendaId) return;
    const agenda = agendas.find(a => a.id === selectedAgendaId);
    let text = \`🛡️ *LISTA PARA SEGURO - \${agenda?.title.toUpperCase()}*\\n📅 Data: \${formatDateDisplay(agenda?.date || '')}\\n\\n\`;
    const sorted = [...reservas].filter(r => r.status_pagamento === 'pago' || r.status_pagamento === 'pendente').sort((a,b) => a.clients.full_name.localeCompare(b.clients.full_name));
    if (sorted.length === 0) text += "Nenhum passageiro confirmado.";
    sorted.forEach((r, idx) => {
      text += \`*\${idx + 1}. \${r.clients.full_name}*\\nE-mail: \${r.clients.email || 'N/A'}\\nCPF: \${r.clients.cpf || 'N/A'} | RG: \${r.clients.rg || 'N/A'}\\nNascimento: \${r.clients.birth_date ? formatDateDisplay(r.clients.birth_date) : 'N/A'}\\nContato Emergência: \${r.clients.emergency_contact_name || 'N/A'} - \${r.clients.emergency_contact_phone || 'N/A'}\\nSaúde/Obs: \${r.clients.health_notes || 'Nenhuma'}\\n\\n\`;
    });
    navigator.clipboard.writeText(text);
    alert("Lista de Seguro copiada para o WhatsApp!");
  };

  const handlePrint = (mode: 'todos' | 'van' | 'seguro') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode('todos'), 1000);
    }, 500);
  };
`;
content = content.replace('const handleGenerateCFOAdvice = async', exportLogic + '\\n\\n  const handleGenerateCFOAdvice = async');


// 3. Inject the Clientes sub-tabs
const subTabsHTML = `
                {/* Abas Superiores de Clientes */}
                <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden shrink-0 mb-4 print:hidden">
                  <button type="button" onClick={() => setClientesTab('todos')} className={\`flex-1 py-3 text-xs font-bold border-b-2 transition-all \${clientesTab === 'todos' ? 'border-[#F17B37] text-[#F17B37] bg-[#F17B37]/5' : 'border-transparent text-gray-500 hover:bg-gray-50'}\`}>Todos Cadastrados</button>
                  <button type="button" onClick={() => setClientesTab('listas')} className={\`flex-1 py-3 text-xs font-bold border-b-2 transition-all \${clientesTab === 'listas' ? 'border-[#1D2A3A] text-[#1D2A3A] bg-[#1D2A3A]/5' : 'border-transparent text-gray-500 hover:bg-gray-50'}\`}>Listas de Embarque/Seguro</button>
                </div>
`;
content = content.replace(/\{mainTab === 'clientes' && \(\s*<motion\.div[^>]+className="space-y-4">/, match => match + "\n" + subTabsHTML);

// 4. Change print header title based on mode
content = content.replace(/<h1 className="text-3xl font-black uppercase tracking-widest mb-2">Relatório de Seguros<\/h1>/,
  '<h1 className="text-3xl font-black uppercase tracking-widest mb-2">{printMode === \'van\' ? \'LISTA DE EMBARQUE - \' + agendas.find(a => a.id === selectedAgendaId)?.title : (printMode === \'seguro\' ? \'LISTA PARA SEGURO - \' + agendas.find(a => a.id === selectedAgendaId)?.title : \'Relatório de Seguros\')}</h1>'
);

// 5. Wrap the search bar and client list in clientesTab === 'todos' (using React fragment)
content = content.replace(/\{\/\* Barra de Pesquisa \*\/\}/, '{/* Barra de Pesquisa */}\n                {clientesTab === \'todos\' && (<>');
content = content.replace(/<\/div>\s*\{\/\* Tabela só para Impressão \*\/\}/, '</div>\n                </>)}\n\n                {/* Tabela só para Impressão */}');

// 6. Replace Tabela Só Para Impressão with conditional logic for the 3 modes
const tablePrintReplacement = `
                {/* Tabela só para Impressão */}
                <div className="hidden print:block">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead>
                      {printMode === 'van' ? (
                        <tr><th className="border p-2 w-12 text-center">#</th><th className="border p-2">Passageiro</th><th className="border p-2">CPF</th><th className="border p-2">Telefone</th><th className="border p-2">Check</th></tr>
                      ) : (
                        <tr><th className="border p-2 w-12 text-center">#</th><th className="border p-2">Cliente</th><th className="border p-2">Documentos</th><th className="border p-2">Contato</th><th className="border p-2">Emergência</th><th className="border p-2">Saúde</th></tr>
                      )}
                    </thead>
                    <tbody>
                      {(printMode === 'todos' ? clients : (reservas.filter(r => r.status_pagamento === 'pago' || r.status_pagamento === 'pendente').map(r => r.clients))).map((c, idx) => (
                        printMode === 'van' ? (
                          <tr key={c.id}>
                            <td className="border p-2 text-center font-bold">{idx + 1}</td>
                            <td className="border p-2 font-bold text-[12px]">{c.full_name}</td>
                            <td className="border p-2 text-[12px]">{c.cpf}</td>
                            <td className="border p-2 text-[12px]">{c.phone}</td>
                            <td className="border p-2"></td>
                          </tr>
                        ) : (
                          <tr key={c.id}>
                            <td className="border p-2 text-center font-bold">{idx + 1}</td>
                            <td className="border p-2 font-bold">{c.full_name}<br/><span suppressHydrationWarning className="font-normal text-[8px]">Nasc: {c.birth_date ? new Date(c.birth_date).toLocaleDateString('pt-BR') : 'N/A'}</span></td>
                            <td className="border p-2">CPF: {c.cpf}<br/>RG: {c.rg}</td>
                            <td className="border p-2">{c.phone}<br/>{c.email}</td>
                            <td className="border p-2">{c.emergency_contact_name}<br/>{c.emergency_contact_phone}</td>
                            <td className="border p-2 text-red-700 font-bold max-w-[200px] whitespace-pre-wrap">{c.health_notes}</td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
`;
content = content.replace(/\{\/\* Tabela só para Impressão \*\/\}[\s\S]*?<\/div>/, tablePrintReplacement.trim());


// 7. Inject "Listas de Embarque" block right above Tabela só para impressão
const embarqueBlock = `
                {clientesTab === 'listas' && (
                  <div className="space-y-6 print:hidden">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                      <label className="text-sm font-bold text-gray-700">Selecione a Trilha/Evento:</label>
                      <select 
                        value={selectedAgendaId} 
                        onChange={(e) => setSelectedAgendaId(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-[#1D2A3A] outline-none"
                      >
                        {agendas.map(a => (
                          <option key={a.id} value={a.id}>{a.title} - {formatDateDisplay(a.date)}</option>
                        ))}
                      </select>
                    </div>

                    {isFetchingDetails ? (
                      <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#1D2A3A]" /></div>
                    ) : (
                      <>
                        {/* Ações de Exportação */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Card Van */}
                          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm">
                            <h4 className="font-bold text-blue-900 text-lg flex items-center gap-2 mb-2">🚌 Lista para Van</h4>
                            <p className="text-xs text-blue-700 mb-4">Nome Completo, CPF e Contato.</p>
                            <div className="flex gap-2">
                              <button onClick={generateWhatsAppVan} className="flex-1 bg-white text-blue-600 border border-blue-200 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-100 transition shadow-sm">
                                <Send className="h-4 w-4"/> WhatsApp
                              </button>
                              <button onClick={() => handlePrint('van')} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-700 transition shadow-sm">
                                <Printer className="h-4 w-4"/> Imprimir PDF
                              </button>
                            </div>
                          </div>

                          {/* Card Seguro */}
                          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                            <h4 className="font-bold text-emerald-900 text-lg flex items-center gap-2 mb-2">🛡️ Lista para Seguro</h4>
                            <p className="text-xs text-emerald-700 mb-4">Dados completos e anotações médicas.</p>
                            <div className="flex gap-2">
                              <button onClick={generateWhatsAppSeguro} className="flex-1 bg-white text-emerald-600 border border-emerald-200 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-100 transition shadow-sm">
                                <Send className="h-4 w-4"/> WhatsApp
                              </button>
                              <button onClick={() => handlePrint('seguro')} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-700 transition shadow-sm">
                                <Printer className="h-4 w-4"/> Imprimir PDF
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Tabela Interativa de Passageiros e Inserção Manual */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="bg-[#1D2A3A] p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center gap-2"><User className="h-5 w-5"/> Gerenciar Passageiros</h3>
                            <div className="flex gap-2">
                              <button onClick={() => handleExportCSV('reservas')} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition text-xs font-bold flex items-center gap-1">
                                <FileUp className="h-4 w-4" /> Baixar Excel
                              </button>
                              <span className="bg-white/20 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center">{reservas.length} / {selectedAgendaData?.max_capacity || 15} Vagas</span>
                            </div>
                          </div>
                          
                          <div className="p-4 space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
                            {reservas.length === 0 ? (
                              <p className="text-center text-gray-400 py-6 text-sm font-medium">Nenhum passageiro nesta trilha ainda.</p>
                            ) : (
                              reservas.map(reserva => (
                                <div key={reserva.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                                  <div>
                                    <p className="font-bold text-gray-800 text-sm">{reserva.clients?.full_name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-md \${reserva.status_pagamento === 'pago' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}\`}>
                                        {reserva.status_pagamento.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <button onClick={() => handleDeleteReserva(reserva.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="h-4 w-4"/></button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Adicionar Manualmente */}
                        <form onSubmit={handleAddReserva} className={\`\${(reservas.filter(r => r.status_pagamento === 'pago' || r.status_pagamento === 'pendente').length >= (selectedAgendaData?.max_capacity || 15)) ? 'bg-gray-100 border-gray-200 opacity-70' : 'bg-blue-50/50 border-blue-100'} p-5 rounded-2xl border space-y-4\`}>
                          <h4 className={\`font-bold flex items-center gap-2 text-sm \${(reservas.filter(r => r.status_pagamento === 'pago' || r.status_pagamento === 'pendente').length >= (selectedAgendaData?.max_capacity || 15)) ? 'text-gray-500' : 'text-blue-900'}\`}>
                            <Plus className="h-4 w-4"/> {(reservas.filter(r => r.status_pagamento === 'pago' || r.status_pagamento === 'pendente').length >= (selectedAgendaData?.max_capacity || 15)) ? 'Trilha Esgotada - Inserção Bloqueada' : 'Inserir Passageiro Manualmente'}
                          </h4>
                          <select 
                            value={novaReservaClientId} 
                            onChange={(e) => setNovaReservaClientId(e.target.value)}
                            disabled={(reservas.filter(r => r.status_pagamento === 'pago' || r.status_pagamento === 'pendente').length >= (selectedAgendaData?.max_capacity || 15))}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Selecione um cliente cadastrado...</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>{c.full_name} ({c.cpf})</option>
                            ))}
                          </select>
                          <div className="flex gap-3">
                            <select 
                              value={novaReservaStatus} 
                              onChange={(e) => setNovaReservaStatus(e.target.value)}
                              disabled={(reservas.filter(r => r.status_pagamento === 'pago' || r.status_pagamento === 'pendente').length >= (selectedAgendaData?.max_capacity || 15))}
                              className="w-1/2 p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                            >
                              <option value="pago">PAGO</option>
                              <option value="pendente">PENDENTE</option>
                            </select>
                            <button 
                              type="submit" 
                              disabled={(reservas.filter(r => r.status_pagamento === 'pago' || r.status_pagamento === 'pendente').length >= (selectedAgendaData?.max_capacity || 15))}
                              className={\`w-1/2 font-bold rounded-xl shadow-sm transition \${(reservas.filter(r => r.status_pagamento === 'pago' || r.status_pagamento === 'pendente').length >= (selectedAgendaData?.max_capacity || 15)) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}\`}
                            >
                              Adicionar
                            </button>
                          </div>
                        </form>
                      </>
                    )}
                  </div>
                )}
`;

content = content.replace(/\{\/\* Tabela só para Impressão \*\/\}/, embarqueBlock + "\n\n                {/* Tabela só para Impressão */}");

// 8. Delete the old "mainTab === 'reservas'" block
content = content.replace(/\{\/\* --- VISÃO DE RESERVAS \(LISTA DE PASSAGEIROS\) --- \*\/\}[\s\S]*?\{\/\* --- VISÃO FINANCEIRA --- \*\/\}/, '{/* --- VISÃO FINANCEIRA --- */}');

// 9. Remove "Reservas" from Navigation bottom menu
content = content.replace(/<button[^>]+onClick=\{\(\) => setMainTab\('reservas'\)\}[^>]+>[\s\S]*?<\/button>/, '');

fs.writeFileSync('src/app/admin/page.tsx', content);
console.log('Script patched successfully (Fixed version).');
