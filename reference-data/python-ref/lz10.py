"""NDS LZ10 (Type 0x10) 压缩/解压实现。

用于 TDGY gamedata 的 LZ77 压缩处理。WC2008/WC2009 通用。
"""
from __future__ import annotations

import struct


def decompress(data: bytes) -> bytes:
    """LZ10 解压。

    Args:
        data: LZ10 压缩数据 (首字节 0x10)

    Returns:
        解压后的原始数据

    Raises:
        ValueError: 数据格式不是 LZ10
    """
    if len(data) < 4 or data[0] != 0x10:
        raise ValueError(f"非 LZ10 格式: 首字节 0x{data[0]:02X}")

    header = int.from_bytes(data[0:4], "little")
    decomp_size = header >> 8
    result = bytearray()
    pos = 4

    while len(result) < decomp_size:
        if pos >= len(data):
            break
        flags = data[pos]
        pos += 1

        for bit in range(8):
            if len(result) >= decomp_size:
                break
            if flags & (0x80 >> bit):
                if pos + 1 >= len(data):
                    break
                b1, b2 = data[pos], data[pos + 1]
                pos += 2
                length = (b1 >> 4) + 3
                offset = ((b1 & 0x0F) << 8) | b2
                offset += 1
                for _ in range(length):
                    if len(result) >= decomp_size:
                        break
                    result.append(result[-offset])
            else:
                if pos >= len(data):
                    break
                result.append(data[pos])
                pos += 1

    return bytes(result[:decomp_size])


def compress(data: bytes) -> bytes:
    """LZ10 压缩 (安全版: 禁止重叠引用, 保证 roundtrip 正确)。

    Args:
        data: 原始数据

    Returns:
        LZ10 压缩数据 (首字节 0x10)
    """
    size = len(data)
    header = 0x10 | (size << 8)
    result = bytearray(struct.pack("<I", header))

    pos = 0
    while pos < size:
        flag_byte_pos = len(result)
        result.append(0)
        flags = 0

        for bit in range(8):
            if pos >= size:
                break

            best_len = 0
            best_off = 0

            max_match = min(18, size - pos)

            for off in range(1, min(pos + 1, 0x1001)):
                # 限制匹配长度不超过 offset, 禁止重叠引用
                safe_max = min(max_match, off)
                match_len = 0
                while match_len < safe_max:
                    if data[pos + match_len] != data[pos - off + match_len]:
                        break
                    match_len += 1
                if match_len > best_len:
                    best_len = match_len
                    best_off = off
                    if best_len >= max_match:
                        break

            if best_len >= 3:
                flags |= (0x80 >> bit)
                b1 = ((best_len - 3) << 4) | (((best_off - 1) >> 8) & 0x0F)
                b2 = (best_off - 1) & 0xFF
                result.append(b1)
                result.append(b2)
                pos += best_len
            else:
                result.append(data[pos])
                pos += 1

        result[flag_byte_pos] = flags

    return bytes(result)
