/* eslint-disable */

import * as config from '../utils/config';

export const shortDateFormat = (then) => {
  let locale = window.navigator.userLanguage || window.navigator.language;
  let now = new Date();
  if (then.getFullYear() === now.getFullYear()) {
    if (then.getMonth() === now.getMonth() && then.getDate() === now.getDate()) {
      return then.toLocaleTimeString(locale, { hour12: false, hour: '2-digit', minute: '2-digit' });
    }
    return then.toLocaleDateString(locale,
      { hour12: false, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  }
  return then.toLocaleDateString(locale,
    { hour12: false, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const makeImageUrl = (photo) => {
  return (photo && photo.type && photo.data) ?
    'data:image/' + photo.type + ';base64,' + photo.data : null;
};

export const fitImageSize = (width, height, maxWidth, maxHeight) => {
  if (!width || !height || !maxWidth || !maxHeight) {
    return null;
  }
  let scale = Math.min(
    Math.min(width, maxWidth) / width,
    Math.min(height, maxHeight) / height,
  );

  let size = { width: (width * scale) | 0, height: (height * scale) | 0 };
  if (maxWidth === maxHeight) {
    // Also calculate parameters for making the image square.
    size.square = Math.min(width, height);
    size.xoffset = ((width - size.square) / 2) | 0;
    size.yoffset = ((height - size.square) / 2) | 0;
  }
  return size;
};

export const fileNameForMime = (fname, mime) => {
  let idx = config.SUPPORTED_FORMATS.indexOf(mime);
  let ext = config.MIME_EXTENSIONS[idx];

  let at = fname.lastIndexOf('.');
  if (at >= 0) {
    fname = fname.substring(0, at);
  }
  return `${fname}.${ext}`;
};

export const getMimeType = (header) => {
  let mime = /^data:(image\/[-+a-z0-9.]+);base64/.exec(header);
  return (mime && mime.length > 1) ? mime[1] : null;
};

export const imageFileScaledToBase64 = (file, width, height, forceSquare, onSuccess, onError) => {
  let img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onerror = function () {
    onError("Image format unrecognized");
  };
  img.onload = function () {
    let size = fitImageSize(this.width, this.height, width, height);
    if (!size) {
      onError("Invalid image");
      return;
    }
    let canvas = document.createElement('CANVAS');
    if (forceSquare) {
      canvas.width = canvas.height = width;
    } else {
      canvas.width = size.width;
      canvas.height = size.height;
    }
    let ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    if (forceSquare) {
      ctx.drawImage(this, size.xoffset, size.yoffset, size.square, size.square,
        0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(this, 0, 0, this.width, this.height,
        0, 0, canvas.width, canvas.height);
    }
    let mime = (forceSquare || config.SUPPORTED_FORMATS.indexOf(file.type) < 0) ? "image/jpeg" : file.type;
    let imageBits = canvas.toDataURL(mime);
    let parts = imageBits.split(',');
    // Get actual image type: 'data:image/png;base64,'
    mime = getMimeType(parts[0]);
    if (!mime) {
      onError("Unsupported image format");
      return;
    }
    // Ensure the image is not too large
    let quality = 0.78;
    while (mime === "image/jpeg" && imageBits.length * 0.75 > config.MAX_ATTACHMENT_SIZE && quality > 0.15) {
      imageBits = canvas.toDataURL(mime, quality);
      quality *= 0.84;
    }
    if (imageBits.length * 0.75 > config.MAX_ATTACHMENT_SIZE) {
      onError(`The image size ${bytesToHumanSize(imageBits.length * 0.75)
        } exceeds the ${bytesToHumanSize(config.MAX_ATTACHMENT_SIZE)} limit.`, "err");
      return;
    }
    canvas = null;
    onSuccess(imageBits.split(',')[1], mime, size.width, size.height, fileNameForMime(file.name, mime));
  };
  img.src = URL.createObjectURL(file);
};

export const imageFileToBase64 = (file, onSuccess, onError) => {
  if (file.size > config.MAX_ATTACHMENT_SIZE) {
    onError(`The file size ${bytesToHumanSize(file.size)
      } exceeds the ${bytesToHumanSize(config.MAX_ATTACHMENT_SIZE)} limit.`, "err");
    return;
  }

  let reader = new FileReader();
  reader.addEventListener("load", () => {
    let parts = reader.result.split(',');
    let mime = getMimeType(parts[0]);
    if (!mime) {
      onError("Failed to process image file");
      return;
    }

    // Get image size.
    let img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
      onSuccess(parts[1], mime, this.width, this.height, fileNameForMime(file.name, mime));
    };
    img.onerror = function () {
      onError("Image format unrecognized");
    };
    img.src = URL.createObjectURL(file);
  }, false);
  reader.readAsDataURL(file);
};

export const updateFavicon = (count) => {
  let oldIcon = document.getElementById("shortcut-icon");
  if (oldIcon) {
    let head = document.head || document.getElementsByTagName('head')[0];
    let newIcon = document.createElement('link');
    newIcon.type = "image/png";
    newIcon.id = "shortcut-icon";
    newIcon.rel = "shortcut icon";
    newIcon.href = `img/logo32x32${count > 0 ? 'a' : ''}.png`;
    head.removeChild(oldIcon);
    head.appendChild(newIcon);
  }
  document.title = `${count > 0 ? '(' + count + ') ' : ''}VoicePing`;
};

export const stringHash = (value) => {
  let hash = 0;
  value = `${value}`;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash &= hash; // Convert to 32bit integer
  }
  return hash;
};

export const parseUrlHash = (hash) => {
  // Split path from args, path -> parts[0], args->path[1]
  let parts = hash.split('?', 2);
  let params = {};
  let path = [];
  if (parts[0]) {
    path = parts[0].substr(1).split("/");
  }
  if (parts[1]) {
    parts[1].split("&").forEach((part) => {
      let item = part.split("=");
      if (item[0]) {
        params[decodeURIComponent(item[0])] = decodeURIComponent(item[1]);
      }
    });
  }
  return { path, params };
};

export const composeUrlHash = (path, params) => {
  let url = path.join("/");
  let args = [];
  for (let key in params) {
    if (params.hasOwnProperty(key)) {
      args.push(`${key}=${params[key]}`);
    }
  }
  if (args.length > 0) {
    url += `?${args.join("&")}`;
  }
  return url;
};

export const addUrlParam = (hash, key, value) => {
  let parsed = parseUrlHash(hash);
  parsed.params[key] = value;
  return composeUrlHash(parsed.path, parsed.params);
};

export const removeUrlParam = (hash, key) => {
  const parsed = parseUrlHash(hash);
  delete parsed.params[key];
  return composeUrlHash(parsed.path, parsed.params);
};

export const setUrlSidePanel = (hash, sidepanel) => {
  const parsed = parseUrlHash(hash);
  parsed.path[0] = sidepanel;
  return composeUrlHash(parsed.path, parsed.params);
};

export const setUrlTopic = (hash, topic) => {
  const parsed = parseUrlHash(hash);
  parsed.path[1] = topic;
  delete parsed.params.info;
  return composeUrlHash(parsed.path, parsed.params);
};

export const detectServerAddress = () => {
  let host = config.DEFAULT_HOST;
  if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') {
    host = config.KNOWN_HOSTS.local;
  } else if (window.location.hostname) {
    host = window.location.hostname + (window.location.port ? `:${window.location.port}` : '');
  }
  return host;
};

export const getServerAddress = (url) => {
  let v = url.split("//");
  return v[v.length - 1];
};

export const vcard = (fn, imageDataUrl) => {
  let card = null;

  if ((fn && fn.trim()) || imageDataUrl) {
    card = {};
    if (fn) {
      card.fn = fn.trim();
    }
    if (imageDataUrl) {
      const dataStart = imageDataUrl.indexOf(",");
      card.photo = {
        data: imageDataUrl.substring(dataStart + 1),
        type: "jpg",
      };
    }
  }
  return card;
};

export const arrayEqual = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  a.sort();
  b.sort();
  for (let i = 0, l = a.length; i < l; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

export const bytesToHumanSize = (bytes) => {
  if (!bytes || bytes === 0) {
    return '0 Bytes';
  }

  let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  let bucket = Math.floor(Math.log2(bytes) / 10) | 0;
  let count = bytes / Math.pow(1024, bucket);
  let round = bucket > 0 ? (count < 10 ? 2 : (count < 100 ? 1 : 0)) : 0;
  return `${count.toFixed(round)} ${sizes[bucket]}`;
};
