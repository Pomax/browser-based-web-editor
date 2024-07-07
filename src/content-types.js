function equals(a1, a2) {
  if (a1.length !== a2.length) return false;
  console.log(`comparing`, a1, a2);
  return a1.every((v, i) => a2[i] === v);
}

export function getViewType(filename, data) {
  const ext = filename.substring(filename.lastIndexOf(`.`) + 1);
  console.log(`ext:`, ext);

  // "editable text" extensions
  const editables = {
    css: `text/css`,
    csv: `text/csv`,
    htm: `text/html`,
    html: `text/html`,
    java: `application/java`,
    js: `text/javascript`,
    json: `application/json`,
    jsx: `text/javascript`,
    md: `text/markdown`,
    py: `application/python`,
    ts: `text/javascript`,
    rs: `application/rust`,
    tsx: `text/javascript`,
    txt: `text/plain`,
    xml: `application/xml`,
  };

  let type = editables[ext];

  if (type) {
    return {
      editable: true,
      type,
    };
  }

  // "previewable content" extensions
  const previewable = {
    gif: `image/gif`,
    jpg: `image/jpg`,
    jpeg: `image/jpg`,
    png: `image/png`,
    mp3: `audio/mpeg`,
    mp4: `video/mp4`,
    wav: `audio/wav`,
  };

  type = previewable[ext];

  if (type) {
    return {
      previewable: true,
      type,
    };
  }

  return false;
}

export function verifyViewType(type, data) {
  const bytes = new Uint8Array(data);
  if (type.startsWith(`text`) || type.startsWith(`application`)) return true;
  if (type === `image/gif`) return verifyGIF(bytes);
  if (type === `image/jpg`) return verifyJPG(bytes);
  if (type === `image/png`) return verifyPNG(bytes);
  if (type === `audio/mpeg`) return verifyMP3(bytes);
  if (type === `audio/wav`) return verifyWave(bytes);
  if (type === `video/mp4`) return verifyMP4(bytes);
  return false;
}

function verifyGIF(bytes) {
  console.log(`GIF`, bytes.slice(0, 4));
  return equals(bytes.slice(0, 4), [0x47, 0x49, 0x46, 0x38]);
}

function verifyJPG(bytes) {
  console.log(`jpg`, bytes.slice(0, 4));
  return (
    equals(bytes.slice(0, 4), [0xff, 0xd8, 0xff, 0xdb]) ||
    equals(bytes.slice(0, 4), [0xff, 0xd8, 0xff, 0xe0]) ||
    equals(bytes.slice(0, 4), [0xff, 0xd8, 0xff, 0xe1]) ||
    equals(bytes.slice(0, 4), [0xff, 0xd8, 0xff, 0xee])
  );
}

function verifyPNG(bytes) {
  console.log(`png`, bytes.slice(0, 4));
  return equals(bytes.slice(0, 4), [0x89, 0x50, 0x4e, 0x47]);
}

function verifyMP3(bytes) {
  // We assume it's ID3 tagged
  console.log(`mp3`, bytes.slice(0, 3));
  return equals(bytes.slice(0, 3), [0x49, 0x44, 0x33]);
}

function verifyMP4(bytes) {
  console.log(`mp4`, bytes.slice(0, 4));
  return equals(bytes.slice(0, 4), [0x66, 0x74, 0x79, 0x70]);
}

function verifyWave(bytes) {
  console.log(`wave`, data.slice(8, 12));
  return (
    verifyRIFF(bytes) && equals(bytes.slice(8, 12), [0x57, 0x41, 0x56, 0x4])
  );
}

function verifyRIFF(bytes) {
  console.log(`riff`, bytes.slice(0, 4));
  return equals(data.substring(0, 4), [0x52, 0x49, 0x46, 0x6]);
}
