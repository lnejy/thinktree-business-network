const fs = require('node:fs');
const path = require('node:path');

const baseUrl = process.env.THINKTREE_TEST_URL || 'http://localhost:8443';

function teamAccess() {
  const dataDir = process.env.THINKTREE_DATA_DIR || path.join(__dirname, '../backend/runtime');
  return JSON.parse(fs.readFileSync(path.join(dataDir, 'team-access.json'), 'utf8'));
}

async function login(page, username = 'jaeyeon') {
  const account = teamAccess().accounts.find(member => member.username === username);
  await page.goto(baseUrl);
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호').fill(account.password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.getByRole('button', { name: 'Add Card', exact: true }).first().waitFor();
}

module.exports = { baseUrl, login, teamAccess };
