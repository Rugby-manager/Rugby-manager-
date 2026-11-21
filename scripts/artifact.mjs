// Convierte dist/index.html en una página lista para publicar como Artifact
// (sin <html>/<head>/<body>, que los agrega la plataforma).
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync('dist/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const metas = [...head.matchAll(/<meta name="(claude:[^"]+|theme-color)"[^>]*>/g)].map((m) => m[0]);
const links = [...head.matchAll(/<link [^>]*>/g)].map((m) => m[0]).filter((l) => !/rel="(manifest|apple-touch-icon|icon)"/.test(l));
const styles = [...head.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...head.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
const out = [title, ...metas, ...links, ...styles, body.trim(), ...scripts].join('\n');
writeFileSync('dist/rugby-manager.html', out);
console.log('dist/rugby-manager.html', (out.length / 1024).toFixed(0) + ' KB');
