const fs = require('fs');
const crypto = require('crypto');
const https = require('https');

const CREDENTIALS_FILE = 'google-service-account.json';
const SITEMAP_FILE = 'sitemap.xml';
const INDEXING_ENDPOINT = '/v3/urlNotifications:publish';
const TOKEN_URL = '/token';

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    console.error(`ERROR: ${CREDENTIALS_FILE} not found.`);
    console.error('Download it from Google Cloud Console > Service Accounts > Keys.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
}

function createJWT(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), credentials.private_key);

  return `${unsigned}.${signature.toString('base64url')}`;
}

function getAccessToken(jwt) {
  return new Promise((resolve, reject) => {
    const body = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: TOKEN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.access_token) resolve(parsed.access_token);
        else reject(new Error(`Token error: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function extractURLs() {
  if (!fs.existsSync(SITEMAP_FILE)) {
    console.error(`ERROR: ${SITEMAP_FILE} not found.`);
    process.exit(1);
  }
  const xml = fs.readFileSync(SITEMAP_FILE, 'utf8');
  const urls = [];
  const regex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function submitURL(url, accessToken) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ url, type: 'URL_UPDATED' });
    const req = https.request({
      hostname: 'indexing.googleapis.com',
      path: INDEXING_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ url, status: res.statusCode, response: data });
      });
    });
    req.on('error', (err) => {
      resolve({ url, status: 'ERROR', response: err.message });
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Google Indexing API - Submitting URLs...\n');

  const credentials = loadCredentials();
  const jwt = createJWT(credentials);
  const accessToken = await getAccessToken(jwt);
  const urls = extractURLs();

  console.log(`Found ${urls.length} URLs in sitemap.xml\n`);

  let success = 0;
  let errors = 0;

  for (const url of urls) {
    const result = await submitURL(url, accessToken);
    if (result.status === 200) {
      console.log(`  OK  ${result.url}`);
      success++;
    } else {
      console.log(`  FAIL [${result.status}] ${result.url}`);
      errors++;
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nDone: ${success} submitted, ${errors} failed (of ${urls.length} total)`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
