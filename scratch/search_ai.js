const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\NITHIN S SHETTY\\.gemini\\antigravity\\scratch\\pawtrace\\portfolio.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('AI') || line.includes('ai') || line.includes('Ai')) {
    console.log(`${index + 1}: ${line}`);
  }
});
