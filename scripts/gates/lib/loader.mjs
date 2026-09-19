// Sends @vercel/blob to the in-memory stub, for gates only.
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/trace-auth.mjs
import { register } from 'node:module';
register('./hooks.mjs', import.meta.url);
