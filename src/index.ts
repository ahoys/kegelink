import { existsSync, readFileSync } from 'fs';
import logscribe from 'logscribe';
import { resolve } from 'path';

// const { p } = logscribe('General');

/**
 * Read authentication data.
 */
const auth = { id: '', owner: '', token: '' };
const authPath = resolve('./configs/auth.json');
if (existsSync(authPath)) {
  const obj = JSON.parse(readFileSync(authPath, 'utf8'));
  if (obj.token && obj.id && obj.owner) {
    auth.token = obj.token || '';
    auth.id = obj.id || '';
    auth.owner = obj.owner || '';
    logscribe('Authentication', '\x1b[32m').p(
      `Successfully read auth.json for ${auth.id}.`
    );
  } else {
    logscribe('Authentication', '\x1b[31m').lp('Failed to read auth.json.');
    process.exit(1);
  }
}
