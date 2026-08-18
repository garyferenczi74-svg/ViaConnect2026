/**
 * Prompt 222: export Heads Up teardown markdown to US Letter DOCX.
 * Page size 12240 x 15840 DXA. Prefer require("docx"); else OOXML zip.
 * Header: ViaConnect Internal Strategy. Footer: page numbers.
 * No unicode bullets. No em/en dashes. Does not add a package.json dependency.
 */

import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MD_PATH = resolve(
  ROOT,
  "docs/superpowers/reports/2026-08-18-prompt-222-headsup-teardown.md"
);
const DOCX_PATH = resolve(
  ROOT,
  "docs/superpowers/reports/2026-08-18-prompt-222-headsup-teardown.docx"
);

const PAGE_WIDTH_DXA = 12240;
const PAGE_HEIGHT_DXA = 15840;
const MARGIN_DXA = 1440;
const CONTENT_WIDTH_DXA = PAGE_WIDTH_DXA - MARGIN_DXA * 2;
const HEADER_TEXT = "ViaConnect Internal Strategy";
const CLASSIFICATION_LINE =
  "Classification: INTERNAL STRATEGY. Consumer surfaces get nothing from this material unless a future Gary-approved, Lex-reviewed derivation is commissioned. Zero consumer UI.";

function tryLoadDocx() {
  const req = createRequire(import.meta.url);
  try {
    return req("docx");
  } catch {
    let dir = ROOT;
    for (let i = 0; i < 6; i += 1) {
      try {
        return req(resolve(dir, "node_modules/docx"));
      } catch {
        const parent = resolve(dir, "..");
        if (parent === dir) break;
        dir = parent;
      }
    }
    return null;
  }
}

function sanitizeText(value) {
  return String(value)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(
      /[\u2022\u2023\u2043\u2219\u25AA\u25AB\u25CF\u25E6\u00B7\u2024\u2027\u25A0\u25A1]/g,
      "-"
    )
    .replace(/\u00A0/g, " ")
    .replace(/\uFEFF/g, "");
}

function xmlEscape(value) {
  return sanitizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseInlineRuns(text) {
  const src = sanitizeText(text);
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match;
  while ((match = re.exec(src))) {
    if (match.index > last) {
      runs.push({ text: src.slice(last, match.index) });
    }
    if (match[0].startsWith("**")) {
      runs.push({ text: match[0].slice(2, -2), bold: true });
    } else {
      runs.push({ text: match[0].slice(1, -1), code: true });
    }
    last = match.index + match[0].length;
  }
  if (last < src.length) {
    runs.push({ text: src.slice(last) });
  }
  return runs.filter((run) => run.text.length > 0);
}

function parseMarkdown(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  function flushParagraph(buf) {
    const text = buf.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
    buf.length = 0;
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^#{1,3} /.test(trimmed)) {
      const level = trimmed.match(/^#+/)[0].length;
      const text = trimmed.replace(/^#{1,3} /, "").trim();
      blocks.push({ type: level === 1 ? "title" : level === 2 ? "h1" : "h2", text });
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());
        const isSep = cells.every((cell) => /^:?-{3,}:?$/.test(cell));
        if (!isSep) rows.push(cells);
        i += 1;
      }
      if (rows.length) {
        blocks.push({ type: "table", headers: rows[0], rows: rows.slice(1) });
      }
      continue;
    }

    if (/^[-*] /.test(trimmed) || /^\d+\. /.test(trimmed)) {
      const ordered = /^\d+\. /.test(trimmed);
      const items = [];
      while (i < lines.length) {
        const item = lines[i].trim();
        if (!item) break;
        if (ordered && !/^\d+\. /.test(item)) break;
        if (!ordered && !/^[-*] /.test(item)) break;
        items.push(item.replace(/^([-*] |\d+\. )/, ""));
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const para = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next) break;
      if (/^#{1,3} /.test(next) || next.startsWith("|") || /^[-*] /.test(next) || /^\d+\. /.test(next) || /^---+$/.test(next)) {
        break;
      }
      para.push(next);
      i += 1;
    }
    flushParagraph(para);
  }

  const hasClass = blocks.some(
    (b) => b.type === "p" && /INTERNAL STRATEGY/.test(b.text)
  );
  if (!hasClass) {
    const titleAt = blocks.findIndex((b) => b.type === "title");
    const insertAt = titleAt >= 0 ? titleAt + 1 : 0;
    blocks.splice(insertAt, 0, { type: "p", text: CLASSIFICATION_LINE, classification: true });
  } else {
    const first = blocks.find((b) => b.type === "p" && /INTERNAL STRATEGY/.test(b.text));
    if (first) first.classification = true;
  }

  return blocks;
}

