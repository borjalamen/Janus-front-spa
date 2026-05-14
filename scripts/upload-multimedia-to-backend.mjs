/**
 * upload-multimedia-to-backend.mjs
 * Sube los ficheros de assets/multimedia al backend de JanusHub
 * Uso: node scripts/upload-multimedia-to-backend.mjs [apiBase] [uploadedBy]
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { Blob } from 'buffer';

const __dir    = dirname(fileURLToPath(import.meta.url));
const apiBase  = process.argv[2] ?? 'http://localhost:8080/api';
const uploadedBy = process.argv[3] ?? 'admin';
const endpoint   = `${apiBase}/media/videos`;
const assetsDir  = join(__dir, '..', 'src', 'assets', 'multimedia');
const manifestFile = join(assetsDir, 'manifest.json');

if (!existsSync(manifestFile)) {
  console.error('No se encontro manifest.json en', assetsDir);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));

// Verificar backend
let existing = [];
try {
  const r = await fetch(endpoint);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  existing = await r.json();
  console.log(`Backend disponible. Ya hay ${existing.length} recurso(s) registrados.`);
} catch (e) {
  console.error('Backend no disponible en', endpoint, '-', e.message);
  process.exit(1);
}

const categoryMap = {
  '.mp4':  'Video',
  '.webm': 'Video',
  '.mov':  'Video',
  '.avi':  'Video',
  '.mkv':  'Video',
  '.pdf':  'PDF',
  '.doc':  'Word',
  '.docx': 'Word',
  '.xlsx': 'Excel',
};

let uploaded = 0, skipped = 0;

for (const item of manifest) {
  // El campo 'file' puede ser "assets/multimedia/Nombre.mp4"
  const relativePath = item.file.replace(/^assets\/multimedia\//, '');
  const filePath = join(assetsDir, relativePath);

  if (!existsSync(filePath)) {
    console.log(`  SKIP (no encontrado): ${relativePath}`);
    skipped++;
    continue;
  }

  // Comprobar si ya existe (por título o por fileName)
  const alreadyUploaded = existing.find(e =>
    e.title === item.title || e.displayName === item.title || e.fileName === basename(relativePath)
  );
  if (alreadyUploaded) {
    console.log(`  SKIP (ya subido):     ${item.title}`);
    skipped++;
    continue;
  }

  const ext = extname(relativePath).toLowerCase();
  const category = categoryMap[ext] ?? 'General';

  try {
    const fileBytes = readFileSync(filePath);
    const blob = new Blob([fileBytes]);
    const form = new FormData();
    form.set('file', blob, basename(relativePath));
    form.set('displayName', item.title);
    form.set('description', item.description ?? '');
    form.set('category', category);
    if (item.duration) form.set('duration', item.duration);
    form.set('uploadedBy', uploadedBy);

    const r = await fetch(endpoint, { method: 'POST', body: form });
    if (r.ok) {
      console.log(`  OK: ${item.title}`);
      uploaded++;
    } else {
      const body = await r.text();
      console.error(`  ERROR HTTP ${r.status}: ${item.title} - ${body}`);
    }
  } catch (e) {
    console.error(`  ERROR: ${item.title} -`, e.message);
  }
}

console.log(`\nCompletado: ${uploaded} subidos, ${skipped} omitidos.`);
