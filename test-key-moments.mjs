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

console.log('Significant moments:', significantMoments);

const latestMoment = significantMoments[significantMoments.length - 1];
console.log('Latest moment:', latestMoment);

// Try the new pattern
const momentMatch = latestMoment.match(/([⚽⚽️🟥🟨]) ([A-Z]+) by (.+) at (\d+)'/);
console.log('New pattern match:', momentMatch);

// Try the fallback pattern
const fallbackMatch = latestMoment.match(/([⚽⚽️🟥🟨]) (\d+)' (.+)/);
console.log('Fallback pattern match:', fallbackMatch);
