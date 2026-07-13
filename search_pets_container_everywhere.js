const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') {
        search(full);
      }
    } else {
      if (f.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('dashboard-pets-container')) {
          console.log('Found in:', full);
        }
      }
    }
  });
}

search('C:\\Users\\NITHIN S SHETTY\\.gemini\\antigravity\\scratch\\pawtrace');
