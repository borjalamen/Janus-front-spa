/**
 * upload-assets-to-backend.mjs
 * Sube los documentos de assets/documents al backend de JanusHub
 * Uso: node scripts/upload-assets-to-backend.mjs [apiBase] [uploadedBy]
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { Blob } from 'buffer';

const __dir = dirname(fileURLToPath(import.meta.url));
const apiBase   = process.argv[2] ?? 'http://localhost:8080/api';
const uploadedBy = process.argv[3] ?? 'admin';
const endpoint  = `${apiBase}/recursos-descargables`;
const assetsDir = join(__dir, '..', 'src', 'assets', 'documents');
const indexFile = join(assetsDir, 'index.json');

if (!existsSync(indexFile)) {
  console.error('No se encontro index.json en', assetsDir);
  process.exit(1);
}

const index = JSON.parse(readFileSync(indexFile, 'utf8'));

const categoryMap = {
  '.pdf':  'PDF',
  '.doc':  'Word',
  '.docx': 'Word',
  '.xlsx': 'Excel',
  '.xls':  'Excel',
  '.csv':  'CSV',
  '.txt':  'Texto',
};

// Check backend
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

let uploaded = 0, skipped = 0;

for (const doc of index) {
  const filePath = join(assetsDir, doc.path);
  if (!existsSync(filePath)) {
    console.log(`  SKIP (no encontrado): ${doc.path}`);
    skipped++;
    continue;
  }

  const alreadyUploaded = existing.find(e => e.fileName === doc.path);
  if (alreadyUploaded) {
    console.log(`  SKIP (ya subido):     ${doc.name}`);
    skipped++;
    continue;
  }

  const ext = extname(doc.path).toLowerCase();
  const category = categoryMap[ext] ?? 'General';
  const description = doc.description ?? doc.name;

  try {
    const fileBytes = readFileSync(filePath);
    const blob = new Blob([fileBytes]);
    const form = new FormData();
    form.set('file', blob, basename(doc.path));
    form.set('displayName', doc.name);
    form.set('description', description);
    form.set('category', category);
    form.set('uploadedBy', uploadedBy);

    const r = await fetch(endpoint, { method: 'POST', body: form });
    if (r.ok) {
      console.log(`  OK: ${doc.name}`);
      uploaded++;
    } else {
      const body = await r.text();
      console.error(`  ERROR HTTP ${r.status}: ${doc.name} - ${body}`);
    }
  } catch (e) {
    console.error(`  ERROR: ${doc.name} -`, e.message);
  }
}

console.log(`\nCompletado: ${uploaded} subidos, ${skipped} omitidos.`);
