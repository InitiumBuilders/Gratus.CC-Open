import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const STUB = pathToFileURL(path.join(here, 'blob-stub.mjs')).href;
export async function resolve(specifier, context, next) {
  if (specifier === '@vercel/blob') return { url: STUB, shortCircuit: true };
  return next(specifier, context);
}
