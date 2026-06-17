const fs = require('fs');
const visits = JSON.parse(fs.readFileSync('visits.json', 'utf8'));

function startOfDay(ts) {
  const CAIRO_OFFSET = 3 * 60 * 60 * 1000;
  const cairoTime = ts + CAIRO_OFFSET;
  const daysSinceEpoch = Math.floor(cairoTime / (24 * 60 * 60 * 1000));
  return daysSinceEpoch * 24 * 60 * 60 * 1000 - CAIRO_OFFSET;
}

const todayStart = startOfDay(Date.now());
const todayEnd = todayStart + 86400000;

const doctorId = "jh7ayjjh72tv6xytfzfkkf85bx8735qs";

const active = visits.filter(v => 
  v.doctorId === doctorId &&
  v.date >= todayStart && v.date < todayEnd &&
  v.status === 'completed'
).sort((a,b) => a.date - b.date);

console.log(active.map(v => ({ name: v.patientName, date: new Date(v.date).toISOString(), status: v.status })));
