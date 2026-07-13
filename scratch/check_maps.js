const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\NITHIN S SHETTY\\.gemini\\antigravity\\scratch\\pawtrace';
const files = fs.readdirSync(srcDir);

files.forEach(file => {
  if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css')) {
    const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
    const hasLeaflet = content.toLowerCase().includes('leaflet') || content.toLowerCase().includes('l.map');
    const hasGoogleMaps = content.toLowerCase().includes('google.com/maps') || content.toLowerCase().includes('maps.google.com') || content.toLowerCase().includes('google maps');
    if (hasLeaflet || hasGoogleMaps) {
      console.log(`${file}: Leaflet = ${hasLeaflet}, GoogleMaps = ${hasGoogleMaps}`);
    }
  }
});
