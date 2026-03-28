const https = require('https');
const fs = require('fs');

const USERNAME = process.env.GITHUB_USERNAME || 'Luisr-nunes';
const TOKEN = process.env.GITHUB_TOKEN;

function request(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'lang-stats-bot',
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        ...headers
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function getAllRepos() {
  let repos = [];
  let page = 1;
  while (true) {
    const batch = await request(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}&type=owner`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos = repos.concat(batch);
    page++;
  }
  return repos;
}

async function getLangs(repo) {
  try {
    return await request(`https://api.github.com/repos/${USERNAME}/${repo.name}/languages`);
  } catch {
    return {};
  }
}

// Cores por linguagem
const COLORS = {
  TypeScript: '#3178C6',
  JavaScript: '#F7DF1E',
  Python: '#3776AB',
  CSS: '#563D7C',
  HTML: '#E34F26',
  Java: '#ED8B00',
  'C++': '#00599C',
  C: '#A8B9CC',
  Shell: '#89E051',
  Portugol: '#FFD700',
  Kotlin: '#A97BFF',
  Rust: '#DEA584',
  Go: '#00ADD8',
  Ruby: '#CC342D',
  Swift: '#FA7343',
  Dart: '#0175C2',
  PHP: '#777BB4',
  default: '#8B949E'
};

function getColor(lang) {
  return COLORS[lang] || COLORS.default;
}

function generateSVG(langData) {
  const total = Object.values(langData).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(langData)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, bytes]) => ({
      lang,
      bytes,
      pct: ((bytes / total) * 100).toFixed(2)
    }));

  const WIDTH = 820;
  const PADDING = 24;
  const BAR_HEIGHT = 10;
  const ROW_HEIGHT = 28;
  const COLS = 2;
  const COL_WIDTH = (WIDTH - PADDING * 2) / COLS;
  const ROWS = Math.ceil(sorted.length / COLS);
  const LEGEND_Y = PADDING + BAR_HEIGHT + 24;
  const HEIGHT = LEGEND_Y + ROWS * ROW_HEIGHT + PADDING;

  // Barra de progresso
  let barX = PADDING;
  const barSegments = sorted.map(({ lang, pct }) => {
    const w = ((parseFloat(pct) / 100) * (WIDTH - PADDING * 2));
    const seg = `<rect x="${barX.toFixed(1)}" y="${PADDING}" width="${w.toFixed(1)}" height="${BAR_HEIGHT}" fill="${getColor(lang)}" rx="2"/>`;
    barX += w;
    return seg;
  }).join('');

  // Legenda em duas colunas
  const legendItems = sorted.map(({ lang, pct }, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PADDING + col * COL_WIDTH;
    const y = LEGEND_Y + row * ROW_HEIGHT;
    return `
      <circle cx="${x + 7}" cy="${y + 7}" r="6" fill="${getColor(lang)}"/>
      <text x="${x + 20}" y="${y + 12}" fill="#e6edf3" font-size="13" font-family="Segoe UI, Arial, sans-serif">
        <tspan font-weight="600">${lang}</tspan>
        <tspan fill="#8b949e"> ${pct}%</tspan>
      </text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" rx="12" fill="#161b22"/>
  <text x="${PADDING}" y="${PADDING - 6}" fill="#e6edf3" font-size="15" font-weight="700" font-family="Segoe UI, Arial, sans-serif">Most Used Languages</text>
  ${barSegments}
  ${legendItems}
</svg>`;
}

(async () => {
  console.log(`Fetching repos for ${USERNAME}...`);
  const repos = await getAllRepos();
  console.log(`Found ${repos.length} repos`);

  const langTotals = {};
  for (const repo of repos) {
    const langs = await getLangs(repo);
    for (const [lang, bytes] of Object.entries(langs)) {
      langTotals[lang] = (langTotals[lang] || 0) + bytes;
    }
  }

  console.log('Languages found:', Object.keys(langTotals));
  const svg = generateSVG(langTotals);
  fs.writeFileSync('langs.svg', svg);
  console.log('langs.svg generated successfully!');
})();
