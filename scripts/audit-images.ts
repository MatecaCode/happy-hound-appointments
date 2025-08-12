import fs from 'fs';
import path from 'path';

interface ImageAuditItem {
  path: string;
  component: string;
  usage: string;
  type: 'img' | 'Image' | 'background' | 'svg';
  src?: string;
  alt?: string;
}

interface ImageAudit {
  timestamp: string;
  totalImages: number;
  images: ImageAuditItem[];
}

function findImagesInDirectory(dir: string, baseDir: string): ImageAuditItem[] {
  const items: ImageAuditItem[] = [];
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other build directories
        if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
          items.push(...findImagesInDirectory(fullPath, baseDir));
        }
      } else if (file.match(/\.(tsx?|jsx?|css)$/)) {
        // Analyze source files
        const relativePath = path.relative(baseDir, fullPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Find img tags
        const imgMatches = content.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/g);
        for (const match of imgMatches) {
          const imgTag = match[0];
          const src = match[1];
          const altMatch = imgTag.match(/alt=["']([^"']*)["']/);
          const alt = altMatch ? altMatch[1] : '';
          
          items.push({
            path: relativePath,
            component: file,
            usage: 'img tag',
            type: 'img',
            src,
            alt
          });
        }
        
        // Find Image components (React)
        const imageMatches = content.matchAll(/<Image[^>]*src=["']([^"']+)["'][^>]*>/g);
        for (const match of imageMatches) {
          const imageTag = match[0];
          const src = match[1];
          const altMatch = imageTag.match(/alt=["']([^"']*)["']/);
          const alt = altMatch ? altMatch[1] : '';
          
          items.push({
            path: relativePath,
            component: file,
            usage: 'Image component',
            type: 'Image',
            src,
            alt
          });
        }
        
        // Find background images in CSS/TSX
        const bgMatches = content.matchAll(/background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/g);
        for (const match of bgMatches) {
          const src = match[1];
          
          items.push({
            path: relativePath,
            component: file,
            usage: 'background image',
            type: 'background',
            src
          });
        }
        
        // Find inline SVGs
        const svgMatches = content.matchAll(/<svg[^>]*>[\s\S]*?<\/svg>/g);
        for (const match of svgMatches) {
          const svgContent = match[0];
          
          items.push({
            path: relativePath,
            component: file,
            usage: 'inline SVG',
            type: 'svg',
            src: 'inline'
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return items;
}

function generateAuditReport(): ImageAudit {
  const baseDir = path.resolve(process.cwd());
  const srcDir = path.join(baseDir, 'src');
  
  console.log('🔍 Scanning for images in:', srcDir);
  
  const images = findImagesInDirectory(srcDir, baseDir);
  
  const audit: ImageAudit = {
    timestamp: new Date().toISOString(),
    totalImages: images.length,
    images: images.sort((a, b) => a.path.localeCompare(b.path))
  };
  
  return audit;
}

// Generate and save the audit
const audit = generateAuditReport();

// Create Brand directory if it doesn't exist
const brandDir = path.join(process.cwd(), 'Brand');
if (!fs.existsSync(brandDir)) {
  fs.mkdirSync(brandDir, { recursive: true });
}

// Save the audit report
const auditPath = path.join(brandDir, 'image-audit.json');
fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2));

console.log('✅ Image audit completed!');
console.log(`📊 Found ${audit.totalImages} images`);
console.log(`📁 Report saved to: ${auditPath}`);

// Print summary by type
const typeCounts = audit.images.reduce((acc, img) => {
  acc[img.type] = (acc[img.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('\n📈 Summary by type:');
Object.entries(typeCounts).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Print first few items as preview
console.log('\n🔍 Sample images found:');
audit.images.slice(0, 5).forEach(img => {
  console.log(`  ${img.path} (${img.component}) - ${img.usage}`);
  if (img.src && img.src !== 'inline') {
    console.log(`    src: ${img.src}`);
  }
  if (img.alt) {
    console.log(`    alt: "${img.alt}"`);
  }
});

if (audit.images.length > 5) {
  console.log(`  ... and ${audit.images.length - 5} more`);
}
