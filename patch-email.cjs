const fs = require('fs');
let code = fs.readFileSync('src/app/api/send-email/route.ts', 'utf8');

code = code.replace(/\\\`/g, '`');
code = code.replace(/\\\$\\{/g, '${');

fs.writeFileSync('src/app/api/send-email/route.ts', code);
console.log('Fixed escaping!');
