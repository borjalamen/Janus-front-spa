const fs = require('fs');
const path = require('path');
const text = fs.readFileSync(path.join(__dirname, '_pdf_text_out.txt'), 'utf8');
const lines = text.split('\n');

const quotes = [];
let inQuote = false;
let accum = '';

for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();

  if (!inQuote) {
    const hasOpenCurly = l.includes('\u201c');
    const hasOpenStraight = l.startsWith('"') && l.length > 5;
    if (hasOpenCurly || hasOpenStraight) {
      inQuote = true;
      accum = l;
    }
  } else {
    accum += ' ' + l;
  }

  if (inQuote) {
    const hasCloseCurly = accum.includes('\u201d');
    const hasCloseStraight = accum.startsWith('"') && accum.lastIndexOf('"') > 1;
    if (hasCloseCurly || hasCloseStraight) {
      const cleaned = accum
        .replace(/\u201c/g, '')
        .replace(/\u201d/g, '')
        .replace(/^"+|"+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length > 20) {
        quotes.push(cleaned);
      }
      inQuote = false;
      accum = '';
    }
  }
}

quotes.forEach((q, i) => console.log((i + 1) + '. ' + q));



