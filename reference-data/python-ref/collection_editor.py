"""卡片收藏编辑器 - 直接修改 .sav 中的卡片数据 (纯 SAV 编辑)。

原理: TDGY gamedata 使用 LZ10 压缩。解压后修改半字节数组,
再重新压缩写回, 更新 CRC32 和备份副本。

解压后 gamedata 结构 (WC2009, 9552 bytes):
  +0x024: DP (uint32 LE)
  +0xA4E: 半字节数组 (1488 bytes, 每 nibble = 持有数 0-9)

WC2008 (9968 bytes):
  +0x065A: 半字节数组
"""
from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path
from typing import Optional

from . import lz10


# TDGY 头部偏移
TDGY_MAGIC = b"TDGY"
TDGY_DATALEN_OFF = 0x08
TDGY_CRC32_OFF = 0x0C
TDGY_GAMEDATA_OFF = 0x10


class CollectionEditor:
    """卡片收藏编辑器 - 通过 LZ10 解压/压缩直接编辑 .sav。

    支持 WC2008 和 WC2009。
    """

    def __init__(
        self,
        sav_path: str,
        cid_to_nibble_path: str,
        nibble_base: int,
        tdgy_offsets: list[int],
    ) -> None:
        """初始化编辑器。

        Args:
            sav_path: .sav 文件路径
            cid_to_nibble_path: CID→nibble_index 映射 JSON 路径
            nibble_base: 半字节数组在解压后 gamedata 中的偏移
            tdgy_offsets: TDGY 块偏移列表 (主+备份)
        """
        self.sav_path = Path(sav_path)
        self._sav = bytearray(self.sav_path.read_bytes())
        self._nibble_base = nibble_base
        self._tdgy_offsets = tdgy_offsets

        with open(cid_to_nibble_path) as f:
            raw = json.load(f)
        self._c2n: dict[int, int] = {int(k): v for k, v in raw.items()}

    def _decompress_tdgy(self) -> bytearray:
        """解压第一个有效 TDGY 块的 gamedata。"""
        for off in self._tdgy_offsets:
            if self._sav[off:off + 4] != TDGY_MAGIC:
                continue
            dl = struct.unpack_from("<I", self._sav, off + TDGY_DATALEN_OFF)[0]
            if dl == 0:
                continue
            compressed = bytes(self._sav[off + TDGY_GAMEDATA_OFF:
                                         off + TDGY_GAMEDATA_OFF + dl])
            return bytearray(lz10.decompress(compressed))
        raise ValueError("未找到有效 TDGY 块")

    def _write_tdgy(self, gd: bytes | bytearray) -> None:
        """压缩并写回所有 TDGY 块, 更新 CRC32。"""
        compressed = lz10.compress(bytes(gd))

        # roundtrip 验证
        verify = lz10.decompress(compressed)
        if verify != bytes(gd):
            raise RuntimeError("LZ10 roundtrip 验证失败, 数据可能损坏")

        for off in self._tdgy_offsets:
            if self._sav[off:off + 4] != TDGY_MAGIC:
                continue
            gs = off + TDGY_GAMEDATA_OFF
            old_len = struct.unpack_from("<I", self._sav, off + TDGY_DATALEN_OFF)[0]
            max_len = max(old_len, len(compressed))
            self._sav[gs:gs + max_len] = b"\x00" * max_len
            self._sav[gs:gs + len(compressed)] = compressed
            struct.pack_into("<I", self._sav, off + TDGY_DATALEN_OFF, len(compressed))
            crc = zlib.crc32(compressed) & 0xFFFFFFFF
            struct.pack_into("<I", self._sav, off + TDGY_CRC32_OFF, crc)

    def inject_cards(self, cards: dict[int, int]) -> tuple[int, list[str]]:
        """注入卡片到收藏。

        Args:
            cards: {CID: count} 字典, count 为持有数量 (1-9)

        Returns:
            (成功数, 警告列表)
        """
        gd = self._decompress_tdgy()
        injected = 0
        warnings: list[str] = []

        for cid, count in cards.items():
            nidx = self._c2n.get(cid)
            if nidx is None:
                warnings.append(f"CID {cid} 不在游戏卡池中")
                continue
            count = max(0, min(9, count))
            bo = self._nibble_base + nidx // 2
            if bo >= len(gd):
                continue
            v = gd[bo]
            if nidx % 2 == 0:
                v = (v & 0xF0) | (count & 0x0F)
            else:
                v = (v & 0x0F) | ((count & 0x0F) << 4)
            gd[bo] = v
            injected += 1

        self._write_tdgy(gd)
        self.sav_path.write_bytes(self._sav)
        return injected, warnings

    def get_card_count(self, cid: int) -> int:
        """读取指定卡片持有数量。"""
        nidx = self._c2n.get(cid)
        if nidx is None:
            return 0
        gd = self._decompress_tdgy()
        bo = self._nibble_base + nidx // 2
        if bo >= len(gd):
            return 0
        v = gd[bo]
        return (v & 0x0F) if nidx % 2 == 0 else (v >> 4) & 0x0F

    def read_collection(self) -> list[tuple[int, int]]:
        """读取所有持有卡片。

        Returns:
            [(CID, count), ...] 列表
        """
        gd = self._decompress_tdgy()
        result = []
        for cid, nidx in self._c2n.items():
            bo = self._nibble_base + nidx // 2
            if bo >= len(gd):
                continue
            v = gd[bo]
            count = (v & 0x0F) if nidx % 2 == 0 else (v >> 4) & 0x0F
            if count > 0:
                result.append((cid, count))
        return sorted(result)
