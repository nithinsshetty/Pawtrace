const fs = require('fs');

const content = fs.readFileSync('vet-portal.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  if (line.includes('access') || line.includes('Access') || line.includes('Profile') || line.includes('profile')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
