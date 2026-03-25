/**
 * 标准 zlib CRC32 实现。
 *
 * 使用预计算查找表，与 Python zlib.crc32() 行为一致。
 */

/** CRC32 查找表 (标准多项式 0xEDB88320) */
const CRC32_TABLE = new Uint32Array(256);

// 初始化查找表
for (let i = 0; i < 256; i++) {
  let crc = i;
  for (let j = 0; j < 8; j++) {
    crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  CRC32_TABLE[i] = crc;
}

/**
 * 计算 CRC32 校验值。
 *
 * @param data - 输入数据
 * @param initial - 初始值，默认 0 (函数内部会取反)
 * @returns 无符号 32 位 CRC32 值
 */
export function crc32(data: Uint8Array, initial: number = 0): number {
  let crc = (initial ^ 0xffffffff) >>> 0;
  for (let i = 0; i < data.length; i++) {
    crc = (CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
