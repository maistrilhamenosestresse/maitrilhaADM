const fs = require('fs');

let content = fs.readFileSync('src/app/cadastro/page.tsx', 'utf8');

// 1. Add imports
content = content.replace('import { Suspense } from "react";', `import { Suspense } from "react";\nimport { useCartStore } from "@/store/cartStore";\nimport { Users } from "lucide-react";`);

// 2. State setup inside CadastroContent
content = content.replace(`  const searchParams = useSearchParams();
  const agendaId = searchParams.get('agenda_id');`, `  const searchParams = useSearchParams();
  const agendaId = searchParams.get('agenda_id');
  const { items, clearCart } = useCartStore();

  const primaryAgendas = items.map(i => i.agendaId);
  const extraSpotsData = [];
  items.forEach(item => {
    for(let i=1; i < item.quantity; i++) {
      extraSpotsData.push({ agendaId: item.agendaId, title: item.title, full_name: "", cpf: "" });
    }
  });
  const [extraPassengers, setExtraPassengers] = useState(extraSpotsData);
  const hasExtraPassengers = extraPassengers.length > 0;
  
  // Update total steps
  const totalSteps = hasExtraPassengers ? 5 : 4;
`);

// 3. Update Stepper UI (from 4 to totalSteps)
content = content.replace(`{[1, 2, 3, 4].map((i) => (`, `{Array.from({ length: totalSteps }).map((_, idx) => idx + 1).map((i) => (`);

// 4. Modify handleNext logic for Step 4 (if has extra passengers, go to 5, else submit)
// Actually, step 4 is Termos e Assinatura. We can insert Step 5 AFTER Step 1 (Quem é você) or Step 2 (Documentos).
// Let's make Extra Passengers be Step 4, and Termos e Assinatura be Step 5.
// Let's modify the JSX step numbers directly in the text.
content = content.replace(`{step === 4 && (`, `{step === (hasExtraPassengers ? 5 : 4) && (`);

// Insert Step 4 (Extra Passengers)
const extraPassengersStep = `
            {step === 4 && hasExtraPassengers && (
              <motion.div 
                key="step4-extra"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold flex items-center justify-center gap-2"><Users className="text-[#F17B37]" /> Acompanhantes</h2>
                  <p className="text-sm text-[#F17B37] mt-2 font-bold">Aviso Importante</p>
                  <p className="text-gray-400 text-xs mt-1">Por gentileza, informe o restante das pessoas da viagem para entrarem no site depois e finalizarem o cadastro.</p>
                </div>

                <div className="space-y-6 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                  {extraPassengers.map((ep, idx) => (
                    <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <p className="text-xs font-bold text-[#F17B37] uppercase mb-3">Vaga Extra {idx + 1} - {ep.title}</p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-300 mb-1">Nome Completo</label>
                          <input 
                            type="text" 
                            required
                            value={ep.full_name}
                            onChange={e => {
                              const newArr = [...extraPassengers];
                              newArr[idx].full_name = e.target.value;
                              setExtraPassengers(newArr);
                            }}
                            className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600 text-sm" 
                            placeholder="Nome do acompanhante"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-300 mb-1">CPF</label>
                          <input 
                            type="text" 
                            required
                            value={ep.cpf}
                            onChange={e => {
                              const newArr = [...extraPassengers];
                              newArr[idx].cpf = formatCPF(e.target.value);
                              setExtraPassengers(newArr);
                            }}
                            className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#F17B37] outline-none transition-all placeholder-gray-600 text-sm" 
                            placeholder="000.000.000-00"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={handlePrev} className="flex-none px-6 bg-white/5 text-gray-300 rounded-2xl font-bold hover:bg-white/10 transition">
                    Voltar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleNext}
                    disabled={extraPassengers.some(ep => !ep.full_name || ep.cpf.length < 14)}
                    className="flex-1 bg-white/10 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition disabled:opacity-50"
                  >
                    Continuar <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}
`;

content = content.replace(`{step === (hasExtraPassengers ? 5 : 4) && (`, extraPassengersStep + `\n            {step === (hasExtraPassengers ? 5 : 4) && (`);

// 5. Rewrite onSubmit logic
const newOnSubmit = `
        // 3. Criar Reserva se existir agendaId (Substituido por Carrinho)
        let reservaIds = [];
        let totalItemsPrice = 0;
        let checkoutTitle = "Trilhas (Combo)";

        if (items.length > 0 && savedClient) {
          // Calcula preco total
          totalItemsPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          if (items.length === 1) checkoutTitle = items[0].title;
          
          const allReservationsToCreate = [];
          
          // Primary buyer spots
          primaryAgendas.forEach(aId => {
             allReservationsToCreate.push({ client_id: savedClient.id, agenda_id: aId });
          });

          // Extra Passengers spots
          for (const ep of extraPassengers) {
             let epId;
             const { data: existingEp } = await supabase.from('clients').select('*').eq('cpf', ep.cpf).single();
             if (existingEp) {
                const { data: updatedEp } = await supabase.from('clients').update({ full_name: ep.full_name }).eq('id', existingEp.id).select();
                epId = updatedEp[0].id;
             } else {
                const { data: insertedEp } = await supabase.from('clients').insert([{ full_name: ep.full_name, cpf: ep.cpf }]).select();
                epId = insertedEp[0].id;
             }
             allReservationsToCreate.push({ client_id: epId, agenda_id: ep.agendaId });
          }

          const resReserva = await fetch('/api/create-reserva', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reservas: allReservationsToCreate
            })
          });
          
          if (!resReserva.ok) {
            const errData = await resReserva.json();
            throw new Error(errData.error || 'Erro ao criar reservas');
          }
          
          const reservaJson = await resReserva.json();
          reservaIds = reservaJson.reservas.map(r => r.id);
        } else if (agendaId && savedClient) {
          // Fallback if accessed via direct URL instead of cart
          const resReserva = await fetch('/api/create-reserva', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reservas: [{ client_id: savedClient.id, agenda_id: agendaId }]
            })
          });
          const reservaJson = await resReserva.json();
          reservaIds = reservaJson.reservas.map(r => r.id);
          totalItemsPrice = agenda?.price || 0;
          checkoutTitle = agenda?.title || 'Trilha';
        }

      // 4. Send Email Notification
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_registration', client: savedClient })
      }).catch(err => console.error("Erro ignorado de email", err));

      // 5. Pagamento via InfinitePay
      if (reservaIds.length > 0) {
        try {
          const reqCheckout = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reserva_ids: reservaIds,
              agenda_title: checkoutTitle,
              price: totalItemsPrice,
              customer: {
                name: savedClient.full_name,
                email: savedClient.email,
                phone_number: savedClient.phone
              }
            })
          });
          const resCheckout = await reqCheckout.json();
          
          if (resCheckout.url) {
            clearCart();
            window.location.href = resCheckout.url; // Redireciona para pagar
            return;
          }
        } catch (e) {
          console.error("Erro ao gerar link InfinitePay", e);
        }
      }
`;

content = content.replace(/\/\/ 3\. Criar Reserva se existir agendaId[\s\S]*?(?=\/\/ Se não tiver pagamento online ou falhar)/, newOnSubmit + "\n      ");

fs.writeFileSync('src/app/cadastro/page.tsx', content);
console.log('Script concluded.');
