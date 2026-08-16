// Generates one page per Geburtsjahr (birth-year cohort), 1947-1963 individually + one
// "ab 1964" combined page (formulas plateau at 67/65 from 1964 on, no further per-year variation).
// Formulas copied verbatim from tabelle/index.html's client-side script — keep both in sync if
// the underlying §§35/235/38 SGB VI values ever change (same maintenance note as that page).
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://rentenrechner-deutschland.com';
const SOURCE_DATE = '1. August 2026';

function normAge(baseJahre, monate) { return { jahre: baseJahre + Math.floor(monate / 12), monate: monate % 12 }; }
function regelaltersgrenze(geburtsjahr) {
  if (geburtsjahr <= 1946) return { jahre: 65, monate: 0 };
  if (geburtsjahr <= 1958) { const m = geburtsjahr - 1947 + 1; return normAge(65, m); }
  if (geburtsjahr <= 1963) { const m = 12 + (geburtsjahr - 1958) * 2; return normAge(65, m); }
  return { jahre: 67, monate: 0 };
}
function rente63Alter(geburtsjahr) {
  if (geburtsjahr <= 1952) return { jahre: 63, monate: 0 };
  if (geburtsjahr <= 1957) { const m = (geburtsjahr - 1952) * 2; return normAge(63, m); }
  if (geburtsjahr <= 1963) { const m = 12 + (geburtsjahr - 1958) * 2; return normAge(63, m); }
  return { jahre: 65, monate: 0 };
}
function fmtAge(a) { return a.monate === 0 ? `${a.jahre} Jahre` : `${a.jahre} Jahre und ${a.monate} Monate`; }

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --brand: #1a1a1a; --brand-dark: #000; --brand-light: #fef3d5; --gold: #ffce00; --red: #dd0000; --text: #111827; --muted: #6b7280; --border: #e5e7eb; --bg: #f8fafc; --radius: 12px; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--text); background: var(--bg); font-size: 16px; line-height: 1.65; }
  header { background: linear-gradient(135deg, var(--brand-dark) 0%, var(--brand) 60%, var(--red) 100%); color: white; padding: 44px 20px; text-align: center; }
  header a.back { color: white; display: block; margin-bottom: 10px; }
  header h1 { font-size: clamp(1.3rem, 4vw, 1.9rem); font-weight: 800; margin-bottom: 10px; }
  header p { color: rgba(255,255,255,.9); font-size: 0.98rem; max-width: 600px; margin: 0 auto; }
  .container { max-width: 780px; margin: 0 auto; padding: 30px 20px 40px; }
  h2 { font-size: 1.3rem; color: var(--brand-dark); margin: 32px 0 12px; }
  h2:first-child { margin-top: 0; }
  p { margin-bottom: 12px; }
  .hero-numbers { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 20px 0; }
  @media (max-width: 480px) { .hero-numbers { grid-template-columns: 1fr; } }
  .num-box { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; text-align: center; }
  .num-box .label { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
  .num-box .value { font-size: 1.5rem; font-weight: 800; color: var(--brand-dark); }
  table.rate-table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 0.92rem; }
  table.rate-table th, table.rate-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; }
  table.rate-table th { background: #f3f4f6; font-weight: 700; }
  .table-wrap { overflow-x: auto; background: white; border-radius: var(--radius); border: 1px solid var(--border); padding: 4px 16px; }
  .faq-item { border-bottom: 1px solid var(--border); padding: 14px 0; }
  .faq-item summary { cursor: pointer; font-weight: 700; color: var(--brand-dark); list-style: none; }
  .faq-item summary::-webkit-details-marker { display: none; }
  .faq-item summary::before { content: "+ "; color: var(--gold); font-weight: 900; }
  .faq-item[open] summary::before { content: "− "; }
  .faq-item p { margin-top: 10px; color: var(--muted); }
  .related-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(180px,1fr)); gap: 10px; margin: 14px 0; }
  .related-grid a { display: block; background: white; border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; text-decoration: none; color: var(--brand-dark); font-weight: 600; font-size: 0.9rem; }
  footer { text-align: center; padding: 30px 20px 50px; color: var(--muted); font-size: 0.85rem; }
  footer a { color: var(--brand-dark); }
  .source-note { font-size: 0.85rem; color: var(--muted); margin-top: 8px; }
