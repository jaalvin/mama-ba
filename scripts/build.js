const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 [Build] Starting Full-Stack Production Build...');

// 1. Build Backend TypeScript
console.log('📦 [1/3] Compiling Backend TypeScript (tsc)...');
execSync('npx tsc', { stdio: 'inherit' });

// 2. Build Frontend Vite React App
console.log('🎨 [2/3] Compiling Frontend Bundle (vite build)...');
execSync('npm --prefix frontend run build', { stdio: 'inherit' });

// 3. Copy frontend/dist to public/app
console.log('📂 [3/3] Syncing frontend build artifacts to public/app...');
const distDir = path.join(__dirname, '..', 'frontend', 'dist');
const targetDir = path.join(__dirname, '..', 'public', 'app');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

copyRecursiveSync(distDir, targetDir);

console.log('✨ [Build Complete] Production bundle ready in dist/ and public/app!');
