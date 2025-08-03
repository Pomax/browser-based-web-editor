/**
 * No need for the "body-parser" middleware. It's just bloat.
 */
export async function parseBodyText(req, res, next) {
  let chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    req.body = Buffer.concat(chunks).toString(`utf-8`);
    next();
  });
}

export async function parseMultiPartBody(req, res, next) {
  const delimiter = getDelimiter(req);
  const endMarker = delimiter.replace(`\r\n`, ``) + `--`;

  const data = await (() => {
    let chunks = [];
    return new Promise((resolve, reject) => {
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", () => reject());
    });
  })();

  const parts = [];
  const flatString = [...data].map((v) => String.fromCharCode(v)).join(``); // woo this isn't inefficient at all!
  const blocks = flatString.split(delimiter);
  const HEADER = Symbol(`MULTIPART/FORM PART HEADER`);
  const CONTENT = Symbol(`MULTIPART/FORM PART CONTENT`);

  blocks.forEach((block, i) => {
    if (block.length === 0) return;

    const part = {
      name: `none`,
      type: `text/plain`,
      value: ``,
      encoding: `utf-8`,
    };

    parts.push(part);

    let parseMode = HEADER;

    do {
      if (parseMode === HEADER) {
        const cut = block.indexOf(`\r\n`) + 2;
        let line = block.substring(0, cut);
        block = block.substring(cut);

        if (line.includes(`Content-Disposition`)) {
          const name = line.match(/name="([^"]+)"/)?.[1];
          if (!name)
            throw new Error(`Content-Disposition is missing field name!`);
          part.name = name;
          const filename = line.match(/filename="([^"]+)"/)?.[1];
          if (filename) {
            part.filename = filename;
          }
        } else if (line.includes(`Content-Type`)) {
          const ctt = line.match(/Content-Type: ([^\s;]+)/)?.[1];
          if (ctt) {
            part.type = ctt;
          }
        } else if (line.includes(`Content-Transfer-Encoding`)) {
          const cte = line.match(/Content-Transfer-Encoding: ([^\s;]+)/)?.[1];
          if (cte) {
            part.encoding = cte;
          }
        } else if (line === `\r\n`) {
          parseMode = CONTENT;
        }
      } else if (parseMode === CONTENT) {
        // Either this is the last block and the data ends in the end marker,
        let cut = block.indexOf(endMarker) - 2;
        // or it's not, and the block ends in \r\n
        if (cut < 0) cut = block.length - 2;
        part.value = block.substring(0, cut);
        break;
      }
    } while (block.length);
  });

  req.body ??= {};
  parts.forEach((part) => (req.body[part.name] = part));
  next();
}

function getDelimiter(req) {
  const ctt = req.header(`content-type`);
  if (!ctt.includes(`multipart/form-data`))
    throw new Error(`Not multipart/form-data.`);
  const boundary = ctt.match(/boundary=([^\s;]+)/)?.[1];
  if (!boundary) throw new Error(`No boundary found.`);
  return `--${boundary}\r\n`;
}
