import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import yauzl from 'yauzl';
import { parseDocument, Parser } from 'htmlparser2';

export const limits = { fileBytes: 25 * 1024 * 1024, entries: 5000, expandedBytes: 100 * 1024 * 1024, entryBytes: 10 * 1024 * 1024, units: 1500, textChars: 8_000_000, unitChars: 120_000 };

function check(condition, message) { if (!condition) throw new Error(message); }
function localName(name) { return name.split(':').at(-1); }
function elements(root, name) {
  const found = [], stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node.name && localName(node.name) === name) found.push(node);
    if (node.children) stack.push(...[...node.children].reverse());
  }
  return found;
}
function plain(root) {
  let text = ''; const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node.type === 'text') text += node.data;
    if (node.children) stack.push(...[...node.children].reverse());
  }
  return text;
}
function metadataText(root, name) { return plain(elements(root, name)[0] ?? {}).trim().slice(0, 500); }
function xhtmlText(source) {
  let text = '', skip = 0, inBody = false, depth = 0;
  const blocks = new Set(['p', 'div', 'section', 'article', 'li', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'blockquote', 'pre']);
  const parser = new Parser({
    onopentag(name) {
      check(++depth <= 128, 'This chapter is nested too deeply.');
      name = localName(name);
      if (name === 'body') inBody = true;
      if (['script', 'style', 'svg'].includes(name) || skip) skip++;
      if (inBody && !skip && blocks.has(name)) text += '\n';
    },
    ontext(value) { if (inBody && !skip) text += value; },
    onclosetag(name) {
      name = localName(name);
      if (inBody && !skip && blocks.has(name)) text += '\n';
      if (skip) skip--;
      if (name === 'body') inBody = false;
      depth--;
    },
  }, { decodeEntities: true, xmlMode: false, recognizeSelfClosing: true });
  parser.end(source);
  return text.replace(/[ \t\r\f]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
async function archive(bytes) {
  const zip = await new Promise((resolve, reject) => yauzl.fromBuffer(bytes, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, result) => error ? reject(error) : resolve(result)));
  const entries = new Map(); let expanded = 0;
  await new Promise((resolve, reject) => {
    zip.on('error', reject);
    zip.on('entry', entry => {
      try {
        check(entries.size < limits.entries, 'This EPUB contains too many files.');
        check(!entries.has(entry.fileName), 'This EPUB has duplicate file paths.');
        check(!(entry.generalPurposeBitFlag & 1), 'Encrypted EPUBs are not supported.');
        expanded += entry.uncompressedSize;
        check(expanded <= limits.expandedBytes, 'This EPUB expands beyond the 100 MB limit.');
        entries.set(entry.fileName, entry); zip.readEntry();
      } catch (error) { reject(error); }
    });
    zip.once('end', resolve); zip.readEntry();
  });
  return async name => {
    const entry = entries.get(name);
    check(entry, `This EPUB is missing a required file (${name.slice(0, 100)}).`);
    check(entry.uncompressedSize <= limits.entryBytes, 'A chapter exceeds the 10 MB limit.');
    const stream = await new Promise((resolve, reject) => zip.openReadStream(entry, (error, result) => error ? reject(error) : resolve(result)));
    const chunks = []; let size = 0;
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > limits.entryBytes) { stream.destroy(); throw new Error('A chapter exceeds the 10 MB limit.'); }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  };
}
function relativeEntry(base, href) {
  check(typeof href === 'string' && href.length > 0 && !/^[a-z]+:|^\/|\\/i.test(href), 'This EPUB has an unsupported content path.');
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(base), decodeURIComponent(href.split('#')[0])));
  check(!target.startsWith('../') && !target.startsWith('/'), 'This EPUB has an unsafe content path.');
  return target;
}
export async function extractBook(bytes, format, onProgress = () => {}) {
  check(bytes.length > 0 && bytes.length <= limits.fileBytes, 'Choose a nonempty PDF or EPUB up to 25 MB.');
  const result = { title: '', author: '', units: [] }; let chars = 0;
  function add(text, location) {
    text = text.replace(/\r\n?/g, '\n');
    if (!text.trim()) return;
    chars += text.length;
    check(chars <= limits.textChars, 'Extracted text exceeds the 8 million character limit.');
    for (let offset = 0; offset < text.length; offset += limits.unitChars) {
      check(result.units.length < limits.units, 'This book has too many pages or sections.');
      result.units.push({ text: text.slice(offset, offset + limits.unitChars), location: text.length > limits.unitChars ? `${location} · part ${Math.floor(offset / limits.unitChars) + 1}` : location });
    }
  }
  if (format === 'pdf') {
    check(bytes.subarray(0, 5).toString() === '%PDF-', 'The selected file is not a PDF.');
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false, disableFontFace: true, useWasm: false, verbosity: 0 });
    try {
      const pdf = await task.promise;
      check(pdf.numPages <= limits.units, 'PDFs are limited to 1,500 pages.');
      const { info } = await pdf.getMetadata();
      result.title = typeof info.Title === 'string' ? info.Title.slice(0, 500) : '';
      result.author = typeof info.Author === 'string' ? info.Author.slice(0, 500) : '';
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        const content = await page.getTextContent();
        const text = content.items.filter(item => 'str' in item).map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('').trim();
        add(text, `PDF page ${index}`); page.cleanup(); onProgress(index, pdf.numPages);
      }
    } finally { await task.destroy(); }
  } else {
    check(format === 'epub' && bytes.subarray(0, 2).toString() === 'PK', 'The selected file is not an EPUB.');
    const read = await archive(bytes);
    check((await read('mimetype')).trim() === 'application/epub+zip', 'This ZIP file is not an EPUB.');
    const container = parseDocument(await read('META-INF/container.xml'), { xmlMode: true });
    const rootfile = elements(container, 'rootfile')[0]?.attribs['full-path'];
    check(rootfile, 'This EPUB has no package document.');
    const packagePath = relativeEntry('container.xml', rootfile);
    const opf = parseDocument(await read(packagePath), { xmlMode: true });
    result.title = metadataText(opf, 'title'); result.author = metadataText(opf, 'creator');
    const manifest = new Map(elements(opf, 'item').map(item => [item.attribs.id, item.attribs]));
    const spine = elements(opf, 'itemref').filter(item => item.attribs.linear !== 'no');
    check(spine.length > 0 && spine.length <= limits.units, 'This EPUB has no readable spine or too many chapters.');
    for (let index = 0; index < spine.length; index++) {
      const item = manifest.get(spine[index].attribs.idref);
      check(item && ['application/xhtml+xml', 'text/html'].includes(item['media-type']), 'This EPUB contains an unsupported chapter format.');
      const source = await read(relativeEntry(packagePath, item.href));
      const doc = parseDocument(source);
      const heading = elements(doc, 'h1')[0] ?? elements(doc, 'h2')[0];
      const title = heading ? plain(heading).trim().slice(0, 150) : '';
      add(xhtmlText(source), `Section ${index + 1}${title ? ` · ${title}` : ''}`);
      onProgress(index + 1, spine.length);
    }
  }
  check(result.units.length > 0, 'No readable text was found. Scanned PDFs, image-only books, and DRM-protected books are not supported.');
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const bytes = await readFile(process.argv[2]);
    const result = await extractBook(bytes, process.argv[3], (current, total) => console.log(JSON.stringify({ type: 'progress', current, total })));
    console.log(JSON.stringify({ type: 'result', result }));
  } catch (error) {
    console.log(JSON.stringify({ type: 'error', error: error?.message?.slice(0, 500) || 'This book could not be read.' }));
    process.exitCode = 1;
  }
}
