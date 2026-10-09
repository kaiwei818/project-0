// Saves your admin username, turns your admin password into a hash, and creates
// a random session secret.
//
// Run with: npm run hash-password
//
// It saves all three into .dev.vars (used by "npm run dev" on your Mac). That file is
// listed in .gitignore, so it never gets uploaded to GitHub. It also prints the
// commands to store the same values on Cloudflare for the live site.

import { pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const ITERATIONS = 100000; // the most Cloudflare allows; must match lib/auth.js reading it back
const MIN_LENGTH = 12;

function askVisible(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Ask for the password without showing it on screen.
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.startsWith(question)) rl.output.write(text); // show the question, hide the typing
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

// The username is not secret like the password, but it is kept out of the code
// (and so off GitHub) all the same: one less thing for a stranger to know.
const username = await askVisible("Admin username (for example your email): ");
if (!username) {
  console.error("Please type a username.");
  process.exit(1);
}

const password = await askHidden("New admin password: ");
if (password.length < MIN_LENGTH) {
  console.error(`Please use at least ${MIN_LENGTH} characters. A short phrase works well.`);
  process.exit(1);
}
if ((await askHidden("Type it again: ")) !== password) {
  console.error("The two passwords did not match. Nothing was changed.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
const values = {
  ADMIN_USERNAME: username,
  ADMIN_PASSWORD_HASH: `pbkdf2:${ITERATIONS}:${salt.toString("base64")}:${hash.toString("base64")}`,
  SESSION_SECRET: randomBytes(32).toString("base64"),
};

// Update .dev.vars, keeping any other lines already in it.
const lines = existsSync(".dev.vars")
  ? readFileSync(".dev.vars", "utf8").split("\n").filter((line) => line && !line.split("=")[0].trim().match(/^(ADMIN_USERNAME|ADMIN_PASSWORD_HASH|SESSION_SECRET)$/))
  : [];
for (const [key, value] of Object.entries(values)) lines.push(`${key}=${value}`);
writeFileSync(".dev.vars", lines.join("\n") + "\n");

console.log(`
Saved to .dev.vars. Restart "npm run dev" to use the new username and password.

For the live site, run these three commands and paste the matching value when asked:

  npx wrangler pages secret put ADMIN_USERNAME
  ${values.ADMIN_USERNAME}

  npx wrangler pages secret put ADMIN_PASSWORD_HASH
  ${values.ADMIN_PASSWORD_HASH}

  npx wrangler pages secret put SESSION_SECRET
  ${values.SESSION_SECRET}
`);
