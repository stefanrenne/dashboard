// Prints the scrypt hash of an admin password, for settings.yaml adminPassword or DASHBOARD_ADMIN_PASSWORD
// (or the file of DASHBOARD_ADMIN_PASSWORD_FILE), so the password itself is stored nowhere:
//
//   docker exec -it dashboard node src/hash-password.mjs
//   echo -n 'secret' | node src/hash-password.mjs
//
// On a terminal it asks twice without showing what is typed; otherwise it reads stdin.

import readline from 'node:readline';
import { hashPassword } from './actionauth.js';

function ask(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(prompt)) process.stdout.write(prompt); };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function readStdin() {
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text.replace(/\r?\n$/, '');
}

let password;
if (process.stdin.isTTY) {
  password = await ask('Admin password: ');
  if ((await ask('Once more: ')) !== password) {
    console.error('The two do not match.');
    process.exit(1);
  }
} else {
  password = await readStdin();
}
if (!password) {
  console.error('No password given.');
  process.exit(1);
}
console.log(hashPassword(password));
