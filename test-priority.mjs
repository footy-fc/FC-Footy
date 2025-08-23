const keyMoments = [
  "⚽️ WHU by Lucas Paquetá at 6'",
  "⚽️ CHE by João Pedro at 15'",
  "⚽️ CHE by Pedro Neto at 23'",
  "⚽️ CHE by Enzo Fernández at 34'",
  "⚽️ CHE by Moisés Caicedo at 54'",
  "⚽️ CHE by Trevoh Chalobah at 58'",
  "🟨 CHE by Jorrel Hato at 87'"
];

const significantMoments = keyMoments.filter(moment => 
  moment.includes('⚽') || moment.includes('⚽️') || moment.includes('🟥') || moment.includes('🟨')
);

const goals = significantMoments.filter(moment => moment.includes('⚽') || moment.includes('⚽️'));
const latestMoment = goals.length > 0 ? goals[goals.length - 1] : significantMoments[significantMoments.length - 1];

console.log('All significant moments:', significantMoments);
console.log('Goals only:', goals);
console.log('Selected moment:', latestMoment);

const momentMatch = latestMoment.match(/([⚽⚽️🟥🟨]) ([A-Z]+) by (.+) at (\d+)'/);
console.log('Parsed result:', momentMatch);
