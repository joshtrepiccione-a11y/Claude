/** Usage: npm run hash-password -- "your password" */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv.slice(2).join(" ").trim();
if (password.length < 12) {
  console.error("Choose a password of at least 12 characters. Usage: npm run hash-password -- \"your password\"");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
console.log(`scrypt:${salt}:${hash}`);