`;

function page({ slug, title, metaDesc, h1, intro, geburtsjahrLabel, regel, rente63, bodyExtra, faqs }) {
  const canonical = `${DOMAIN}/${slug}/`;
  const faqJsonLd = faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }));
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${metaDesc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${metaDesc}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="de_DE">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: h1, dateModified: '2026-08-16', author: { '@type': 'Organization', name: 'Gesmine-Invest Limited' }, publisher: { '@type': 'Organization', name: 'Gesmine-Invest Limited' } },
    { '@type': 'FAQPage', mainEntity: faqJsonLd },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: DOMAIN + '/' },
      { '@type': 'ListItem', position: 2, name: 'Tabelle', item: DOMAIN + '/tabelle/' },
      { '@type': 'ListItem', position: 3, name: h1, item: canonical }
    ]}
  ]
}, null, 2)}
</script>
<style>${CSS}</style>
</head>
<body>

<header>
  <a class="back" href="/tabelle/">← Zurück zur Tabelle</a>
  <h1>${h1}</h1>
  <p>${intro}</p>
</header>

<div class="container">

  <div class="hero-numbers">
    <div class="num-box"><div class="label">Regelaltersgrenze</div><div class="value">${fmtAge(regel)}</div></div>
    <div class="num-box"><div class="label">Rente mit 63 (45 Beitragsjahre)</div><div class="value">${fmtAge(rente63)}</div></div>
  </div>

  ${bodyExtra}

  <h2>Häufige Fragen</h2>
  <div id="faq-container">
    ${faqs.map(([q, a]) => `<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`).join('\n    ')}
  </div>

  <h2>Weitere Rentenrechner in diesem Cluster</h2>
  <div class="related-grid">
    <a href="/tabelle/">Vollständige Tabelle</a>
    <a href="/rente-mit-63/">Rente mit 63</a>
    <a href="/rentenpunkte/">Rentenpunkte-Rechner</a>
    <a href="/brutto-netto/">Brutto-Netto-Rechner</a>
  </div>

  <p class="source-note">Quelle: Deutsche Rentenversicherung, §§ 35/235/38 SGB VI. Geprüft ${SOURCE_DATE} — siehe <a href="/about/">Methodik</a>. Unverbindliche Übersicht, keine Rechtsberatung.</p>

</div>

<footer>
  <nav><a href="/about/">Über uns</a> · <a href="/impressum/">Impressum</a> · <a href="/privacy/">Datenschutz</a></nav>
  <p>© 2026 Gesmine-Invest Limited. Unverbindliche Übersicht — keine Rechtsberatung.</p>
</footer>

</body>
</html>`;
}

const PAGES = [];

for (let y = 1947; y <= 1963; y++) {
  const regel = regelaltersgrenze(y);
  const rente63 = rente63Alter(y);
  PAGES.push({
    slug: `geburtsjahr-${y}-rente`,
    title: `Rente ab Geburtsjahr ${y} — Regelaltersgrenze & Rente mit 63`,
    metaDesc: `Geburtsjahr ${y}: Regelaltersgrenze ${fmtAge(regel)}, abschlagsfreie Rente mit 63 (45 Beitragsjahre) ab ${fmtAge(rente63)}. Offizielle Werte nach §§ 35/235 SGB VI.`,
    h1: `Rente ab Geburtsjahr ${y}`,
    intro: `Regelaltersgrenze und frühestmögliches abschlagsfreies Rentenalter für den Jahrgang ${y}.`,
    geburtsjahrLabel: y,
    regel, rente63,
    bodyExtra: `
    <h2>Was bedeutet das für den Jahrgang ${y}?</h2>
    <p>Wer ${y} geboren ist, erreicht die <strong>Regelaltersgrenze</strong> (frühestmöglicher Rentenbeginn ohne besondere Vorbedingungen) mit <strong>${fmtAge(regel)}</strong>. Bei mindestens 45 Beitragsjahren ist ein abschlagsfreier Rentenbeginn schon mit <strong>${fmtAge(rente63)}</strong> möglich ("Rente mit 63" für besonders langjährig Versicherte, § 38 SGB VI).</p>`,
    faqs: [
      [`Mit welchem Alter kann ich als Jahrgang ${y} regulär in Rente gehen?`, `Die Regelaltersgrenze für den Geburtsjahrgang ${y} liegt bei ${fmtAge(regel)}. Das ist das früheste Alter für die reguläre Altersrente ohne Abschläge und ohne besondere Vorbedingungen wie eine Mindestversicherungszeit von 45 Jahren.`],
      [`Kann ich als Jahrgang ${y} schon mit 63 abschlagsfrei in Rente?`, `Ja, wenn mindestens 45 Beitragsjahre vorliegen (Rente für besonders langjährig Versicherte, § 38 SGB VI) — für den Jahrgang ${y} liegt dieses abschlagsfreie Alter bei ${fmtAge(rente63)}. Ohne die 45 Beitragsjahre gilt stattdessen die reguläre Regelaltersgrenze von ${fmtAge(regel)}, ggf. mit Abschlägen bei früherem Beginn.`],
      [`Ist dieser Wert für Ost- und Westdeutschland gleich?`, `Ja. Die Regelaltersgrenze selbst war nie nach Ost/West unterschieden — nur der aktuelle Rentenwert (Rentenwert Ost/West) war es, bis zur vollständigen Angleichung zum 1. Juli 2023. Seitdem gilt bundesweit ein einheitlicher Rentenwert.`]
    ]
  });
}