function wText(text) {
  const clean = sanitizeText(text);
  const space = /^\s|\s$/.test(clean) ? ' xml:space="preserve"' : "";
  return `<w:t${space}>${xmlEscape(clean)}</w:t>`;
}

function wRuns(text) {
  return parseInlineRuns(text)
    .map((run) => {
      const rPr = [];
      if (run.bold) rPr.push("<w:b/>");
      if (run.code) rPr.push('<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>');
      const pr = rPr.length ? `<w:rPr>${rPr.join("")}</w:rPr>` : "";
      return `<w:r>${pr}${wText(run.text)}</w:r>`;
    })
    .join("");
}

function wParagraph(text, extras = {}) {
  const pPrParts = [];
  if (extras.style) pPrParts.push(`<w:pStyle w:val="${extras.style}"/>`);
  if (extras.keepNext) pPrParts.push("<w:keepNext/>");
  if (extras.numId != null) {
    pPrParts.push(
      `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${extras.numId}"/></w:numPr>`
    );
  }
  if (extras.spacingAfter != null) {
    pPrParts.push(`<w:spacing w:after="${extras.spacingAfter}"/>`);
  }
  const pPr = pPrParts.length ? `<w:pPr>${pPrParts.join("")}</w:pPr>` : "";
  return `<w:p>${pPr}${wRuns(text)}</w:p>`;
}

function wTable(headers, rows) {
  const cols = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const colW = Math.floor(CONTENT_WIDTH_DXA / cols);
  const grid = Array.from({ length: cols }, () => `<w:gridCol w:w="${colW}"/>`).join("");
  const border = (edge) =>
    `<w:${edge} w:val="single" w:sz="4" w:space="0" w:color="76866F"/>`;
  const renderRow = (cells, header) => {
    const tcs = [];
    for (let c = 0; c < cols; c += 1) {
      const raw = cells[c] ?? "";
      const shd = header
        ? '<w:shd w:val="clear" w:color="auto" w:fill="224852"/>'
        : "";
      const color = header ? '<w:color w:val="FFFFFF"/>' : "";
      const bold = header ? "<w:b/>" : "";
      tcs.push(
        `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/>${shd}</w:tcPr>` +
          `<w:p><w:r><w:rPr>${bold}${color}</w:rPr>${wText(raw)}</w:r></w:p></w:tc>`
      );
    }
    return `<w:tr>${tcs.join("")}</w:tr>`;
  };
  const body = [renderRow(headers, true), ...rows.map((r) => renderRow(r, false))].join("");
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${CONTENT_WIDTH_DXA}" w:type="dxa"/>` +
    `<w:tblBorders>${border("top")}${border("left")}${border("bottom")}${border("right")}` +
    `${border("insideH")}${border("insideV")}</w:tblBorders></w:tblPr>` +
    `<w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>` +
    `<w:p/>`
  );
}

function buildNumbering(listCount) {
  const abstracts = [
    `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>` +
      `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/>` +
      `<w:lvlText w:val="%1."/><w:lvlJc w:val="left"/>` +
      `<w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>`,
    `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>` +
      `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/>` +
      `<w:lvlText w:val="-"/><w:lvlJc w:val="left"/>` +
      `<w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>`,
  ];
  const nums = [];
  for (let n = 1; n <= Math.max(listCount, 1); n += 1) {
    nums.push(`<w:num w:numId="${n}"><w:abstractNumId w:val="0"/></w:num>`);
  }
  const hyphenId = Math.max(listCount, 1) + 1;
  nums.push(`<w:num w:numId="${hyphenId}"><w:abstractNumId w:val="1"/></w:num>`);
  return {
    hyphenId,
    xml:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `${abstracts.join("")}${nums.join("")}</w:numbering>`,
  };
}

