/**
 * NDS LZ10 (Type 0x10) 压缩/解压实现。
 *
 * 用于 TDGY gamedata 的 LZ77 压缩处理。WC2008/WC2009 通用。
 * 从 Python lz10.py 精确重写。
 */

/**
 * LZ10 解压。
 *
 * @param data - LZ10 压缩数据 (首字节 0x10)
 * @returns 解压后的原始数据
 * @throws Error 数据格式不是 LZ10
 */
export function decompress(data: Uint8Array): Uint8Array {
  if (data.length < 4 || data[0] !== 0x10) {
    throw new Error(
      `非 LZ10 格式: 首字节 0x${data[0]?.toString(16).padStart(2, "0") ?? "??"}`
    );
  }

  // header: little-endian uint32, 高24位 = 解压后大小
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const header = view.getUint32(0, true);
  const decompSize = header >>> 8;

  const result = new Uint8Array(decompSize);
  let resultPos = 0;
  let pos = 4;

  while (resultPos < decompSize) {
    if (pos >= data.length) break;
    const flags = data[pos];
    pos += 1;

    for (let bit = 0; bit < 8; bit++) {
      if (resultPos >= decompSize) break;

      if (flags & (0x80 >>> bit)) {
        // 引用: 2 字节编码 (length, offset)
        if (pos + 1 >= data.length) break;
        const b1 = data[pos];
        const b2 = data[pos + 1];
        pos += 2;

        const length = (b1 >>> 4) + 3;
        const offset = ((b1 & 0x0f) << 8 | b2) + 1;

        for (let j = 0; j < length; j++) {
          if (resultPos >= decompSize) break;
          result[resultPos] = result[resultPos - offset];
          resultPos++;
        }
      } else {
        // 字面值: 1 字节
        if (pos >= data.length) break;
        result[resultPos] = data[pos];
        resultPos++;
        pos += 1;
      }
    }
  }

  return result.subarray(0, decompSize);
}

/**
 * LZ10 压缩 (安全版: 禁止重叠引用, 保证 roundtrip 正确)。
 *
 * @param data - 原始数据
 * @returns LZ10 压缩数据 (首字节 0x10)
 */
export function compress(data: Uint8Array): Uint8Array {
  const size = data.length;
  // header: 0x10 | (size << 8), little-endian
  const header = 0x10 | (size << 8);
  const headerBuf = new Uint8Array(4);
  new DataView(headerBuf.buffer).setUint32(0, header, true);

  // 使用可增长的数组收集输出字节
  const chunks: number[] = Array.from(headerBuf);

  let pos = 0;
  while (pos < size) {
    const flagBytePos = chunks.length;
    chunks.push(0); // 占位 flag byte
    let flags = 0;

    for (let bit = 0; bit < 8; bit++) {
      if (pos >= size) break;

      let bestLen = 0;
      let bestOff = 0;

      const maxMatch = Math.min(18, size - pos);
      const searchLimit = Math.min(pos + 1, 0x1001);

      for (let off = 1; off < searchLimit; off++) {
        // 限制匹配长度不超过 offset, 禁止重叠引用
        const safeMax = Math.min(maxMatch, off);
        let matchLen = 0;
        while (matchLen < safeMax) {
          if (data[pos + matchLen] !== data[pos - off + matchLen]) break;
          matchLen++;
        }
        if (matchLen > bestLen) {
          bestLen = matchLen;
          bestOff = off;
          if (bestLen >= maxMatch) break;
        }
      }

      if (bestLen >= 3) {
        flags |= 0x80 >>> bit;
        const b1 = ((bestLen - 3) << 4) | (((bestOff - 1) >>> 8) & 0x0f);
        const b2 = (bestOff - 1) & 0xff;
        chunks.push(b1);
        chunks.push(b2);
        pos += bestLen;
      } else {
        chunks.push(data[pos]);
        pos += 1;
      }
    }

    chunks[flagBytePos] = flags;
  }

  return new Uint8Array(chunks);
}
