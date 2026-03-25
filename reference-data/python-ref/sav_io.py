"""读写 .sav 存档文件: 卡组、DP。"""
from __future__ import annotations

import struct
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .constants import (
    SAV_SIZE, SAV_MAGIC,
    CRGY_OFFSET, CRGY_SIZE, CRGY_MAGIC,
    CRGY_NAME_OFFSET, CRGY_NAME_SIZE,
    CRGY_MAIN_COUNT_OFFSET, CRGY_EXTRA_COUNT_OFFSET,
    CRGY_CARDS_OFFSET, CRGY_MAX_CARDS,
    DECK_SLOT_SIZE,
    TDGY_OFFSET, TDGY_SIZE, TDGY_MAGIC,
    TDGY_DP_OFFSET, TDGY_BACKUP_OFFSET,
    TDGY_VERSION_OFFSET, TDGY_TIMESTAMP_OFFSET,
    TDGY_MAIN_COUNT_OFFSET, TDGY_SIDE_COUNT_OFFSET,
)


@dataclass
class TdgyInfo:
    """TDGY 头部解析结果。"""
    version: int = 0
    dp: int = 0
    timestamp: int = 0
    main_count: int = 0
    side_count: int = 0


@dataclass
class Deck:
    """卡组数据。"""
    name: str = ""
    main_count: int = 0
    extra_count: int = 0
    main_cards: list[int] = field(default_factory=list)


class SavFile:
    """WC2009 .sav 文件读写器。"""

    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self._data = bytearray(self.path.read_bytes())
        if len(self._data) != SAV_SIZE:
            raise ValueError(f"SAV文件大小应为{SAV_SIZE}, 实际{len(self._data)}")
        if self._data[:8] != SAV_MAGIC:
            raise ValueError(f"SAV文件头错误, 期望{SAV_MAGIC}")

    def _crgy_offset(self, slot: int) -> int:
        if slot == 0:
            return CRGY_OFFSET
        return CRGY_OFFSET + CRGY_SIZE + (slot - 1) * DECK_SLOT_SIZE

    def read_tdgy_info(self) -> TdgyInfo:
        """解析 TDGY 块头部字段，返回 TdgyInfo。"""
        base = TDGY_OFFSET
        if self._data[base:base + 4] != TDGY_MAGIC:
            raise ValueError("TDGY magic 不匹配")

        version_base = 0x3B9ACA00
        raw_version = struct.unpack_from("<I", self._data, base + TDGY_VERSION_OFFSET)[0]
        version = raw_version - version_base

        dp = struct.unpack_from("<I", self._data, base + TDGY_DP_OFFSET)[0]
        timestamp = struct.unpack_from("<I", self._data, base + TDGY_TIMESTAMP_OFFSET)[0]
        main_count = self._data[base + TDGY_MAIN_COUNT_OFFSET]
        side_count = self._data[base + TDGY_SIDE_COUNT_OFFSET]

        return TdgyInfo(
            version=version,
            dp=dp,
            timestamp=timestamp,
            main_count=main_count,
            side_count=side_count,
        )

    def read_dp(self) -> int:
        """读取 DP 值。"""
        off = TDGY_OFFSET + TDGY_DP_OFFSET
        return struct.unpack_from("<I", self._data, off)[0]

    def write_dp(self, dp: int) -> None:
        """写入 DP 值 (同时更新备份)。"""
        off = TDGY_OFFSET + TDGY_DP_OFFSET
        struct.pack_into("<I", self._data, off, dp)
        backup_off = TDGY_BACKUP_OFFSET + TDGY_DP_OFFSET
        struct.pack_into("<I", self._data, backup_off, dp)
        self._save()

    def read_deck(self, slot: int = 0) -> Deck:
        """读取指定槽位的卡组。"""
        base = self._crgy_offset(slot)
        crgy = self._data[base:base + CRGY_SIZE]

        if crgy[:4] != CRGY_MAGIC:
            return Deck()

        name_bytes = crgy[CRGY_NAME_OFFSET:CRGY_NAME_OFFSET + CRGY_NAME_SIZE]
        name = name_bytes.split(b"\x00")[0].decode("shift-jis", errors="replace")

        main_count = struct.unpack_from("<H", crgy, CRGY_MAIN_COUNT_OFFSET)[0]
        extra_count = struct.unpack_from("<H", crgy, CRGY_EXTRA_COUNT_OFFSET)[0]

        cards = []
        for i in range(min(main_count + extra_count, CRGY_MAX_CARDS)):
            cid = struct.unpack_from("<H", crgy, CRGY_CARDS_OFFSET + i * 2)[0]
            if cid > 0:
                cards.append(cid)

        return Deck(
            name=name,
            main_count=main_count,
            extra_count=extra_count,
            main_cards=cards,
        )

    def write_deck(self, slot: int, deck: Deck) -> None:
        """写入卡组到指定槽位。"""
        base = self._crgy_offset(slot)

        name_bytes = deck.name.encode("shift-jis", errors="replace")[:CRGY_NAME_SIZE]
        name_bytes = name_bytes.ljust(CRGY_NAME_SIZE, b"\x00")
        self._data[base + CRGY_NAME_OFFSET:base + CRGY_NAME_OFFSET + CRGY_NAME_SIZE] = name_bytes

        struct.pack_into("<H", self._data, base + CRGY_MAIN_COUNT_OFFSET, deck.main_count)
        struct.pack_into("<H", self._data, base + CRGY_EXTRA_COUNT_OFFSET, deck.extra_count)

        cards_base = base + CRGY_CARDS_OFFSET
        for i in range(CRGY_MAX_CARDS):
            struct.pack_into("<H", self._data, cards_base + i * 2, 0)
        for i, cid in enumerate(deck.main_cards[:CRGY_MAX_CARDS]):
            struct.pack_into("<H", self._data, cards_base + i * 2, cid)

        self._save()

    def _save(self) -> None:
        """写回文件。"""
        self.path.write_bytes(self._data)
