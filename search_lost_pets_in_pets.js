const fs = require('fs');

const content = fs.readFileSync('pets.js', 'utf8');
const lines = content.split('\n');

let printing = false;
let braces = 0;

lines.forEach((line, i) => {
  if (line.includes('export function renderLostPets') || line.includes('export async function renderLostPets')) {
    printing = true;
  }
  if (printing) {
    console.log(`${i+1}: ${line}`);
    for (let char of line) {
      if (char === '{') braces++;
      if (char === '}') braces--;
    }
    if (braces === 0 && line.includes('}')) {
      printing = false;
    }
  }
});
