const fs = require('fs');
const path = require('path');

// Helper function to convert HEX to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Read brand tokens
const brandTokensPath = path.join(__dirname, '../Brand/brand-tokens.json');
const brandTokens = JSON.parse(fs.readFileSync(brandTokensPath, 'utf8'));

// Convert colors to RGB format
const cssVariables = [];
for (const [key, value] of Object.entries(brandTokens.brand)) {
  const rgb = hexToRgb(value);
  if (rgb) {
    cssVariables.push(`  --brand-${key.toLowerCase()}: ${rgb.r} ${rgb.g} ${rgb.b};`);
  }
}

// Generate CSS content
const cssContent = `/* Auto-generated from brand-tokens.json */
:root {
${cssVariables.join('\n')}
}

/* Optional dark mode adjustments */
.dark {
  --brand-muted: 30 41 59;
  --brand-muted-foreground: 203 213 225;
}
`;

// Write to brand.css
const brandCssPath = path.join(__dirname, '../src/styles/brand.css');
fs.writeFileSync(brandCssPath, cssContent);

console.log('✅ Brand CSS variables generated successfully!');
console.log(`📁 Output: ${brandCssPath}`);
