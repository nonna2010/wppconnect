/*
 * This file is part of WPPConnect.
 *
 * WPPConnect is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WPPConnect is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with WPPConnect.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as crypto from 'crypto';
import hkdf from 'futoin-hkdf';
import atob = require('atob');
import { ResponseType } from 'axios';

export const makeOptions = (useragentOverride: string) => ({
  responseType: 'arraybuffer' as ResponseType,
  headers: {
    'User-Agent': processUA(useragentOverride),
    DNT: '1',
    'Upgrade-Insecure-Requests': '1',
    origin: 'https://web.whatsapp.com/',
    referer: 'https://web.whatsapp.com/',
  },
});

export const timeout = (ms: number) =>
  new Promise((res) => setTimeout(res, ms));
export const mediaTypes = {
  IMAGE: 'Image',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  PTT: 'Audio',
  DOCUMENT: 'Document',
  STICKER: 'Image',
};

const processUA = (userAgent: string) => {
  let ua =
    userAgent ||
    'WhatsApp/2.16.352 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.92 Safari/537.36';
  if (!ua.includes('WhatsApp')) ua = 'WhatsApp/2.16.352 ' + ua;
  return ua;
};

export const magix = (
  fileData: any,
  mediaKeyBase64: any,
  mediaType: any,
  expectedSize?: number
) => {
  const encodedHex = fileData.toString('hex');
  const encodedBytes = hexToBytes(encodedHex);
  const mediaKeyBytes: any = base64ToBytes(mediaKeyBase64);
  const info = `WhatsApp ${mediaTypes[mediaType.toUpperCase()]} Keys`;
  const hash: string = 'sha256';
  const salt: any = new Uint8Array(32);
  const expandedSize = 112;
  const mediaKeyExpanded = hkdf(mediaKeyBytes, expandedSize, {
    salt,
    info,
    hash,
  });
  const iv = mediaKeyExpanded.slice(0, 16);
  const cipherKey = mediaKeyExpanded.slice(16, 48);
  const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
  const decoded: Buffer = decipher.update(encodedBytes);
  const mediaDataBuffer = expectedSize
    ? fixPadding(decoded, expectedSize)
    : decoded;
  return mediaDataBuffer;
};

const fixPadding = (data: Buffer, expectedSize: number) => {
  let padding = (16 - (expectedSize % 16)) & 0xf;
  if (padding > 0) {
    if (expectedSize + padding == data.length) {
      //  console.log(`trimmed: ${padding} bytes`);
      data = data.slice(0, data.length - padding);
    } else if (data.length + padding == expectedSize) {
      // console.log(`adding: ${padding} bytes`);
      let arr = new Uint16Array(padding).map((b) => padding);
      data = Buffer.concat([data, Buffer.from(arr)]);
    }
  }
  //@ts-ignore
  return Buffer.from(data, 'utf-8');
};

const hexToBytes = (hexStr: any) => {
  const intArray = [];
  for (let i = 0; i < hexStr.length; i += 2) {
    intArray.push(parseInt(hexStr.substr(i, 2), 16));
  }
  return new Uint8Array(intArray);
};

const base64ToBytes = (base64Str: any) => {
  const binaryStr = atob(base64Str);
  const byteArray = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    byteArray[i] = binaryStr.charCodeAt(i);
  }
  return byteArray;
};
