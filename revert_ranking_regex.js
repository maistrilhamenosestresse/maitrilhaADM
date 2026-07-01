const fs = require('fs');
const path = 'src/app/admin/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /\/\* Ranking dos Top Clientes \*\/\s*\{\(\(\) => \{[\s\S]*?\}\)\(\)\}/;

const newBlock = `/* Ranking dos Top Clientes */
                              {(() => {
                                const clientRanking = allReservas.reduce((acc, curr) => {
                                  if (curr.status_pagamento === 'pago' && curr.clients) {
                                    if (!acc[curr.client_id]) {
                                      acc[curr.client_id] = { name: curr.clients.full_name, count: 0 };
                                    }
                                    acc[curr.client_id].count += 1;
                                  }
                                  return acc;
                                }, {} as Record<string, { name: string, count: number }>);
                                
                                const topClients = Object.values(clientRanking)
                                  .sort((a: any, b: any) => b.count - a.count)
                                  .slice(0, 10);
                                  
                                if (topClients.length === 0) return null;

                                return (
                                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mt-4 print:hidden">
                                    <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
                                      <Users className="h-5 w-5 text-[#F17B37]" /> Ranking Top Trilheiros
                                    </h4>
                                    <div className="space-y-2">
                                      {topClients.map((client: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#1D2A3A] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-md">
                                              #{index + 1}
                                            </div>
                                            <div>
                                              <p className="text-sm font-bold text-gray-900">{client.name}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 bg-orange-100 text-[#F17B37] px-3 py-1 rounded-lg border border-orange-200">
                                            <span className="text-sm font-black">{client.count}</span>
                                            <span className="text-[10px] font-bold uppercase">Trilhas</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}`;

if (regex.test(content)) {
  content = content.replace(regex, newBlock);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully replaced block with regex.");
} else {
  console.error("Block not found by regex!");
  process.exit(1);
}
