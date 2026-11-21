// A local preview with the same routes as the live site: /app, /app/book, /gift, /privacy.
// Nothing is sent anywhere. There is no /api here, so the rooms that need the server say
// they cannot reach it, and everything that lives on the device works.
//
//   node scripts/preview.mjs [port]
import { serve } from "./gates/lib/harness.mjs";

const port = Number(process.argv[2] || 4796);
const s = await serve(port);
console.log("Gratus preview: " + s.base + "/app");