function blocksToOoxml(blocks) {
  const lists = blocks.filter((b) => b.type === "list");
  const { hyphenId, xml: numberingXml } = buildNumbering(lists.length);
  let nextNum = 1;
  const parts = [];

  for (const block of blocks) {
    if (block.type === "title") {
      parts.push(wParagraph(block.text, { style: "Title", spacingAfter: 120 }));
      continue;
    }
    if (block.type === "h1") {
      parts.push(wParagraph(block.text, { style: "Heading1", keepNext: true }));
      continue;
    }
    if (block.type === "h2") {
      parts.push(wParagraph(block.text, { style: "Heading2", keepNext: true }));
      continue;
    }
    if (block.type === "p") {
      const extras = { spacingAfter: 160 };
      if (block.classification) extras.style = "Classification";
      parts.push(wParagraph(block.text, extras));
      continue;
    }
    if (block.type === "list") {
      const numId = block.ordered ? nextNum : hyphenId;
      if (block.ordered) nextNum += 1;
      for (const item of block.items) {
        parts.push(wParagraph(item, { numId, spacingAfter: 40 }));
      }
      continue;
    }
    if (block.type === "table") {
      parts.push(wTable(block.headers, block.rows));
    }
  }

  const sectPr =
    `<w:sectPr>` +
    `<w:headerReference w:type="default" r:id="rId1"/>` +
    `<w:footerReference w:type="default" r:id="rId2"/>` +
    `<w:pgSz w:w="${PAGE_WIDTH_DXA}" w:h="${PAGE_HEIGHT_DXA}"/>` +
    `<w:pgMar w:top="${MARGIN_DXA}" w:right="${MARGIN_DXA}" w:bottom="${MARGIN_DXA}" ` +
    `w:left="${MARGIN_DXA}" w:header="720" w:footer="720"/>` +
    `</w:sectPr>`;

  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<w:body>${parts.join("")}${sectPr}</w:body></w:document>`;

  return { documentXml, numberingXml };
}

function stylesXml() {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:docDefaults><w:rPrDefault><w:rPr>` +
    `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>` +
    `<w:sz w:val="22"/><w:szCs w:val="22"/>` +
    `</w:rPr></w:rPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal">` +
    `<w:name w:val="Normal"/><w:qFormat/></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Title">` +
    `<w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/>` +
    `<w:pPr><w:spacing w:before="0" w:after="160"/></w:pPr>` +
    `<w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="224852"/></w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Heading1">` +
    `<w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>` +
    `<w:uiPriority w:val="9"/><w:qFormat/>` +
    `<w:pPr><w:keepNext/><w:spacing w:before="280" w:after="80"/></w:pPr>` +
    `<w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="224852"/></w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Heading2">` +
    `<w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>` +
    `<w:uiPriority w:val="9"/><w:qFormat/>` +
    `<w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/></w:pPr>` +
    `<w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="B75F19"/></w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Classification">` +
    `<w:name w:val="Classification"/><w:basedOn w:val="Normal"/>` +
    `<w:pPr><w:spacing w:after="200"/></w:pPr>` +
    `<w:rPr><w:b/><w:color w:val="9D5858"/></w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Header">` +
    `<w:name w:val="header"/><w:basedOn w:val="Normal"/></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Footer">` +
    `<w:name w:val="footer"/><w:basedOn w:val="Normal"/></w:style>` +
    `</w:styles>`
  );
}

function headerXml() {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:p><w:pPr><w:pStyle w:val="Header"/><w:jc w:val="left"/>` +
    `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="224852"/></w:pBdr>` +
    `</w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="224852"/></w:rPr>` +
    `${wText(HEADER_TEXT)}</w:r></w:p></w:hdr>`
  );
}

function footerXml() {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:p><w:pPr><w:pStyle w:val="Footer"/><w:jc w:val="center"/></w:pPr>` +
    `<w:r><w:t xml:space="preserve">Page </w:t></w:r>` +
    `<w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
    `<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>` +
    `<w:r><w:fldChar w:fldCharType="end"/></w:r>` +
    `</w:p></w:ftr>`
  );
}

function contentTypesXml() {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
    `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>` +
    `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>` +
    `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `</Types>`
  );
}

function rootRelsXml() {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
    `</Relationships>`
  );
}

function documentRelsXml() {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>` +
    `</Relationships>`
  );
}

function coreXml() {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
    `xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<dc:title>Heads Up Health competitive teardown</dc:title>` +
    `<dc:creator>ViaConnect</dc:creator>` +
    `<cp:lastModifiedBy>ViaConnect</cp:lastModifiedBy>` +
    `</cp:coreProperties>`
  );
}

function appXml() {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">` +
    `<Application>ViaConnect Prompt 222</Application>` +
    `</Properties>`
  );
}

function zipOoxml(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf8");
    const compressed = deflateRawSync(data);
    const useDeflate = compressed.length < data.length;
    const payload = useDeflate ? compressed : data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(data) >>> 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    locals.push(local, name, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + payload.length;
  }

  const centralDir = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDir, eocd]);
}

