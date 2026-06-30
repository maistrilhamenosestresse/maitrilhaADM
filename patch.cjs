const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

code = code.replace(
  '{filteredClients.map(client => (',
  `{filteredClients.map(client => {
  const today = new Date();
  let isBirthdayClient = false;
  if (client.birth_date) {
    const bDate = new Date(client.birth_date);
    bDate.setFullYear(today.getFullYear());
    if (bDate < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) {
      bDate.setFullYear(today.getFullYear() + 1);
    }
    const diffTime = Math.abs(bDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isBirthdayClient = diffDays <= 1;
  }
  return (`
);

code = code.replace(
  '                           </div>\r\n                        ))}',
  '                           </div>\r\n                        );})}'
);
code = code.replace(
  '                           </div>\n                        ))}',
  '                           </div>\n                        );})}'
);

code = code.replace(
  `shadow-sm \${expandedClientId === client.id ? 'border-[#F17B37] ring-1 ring-[#F17B37]/20' : 'border-gray-200'}\`>`,
  `shadow-sm \${expandedClientId === client.id ? 'border-[#F17B37] ring-1 ring-[#F17B37]/20' : (isBirthdayClient ? 'border-yellow-300 shadow-[0_0_15px_rgba(252,211,77,0.4)]' : 'border-gray-200')}\`>`
);

code = code.replace(
  `className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"`,
  `className={\`p-4 flex items-center justify-between cursor-pointer \${isBirthdayClient ? 'bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100' : 'hover:bg-gray-50'}\`}`
);

code = code.replace(
  `{client.full_name}</h4>`,
  `{client.full_name} {isBirthdayClient && <span className="text-xl animate-bounce" title="Aniversariante!">🎁</span>}</h4>`
);

fs.writeFileSync('src/app/admin/page.tsx', code);
console.log('patched successfully');
