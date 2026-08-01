// Automated check: JSON-LD FAQPage question count must match visible FAQ_ITEMS count, per page.
// Run before every deploy: node research/check-faq-sync.js
const fs = require('fs');
const path = require('path');

const PAGES = ['index.html', 'brutto-netto/index.html', 'steuern/index.html', 'netto/index.html',
  'tabelle/index.html', 'drv-vergleich/index.html', 'rente-mit-63/index.html', 'betriebsrente/index.html',
  'rentenpunkte/index.html', 'fruehrente/index.html', 'rentenluecke/index.html'];

let failed = false;

PAGES.forEach(rel => {
  const file = path.join(__dirname, '..', rel);
  if (!fs.existsSync(file)) { console.log(`SKIP: ${rel} (not built yet)`); return; }
  const html = fs.readFileSync(file, 'utf8');

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!jsonLdMatch) { console.error(`FAIL ${rel}: no JSON-LD script block found`); failed = true; return; }
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  const faqNode = (jsonLd['@graph'] || []).find(n => n['@type'] === 'FAQPage') || (jsonLd['@type'] === 'FAQPage' ? jsonLd : null);
  if (!faqNode) { console.log(`SKIP ${rel}: no FAQPage node (page may not need one)`); return; }
  const jsonLdCount = faqNode.mainEntity.length;

  const faqItemsMatch = html.match(/const FAQ_ITEMS = (\[[\s\S]*?\]);/);
  if (!faqItemsMatch) { console.error(`FAIL ${rel}: no FAQ_ITEMS array found in <script>`); failed = true; return; }
  const faqItems = eval(faqItemsMatch[1]);
  const visibleCount = faqItems.length;

  if (jsonLdCount !== visibleCount) {
    console.error(`FAIL ${rel}: FAQ count mismatch — JSON-LD has ${jsonLdCount}, visible FAQ_ITEMS has ${visibleCount}`);
    failed = true; return;
  }

  let mismatches = 0;
  faqNode.mainEntity.forEach((q, i) => {
    if (!faqItems[i] || faqItems[i][0] !== q.name) {
      console.error(`FAIL ${rel}: question ${i} text mismatch — JSON-LD: "${q.name}" vs visible: "${faqItems[i] ? faqItems[i][0] : '(missing)'}"`);
      mismatches++;
    }
  });
  if (mismatches > 0) { failed = true; return; }

  console.log(`PASS ${rel}: ${jsonLdCount} FAQ questions in sync.`);
});

if (failed) process.exit(1);
