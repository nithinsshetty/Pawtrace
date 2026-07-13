const fs = require('fs');

const content = fs.readFileSync('style.css', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  if (line.includes('map') || line.includes('Map') || line.includes('vet-')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