function buildWithOoxml(md) {
  const blocks = parseMarkdown(md);
  const { documentXml, numberingXml } = blocksToOoxml(blocks);
  return zipOoxml([
    { name: "[Content_Types].xml", data: contentTypesXml() },
    { name: "_rels/.rels", data: rootRelsXml() },
    { name: "docProps/core.xml", data: coreXml() },
    { name: "docProps/app.xml", data: appXml() },
    { name: "word/document.xml", data: documentXml },
    { name: "word/_rels/document.xml.rels", data: documentRelsXml() },
    { name: "word/styles.xml", data: stylesXml() },
    { name: "word/numbering.xml", data: numberingXml },
    { name: "word/header1.xml", data: headerXml() },
    { name: "word/footer1.xml", data: footerXml() },
  ]);
}

function runsFromText(docx, text) {
  return parseInlineRuns(text).map(
    (run) =>
      new docx.TextRun({
        text: sanitizeText(run.text),
        bold: Boolean(run.bold),
        font: run.code ? "Courier New" : undefined,
      })
  );
}

async function buildWithDocx(docx, md) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    HeadingLevel,
    LevelFormat,
    Packer,
    PageNumber,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = docx;

  const blocks = parseMarkdown(md);
  const children = [];
  let orderRef = 0;

  for (const block of blocks) {
    if (block.type === "title") {
      children.push(
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: runsFromText(docx, block.text),
        })
      );
      continue;
    }
    if (block.type === "h1") {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: runsFromText(docx, block.text),
        })
      );
      continue;
    }
    if (block.type === "h2") {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: runsFromText(docx, block.text),
        })
      );
      continue;
    }
    if (block.type === "p") {
      children.push(
        new Paragraph({
          children: runsFromText(docx, block.text),
          shading: block.classification
            ? { type: ShadingType.CLEAR, fill: "F4E8E8" }
            : undefined,
        })
      );
      continue;
    }
    if (block.type === "list") {
      const reference = block.ordered ? `numbered-${orderRef++}` : "hyphen-list";
      for (const item of block.items) {
        children.push(
          new Paragraph({
            numbering: { reference, level: 0 },
            children: runsFromText(docx, item),
          })
        );
      }
      continue;
    }
    if (block.type === "table") {
      const cols = Math.max(block.headers.length, ...block.rows.map((r) => r.length), 1);
      const colW = Math.floor(CONTENT_WIDTH_DXA / cols);
      const cell = (text, header) =>
        new TableCell({
          width: { size: colW, type: WidthType.DXA },
          shading: header ? { type: ShadingType.CLEAR, fill: "224852" } : undefined,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: sanitizeText(text),
                  bold: header,
                  color: header ? "FFFFFF" : undefined,
                }),
              ],
            }),
          ],
        });
      const border = {
        style: BorderStyle.SINGLE,
        size: 4,
        color: "76866F",
      };
      children.push(
        new Table({
          width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
          borders: {
            top: border,
            bottom: border,
            left: border,
            right: border,
            insideHorizontal: border,
            insideVertical: border,
          },
          rows: [
            new TableRow({
              children: block.headers.map((h) => cell(h, true)),
            }),
            ...block.rows.map(
              (row) =>
                new TableRow({
                  children: Array.from({ length: cols }, (_, i) =>
                    cell(row[i] ?? "", false)
                  ),
                })
            ),
          ],
        })
      );
    }
  }

  const numberingConfig = [
    {
      reference: "hyphen-list",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "-",
          alignment: AlignmentType.LEFT,
        },
      ],
    },
  ];
  for (let n = 0; n < orderRef; n += 1) {
    numberingConfig.push({
      reference: `numbered-${n}`,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
        },
      ],
    });
  }

  const doc = new Document({
    numbering: { config: numberingConfig },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA },
            margin: {
              top: MARGIN_DXA,
              right: MARGIN_DXA,
              bottom: MARGIN_DXA,
              left: MARGIN_DXA,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: HEADER_TEXT, bold: true })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun("Page "),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

async function main() {
  const md = readFileSync(MD_PATH, "utf8");
  const docxLib = tryLoadDocx();
  const buffer = docxLib ? await buildWithDocx(docxLib, md) : buildWithOoxml(md);
  writeFileSync(DOCX_PATH, buffer);
  const mode = docxLib ? "docx" : "ooxml-zip";
  process.stdout.write(`Wrote ${DOCX_PATH} (${buffer.length} bytes, ${mode})\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
