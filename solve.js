// csv-reader-fast: a faster drop-in for make.fun's csv-reader 1.0.0 readCsv.
// One left-to-right pass over the text with charCodeAt; fields are cut with slice()
// instead of being built a character at a time. Same answers, same error order.
// MIT licence, see LICENSE.

const QUOTE = 34; // "
const COMMA = 44; // ,
const LF = 10;
const CR = 13;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0;
  let line = 1;
  if (n > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  while (true) {
    // Skip empty lines (LF or CRLF only).
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === LF) {
        pos++;
        line++;
      } else if (c === CR && pos + 1 < n && text.charCodeAt(pos + 1) === LF) {
        pos += 2;
        line++;
      } else break;
    }
    if (pos >= n) break;

    const recordLine = line;
    const recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    let ended = 0; // 0 comma, 1 line break, 2 end

    do {
      let value;
      quoted = pos < n && text.charCodeAt(pos) === QUOTE;
      let unq = !quoted; // read an unquoted run
      let prefix = '';
      let junkMode = false;
      if (quoted) {
        // Quoted field.
        const open = pos;
        const openLine = line;
        let p = pos + 1;
        let start = p;
        let acc = '';
        let closed = false;
        while (p < n) {
          const c = text.charCodeAt(p);
          if (c > QUOTE) {
            // Fast path: nothing above '"' is special inside quotes.
            p++;
            continue;
          }
          if (c === QUOTE) {
            if (p + 1 < n && text.charCodeAt(p + 1) === QUOTE) {
              acc += text.slice(start, p + 1);
              p += 2;
              start = p;
              continue;
            }
            acc += text.slice(start, p);
            p++;
            closed = true;
            break;
          }
          if (c === CR) {
            acc += text.slice(start, p) + '\n';
            line++;
            p += p + 1 < n && text.charCodeAt(p + 1) === LF ? 2 : 1;
            start = p;
            continue;
          }
          if (c === LF) line++;
          p++;
        }
        if (!closed) {
          pos = open + 1;
          line = openLine;
          errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
          prefix = '"';
          unq = true;
        } else {
          pos = p;
          if (pos >= n) {
            value = acc;
            ended = 2;
          } else {
            const c = text.charCodeAt(pos);
            if (c === COMMA) {
              pos++;
              value = acc;
              ended = 0;
            } else if (c === LF) {
              pos++;
              line++;
              value = acc;
              ended = 1;
            } else if (c === CR && pos + 1 < n && text.charCodeAt(pos + 1) === LF) {
              pos += 2;
              line++;
              value = acc;
              ended = 1;
            } else {
              prefix = acc;
              unq = true;
              junkMode = true;
            }
          }
        }
      }
      if (unq) {
        // Unquoted run onto prefix; stray CRs dropped.
        let p = pos;
        let start = p;
        let acc = prefix;
        let added = 0;
        ended = 2;
        while (p < n) {
          const c = text.charCodeAt(p);
          if (c > COMMA) {
            // Fast path: nothing above ',' ends or alters an unquoted field.
            p++;
            continue;
          }
          if (c === COMMA) {
            ended = 0;
            break;
          }
          if (c === LF) {
            ended = 1;
            break;
          }
          if (c === CR) {
            if (p + 1 < n && text.charCodeAt(p + 1) === LF) {
              ended = 3; // CRLF
              break;
            }
            errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
            added += p - start;
            acc += text.slice(start, p);
            p++;
            start = p;
            continue;
          }
          p++;
        }
        added += p - start;
        value = start === pos ? (prefix === '' ? text.slice(start, p) : prefix + text.slice(start, p)) : acc + text.slice(start, p);
        if (ended === 0) pos = p + 1;
        else if (ended === 1) {
          pos = p + 1;
          line++;
        } else if (ended === 3) {
          pos = p + 2;
          line++;
          ended = 1;
        } else pos = p;
        if (junkMode && added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
      }
      fields.push(value);
    } while (ended === 0);

    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    const fl = fields.length;
    if (fl < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fl });
      while (fields.length < width) fields.push('');
    } else if (fl > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns === null ? [] : columns) : null, rows, errors };
}
