const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\NITHIN S SHETTY\\.gemini\\antigravity\\brain\\070bd493-edb6-4f37-a724-6539b2cc9214';

const files = fs.readdirSync(dir);
const match = files.find(f => f.toLowerCase().includes('rules'));
if (match) {
  const full = path.join(dir, match);
  console.log('Found file:', full);
  console.log(fs.readFileSync(full, 'utf8'));
} else {
  console.log('No file containing "rules" found in artifacts.');
}
