const fs = require('fs');

const content = fs.readFileSync('vets.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  if (line.includes('map') || line.includes('Map') || line.includes('id=') || line.includes('id =')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
