"""背包卡片读取 - 抽象接口 + savestate 实现。

以后实现直接读 .sav 时, 只需新增 SavTrunkReader(TrunkReader) 即可。
"""
from __future__ import annotations

import struct
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from .constants import (
    MAINRAM_FILE_OFFSET,
    TRUNK_RAM_SEGMENTS,
    CID_MIN, CID_MAX, COUNT_MAX,
)


@dataclass
class TrunkCard:
    """背包中的一张卡。"""
    cid: int
    count: int


class TrunkReader(ABC):
    """背包读取抽象接口。

    以后实现 SavTrunkReader 时继承此类即可替换。
    """

    @abstractmethod
    def read(self, file_path: str) -> list[TrunkCard]:
        """从单个文件读取背包卡片。"""
        ...

    def read_dual(self, path_a: str, path_b: str) -> list[TrunkCard]:
        """从两个文件对比读取 (默认: 合并单次读取结果)。"""
        cards_a = {c.cid: c for c in self.read(path_a)}
        cards_b = {c.cid: c for c in self.read(path_b)}
        merged = {**cards_a, **cards_b}
        return sorted(merged.values(), key=lambda c: c.cid)


class SavestateTrunkReader(TrunkReader):
    """通过 melonDS savestate 读取背包。"""

    def read(self, file_path: str) -> list[TrunkCard]:
        """从单个 savestate 读取背包 (约 149/165)。"""
        data = Path(file_path).read_bytes()
        cards: dict[int, int] = {}

        for ram_addr in TRUNK_RAM_SEGMENTS:
            offset = MAINRAM_FILE_OFFSET + (ram_addr - 0x02000000)
            self._read_segment(data, offset, cards)

        return [TrunkCard(cid=c, count=n) for c, n in sorted(cards.items())]

    def read_dual(self, path_a: str, path_b: str) -> list[TrunkCard]:
        """双 savestate 差异法读取 (165/165)。

        原理: 在两个 savestate 中一致的 (CID, count) 对就是背包卡片。
        额外通过可靠区域和出现频率过滤非背包数据。
        """
        data_a = Path(path_a).read_bytes()
        data_b = Path(path_b).read_bytes()

        # 1. 从可靠区域读取已知卡片
        reliable_cids: set[int] = set()
        for data in [data_a, data_b]:
            for ram_addr in TRUNK_RAM_SEGMENTS:
                offset = MAINRAM_FILE_OFFSET + (ram_addr - 0x02000000)
                seg_cards: dict[int, int] = {}
                self._read_segment(data, offset, seg_cards)
                reliable_cids.update(seg_cards.keys())

        # 2. 扫描整个 MainRAM, 找两个 savestate 中一致的 (CID, count) 对
        same_pairs: dict[int, int] = {}
        min_len = min(len(data_a), len(data_b))
        for i in range(0, min_len - MAINRAM_FILE_OFFSET - 4, 4):
            off = MAINRAM_FILE_OFFSET + i
            if off + 4 > min_len:
                break
            ca = struct.unpack_from("<H", data_a, off)[0]
            va = struct.unpack_from("<H", data_a, off + 2)[0]
            cb = struct.unpack_from("<H", data_b, off)[0]
            vb = struct.unpack_from("<H", data_b, off + 2)[0]
            if ca == cb and va == vb and CID_MIN <= ca <= CID_MAX and 1 <= va <= COUNT_MAX:
                if ca not in same_pairs:
                    same_pairs[ca] = va

        # 3. 找变化的卡 (如 AE 从 3->2)
        changed: dict[int, int] = {}
        for i in range(0, min_len - MAINRAM_FILE_OFFSET - 4, 4):
            off = MAINRAM_FILE_OFFSET + i
            if off + 4 > min_len:
                break
            ca = struct.unpack_from("<H", data_a, off)[0]
            va = struct.unpack_from("<H", data_a, off + 2)[0]
            cb = struct.unpack_from("<H", data_b, off)[0]
            vb = struct.unpack_from("<H", data_b, off + 2)[0]
            if ca == cb and CID_MIN <= ca <= CID_MAX and 1 <= va <= COUNT_MAX and 1 <= vb <= COUNT_MAX and va != vb:
                if ca not in changed:
                    changed[ca] = max(va, vb)

        # 4. 合并: 可靠区域的 + 一致对中频率最低的补充
        result: dict[int, int] = {}
        for cid, cnt in same_pairs.items():
            if cid in reliable_cids:
                result[cid] = cnt
        result.update(changed)

        # 5. 补充不在可靠区域但在一致对中的(按出现频率排序)
        if len(result) < 165:
            extra = {c: v for c, v in same_pairs.items() if c not in result}
            freq: dict[int, int] = {}
            for i in range(0, min_len - MAINRAM_FILE_OFFSET - 4, 4):
                off = MAINRAM_FILE_OFFSET + i
                if off + 4 > min_len:
                    break
                c = struct.unpack_from("<H", data_a, off)[0]
                v = struct.unpack_from("<H", data_a, off + 2)[0]
                if c in extra and CID_MIN <= c <= CID_MAX and 1 <= v <= COUNT_MAX:
                    freq[c] = freq.get(c, 0) + 1

            for cid, cnt in sorted(extra.items(), key=lambda x: freq.get(x[0], 999)):
                if len(result) >= 165:
                    break
                result[cid] = cnt

        return [TrunkCard(cid=c, count=n) for c, n in sorted(result.items())]

    @staticmethod
    def _read_segment(data: bytes, offset: int, cards: dict[int, int]) -> None:
        """读取一个连续的 (CID, count) 段。"""
        while offset + 4 <= len(data):
            cid = struct.unpack_from("<H", data, offset)[0]
            count = struct.unpack_from("<H", data, offset + 2)[0]
            if CID_MIN <= cid <= CID_MAX and 1 <= count <= 9:
                if cid not in cards or (count <= COUNT_MAX and cards.get(cid, 99) > COUNT_MAX):
                    cards[cid] = min(count, COUNT_MAX)
                offset += 4
            else:
                break


class SavTrunkReader(TrunkReader):
    """从 .sav 读取背包卡片。

    由于 LWORD_Tree 格式复杂, 需要 savestate 辅助:
    从 savestate 读取完整收藏 (SavestateTrunkReader 已实现)。

    如果没有 savestate, 无法读取背包。
    """

    def read(self, file_path: str, savestate_path: str | None = None) -> list[TrunkCard]:
        """从 .sav 读取背包。

        Args:
            file_path: .sav 文件路径
            savestate_path: 可选的 melonDS savestate 路径

        Returns:
            背包卡片列表

        Raises:
            NotImplementedError: 如果未提供 savestate
        """
        if savestate_path is None:
            raise NotImplementedError(
                "LWORD_Tree 格式无法直接从 .sav 解析。"
                "请提供 savestate_path 参数 (melonDS .ml1/.ml2 文件)。"
            )
        ss_reader = SavestateTrunkReader()
        return ss_reader.read(savestate_path)

    def read_deck_info(self, file_path: str) -> dict[str, int]:
        """从 .sav 读取卡组信息。

        Args:
            file_path: .sav 文件路径

        Returns:
            包含 main_count, side_count, dp 的字典
        """
        from .sav_io import SavFile
        sav = SavFile(file_path)
        info = sav.read_tdgy_info()
        return {
            "main_count": info.main_count,
            "side_count": info.side_count,
            "dp": info.dp,
        }
