const fs = require('fs');
const logs = JSON.parse(fs.readFileSync('logs_out.json', 'utf8'));
const nextMsg = logs.find(l => l.messageText.includes('دورك القادم الآن'));
console.log(nextMsg);
