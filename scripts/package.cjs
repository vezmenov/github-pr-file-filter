'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
if (typeof manifest.version !== 'string' || !/^\d+(?:\.\d+){0,3}$/.test(manifest.version)) {
  throw new Error('Некорректная версия в extension/manifest.json');
}

function listFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '.DS_Store') return [];
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Символическая ссылка в extension: ${relative}`);
    if (entry.isDirectory()) return listFiles(path.join(directory, entry.name), relative);
    if (entry.isFile()) return [relative];
    throw new Error(`Неподдерживаемый файл в extension: ${relative}`);
  }).sort();
}

const files = listFiles(source);
const output = path.join(root, 'dist', `github-pr-file-filter-${manifest.version}.zip`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.rmSync(output, { force: true });
execFileSync('zip', ['-q', '-X', output, ...files.map(file => `./${file}`)], { cwd: source, stdio: 'inherit' });
console.log(`Создан ${path.relative(root, output)} (${files.length} файлов)`);
