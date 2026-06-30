const fs = require('fs');

let content = fs.readFileSync('src/app/cadastro/page.tsx', 'utf8');

// 1. Remove the extraPassengers state
content = content.replace(/const extraSpotsData:[\s\S]*?const hasExtraPassengers = extraPassengers\.length > 0;/g, 'const hasExtraPassengers = false;');

// 2. We don't have Step 5 anymore, it's back to 4 steps
content = content.replace(/const totalSteps = hasExtraPassengers \? 5 : 4;/g, 'const totalSteps = 4;');

// 3. Remove the extraPassengers UI step (step === 4 && hasExtraPassengers)
content = content.replace(/\{step === 4 && hasExtraPassengers && \([\s\S]*?<\/motion\.div>\s*\)\}\s*/, '');

// 4. In onSubmit, we need to use items.dependents instead of extraPassengers
const updatedSubmit = `
          // Extra Passengers spots from Cart Store
          for (const item of items) {
             if (item.dependents && item.dependents.length > 0) {
               for (const dep of item.dependents) {
                 if (dep.name && dep.cpf) {
                   let epId;
                   const { data: existingEp } = await supabase.from('clients').select('*').eq('cpf', dep.cpf).single();
                   if (existingEp) {
                      const { data: updatedEp } = await supabase.from('clients').update({ full_name: dep.name }).eq('id', existingEp.id).select();
                      epId = updatedEp![0].id;
                   } else {
                      const { data: insertedEp } = await supabase.from('clients').insert([{ full_name: dep.name, cpf: dep.cpf }]).select();
                      epId = insertedEp![0].id;
                   }
                   allReservationsToCreate.push({ client_id: epId, agenda_id: item.agendaId });
                 }
               }
             }
          }
`;

// Replace the old extraPassengers loop with the new items.dependents loop
content = content.replace(/\/\/ Extra Passengers spots[\s\S]*?allReservationsToCreate\.push\(\{ client_id: epId, agenda_id: ep\.agendaId \}\);\n          }/g, updatedSubmit.trim());

fs.writeFileSync('src/app/cadastro/page.tsx', content);
console.log('Script concluded.');
