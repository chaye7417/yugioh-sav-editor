"""背包写入器 - 通过卡组修改间接管理背包。"""
from __future__ import annotations

import struct
from pathlib import Path

from .constants import (
    SAV_SIZE, SAV_MAGIC,
    CRGY_OFFSET, CRGY_SIZE, CRGY_MAGIC,
    CRGY_NAME_OFFSET, CRGY_NAME_SIZE,
    CRGY_MAIN_COUNT_OFFSET, CRGY_EXTRA_COUNT_OFFSET,
    CRGY_CARDS_OFFSET, CRGY_MAX_CARDS,
    DECK_SLOT_SIZE,
    TDGY_OFFSET, TDGY_SIZE,
    TDGY_DP_OFFSET, TDGY_BACKUP_OFFSET,
    TDGY_MAIN_COUNT_OFFSET, TDGY_SIDE_COUNT_OFFSET,
)


class SavTrunkWriter:
    """WC2009 存档写入器。

    支持:
    - 修改 DP
    - 修改卡组计数 (主/副)
    - 写入 CRGY 卡组块
    - 自动同步 TDGY 备份

    不支持 (LWORD_Tree 限制):
    - 直接添加新卡到收藏
    - 修改卡片持有数量
    """

    def __init__(self, path: str) -> None:
        """初始化写入器。

        Args:
            path: .sav 文件路径
        """
        self.path = Path(path)
        self._data = bytearray(self.path.read_bytes())
        if len(self._data) != SAV_SIZE:
            raise ValueError(f"SAV 大小应为 {SAV_SIZE}, 实际 {len(self._data)}")
        if self._data[:8] != SAV_MAGIC:
            raise ValueError("SAV 文件头错误")

    def read_tdgy_info(self):
        """读取 TDGY 信息。"""
        from .sav_io import SavFile, TdgyInfo
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".sav", delete=False) as tmp:
            tmp.write(self._data)
            tmp_path = tmp.name
        try:
            return SavFile(tmp_path).read_tdgy_info()
        finally:
            Path(tmp_path).unlink()

    def write_dp(self, dp: int) -> None:
        """写入 DP 并同步备份。

        Args:
            dp: DP 值
        """
        off = TDGY_OFFSET + TDGY_DP_OFFSET
        struct.pack_into("<I", self._data, off, dp)
        self._sync_backup()
        self._save()

    def write_side_count(self, count: int) -> None:
        """修改副卡组数量。

        Args:
            count: 副卡组卡片数量
        """
        off = TDGY_OFFSET + TDGY_SIDE_COUNT_OFFSET
        self._data[off] = count
        self._sync_backup()
        self._save()

    def write_main_count(self, count: int) -> None:
        """修改主卡组数量。

        Args:
            count: 主卡组卡片数量
        """
        off = TDGY_OFFSET + TDGY_MAIN_COUNT_OFFSET
        self._data[off] = count
        self._sync_backup()
        self._save()

    def write_crgy_deck(
        self,
        slot: int,
        name: str,
        main_cids: list[int],
        extra_cids: list[int],
        side_cids: list[int] | None = None,
    ) -> None:
        """写入 CRGY 卡组块到指定槽位。

        Args:
            slot: 卡组槽位 (0-49)
            name: 卡组名称 (Shift-JIS)
            main_cids: 主卡组 CID 列表
            extra_cids: 额外卡组 CID 列表
            side_cids: 未使用, CRGY 不存储副卡组
        """
        base = self._crgy_offset(slot)

        # 清空槽位
        self._data[base:base + CRGY_SIZE] = b"\x00" * CRGY_SIZE

        # 魔数
        self._data[base:base + 4] = CRGY_MAGIC

        # 卡组名
        name_bytes = name.encode("shift-jis", errors="replace")[:CRGY_NAME_SIZE]
        name_bytes = name_bytes.ljust(CRGY_NAME_SIZE, b"\x00")
        self._data[base + CRGY_NAME_OFFSET:base + CRGY_NAME_OFFSET + CRGY_NAME_SIZE] = name_bytes

        # 计数
        struct.pack_into("<H", self._data, base + CRGY_MAIN_COUNT_OFFSET, len(main_cids))
        struct.pack_into("<H", self._data, base + CRGY_EXTRA_COUNT_OFFSET, len(extra_cids))

        # CID 数组: main + extra
        all_cids = main_cids + extra_cids
        cards_base = base + CRGY_CARDS_OFFSET
        for i in range(CRGY_MAX_CARDS):
            struct.pack_into("<H", self._data, cards_base + i * 2, 0)
        for i, cid in enumerate(all_cids[:CRGY_MAX_CARDS]):
            struct.pack_into("<H", self._data, cards_base + i * 2, cid)

        self._save()

    def _crgy_offset(self, slot: int) -> int:
        """计算 CRGY 槽位偏移。"""
        if slot == 0:
            return CRGY_OFFSET
        return CRGY_OFFSET + CRGY_SIZE + (slot - 1) * DECK_SLOT_SIZE

    def _sync_backup(self) -> None:
        """同步 TDGY 备份副本。"""
        primary = self._data[TDGY_OFFSET:TDGY_OFFSET + TDGY_SIZE]
        self._data[TDGY_BACKUP_OFFSET:TDGY_BACKUP_OFFSET + TDGY_SIZE] = primary

    def _save(self) -> None:
        """写回文件。"""
        self.path.write_bytes(self._data)
