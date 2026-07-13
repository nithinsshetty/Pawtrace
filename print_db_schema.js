const fs = require('fs');
const file = 'C:\\Users\\NITHIN S SHETTY\\.gemini\\antigravity\\brain\\070bd493-edb6-4f37-a724-6539b2cc9214\\database_schema_document.md';

if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  console.log(content.substring(0, 5000));
} else {
  console.log('File does not exist.');
}