// Combined "ab 1964" page — formulas plateau from here on, matches how the existing tabelle/
// page already labels this row, no further per-year variation to justify separate pages.
{
  const regel = regelaltersgrenze(1964);
  const rente63 = rente63Alter(1964);
  PAGES.push({
    slug: 'geburtsjahr-ab-1964-rente',
    title: 'Rente ab Geburtsjahr 1964 — Regelaltersgrenze & Rente mit 63',
    metaDesc: `Geburtsjahr 1964 und später: Regelaltersgrenze ${fmtAge(regel)}, abschlagsfreie Rente mit 63 (45 Beitragsjahre) ab ${fmtAge(rente63)} — endgültige Werte, keine weitere Anhebung mehr geplant.`,
    h1: 'Rente ab Geburtsjahr 1964 (und später)',
    intro: `Für alle Jahrgänge ab 1964 gelten die gleichen, endgültigen Altersgrenzen — die schrittweise Anhebung seit der Rentenreform 2007 ist mit diesem Jahrgang abgeschlossen.`,
    geburtsjahrLabel: 'ab 1964',
    regel, rente63,
    bodyExtra: `
    <h2>Warum steigen die Werte ab hier nicht mehr?</h2>
    <p>Die schrittweise Anhebung der Regelaltersgrenze von 65 auf 67 Jahre (Rentenreform 2007) betraf ausschließlich die Geburtsjahrgänge 1947 bis 1963. Ab dem Jahrgang 1964 ist die Anhebung abgeschlossen: Die Regelaltersgrenze bleibt bei <strong>${fmtAge(regel)}</strong>, die abschlagsfreie Rente mit 63 (45 Beitragsjahre) bei <strong>${fmtAge(rente63)}</strong> — sofern der Gesetzgeber keine neue Reform beschließt.</p>`,
    faqs: [
      [`Steigt die Regelaltersgrenze für Jahrgang 1964 und später noch weiter?`, `Nach aktueller Gesetzeslage nicht — die Anhebung von 65 auf 67 Jahre wurde mit dem Jahrgang 1964 abgeschlossen (${fmtAge(regel)}). Eine weitere Anhebung würde eine neue gesetzliche Reform voraussetzen, die aktuell nicht beschlossen ist.`],
      [`Gilt "Rente mit 63" auch noch für spätere Jahrgänge?`, `Ja, aber das abschlagsfreie Alter liegt für Jahrgang 1964 und später bei ${fmtAge(rente63)}, nicht mehr bei 63 Jahren selbst — der Name "Rente mit 63" bezieht sich auf die ursprüngliche Regelung für ältere Jahrgänge und wird umgangssprachlich weiter für diese Rentenart verwendet.`],
      [`Was, wenn ich später als 1964 geboren bin — ändert sich für mich noch etwas?`, `Nein, für alle Jahrgänge 1964 und später gelten dieselben Werte wie auf dieser Seite, da die Anhebung mit diesem Jahrgang endgültig abgeschlossen ist.`]
    ]
  });
}

for (const p of PAGES) {
  const dir = path.join(__dirname, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(p));
  console.log('✓', p.slug + '/index.html');
}

console.log(`\nGenerated ${PAGES.length} birth-cohort pages.`);
