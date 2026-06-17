const fs = require('fs');
const logs = JSON.parse(fs.readFileSync('logs_out.json', 'utf8'));
const failed = logs.filter(l => l.status === 'failed');
console.log(failed);
