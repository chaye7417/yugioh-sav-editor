"""预制卡组 (My Recipe) 读写工具。

支持从 YDK 文件导入卡组到 .sav 的 CRGY 预制卡组槽位。
"""
from __future__ import annotations

import json
import struct
import zlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# CRGY 预制卡组常量
CRGY_MAGIC = b"CRGY"
CRGY_SLOT_SIZE = 228
CRGY_SLOT_OFFSETS = [0x45A8 + i * 228 for i in range(50)]
CRGY_SLOT_COUNT = 50
CRGY_FLAG_OFFSET = 0x08
CRGY_NAME_OFFSET = 0x09
CRGY_NAME_SIZE = 23
CRGY_MAIN_COUNT_OFFSET = 0x24
CRGY_SIDE_COUNT_OFFSET = 0x28
CRGY_EXTRA_COUNT_OFFSET = 0x2C
CRGY_CARDS_OFFSET = 0x30
CRGY_MAIN_MAX = 60
CRGY_SIDE_MAX = 15
CRGY_EXTRA_MAX = 15
CRGY_SIDE_START = 60   # CID 数组中副卡组起始索引
CRGY_EXTRA_START = 75  # CID 数组中额外卡组起始索引


@dataclass
class RecipeDeck:
    """预制卡组数据。"""

    name: str = ""
    main_cids: list[int] = field(default_factory=list)
    side_cids: list[int] = field(default_factory=list)
    extra_cids: list[int] = field(default_factory=list)

    @property
    def main_count(self) -> int:
        return len(self.main_cids)

    @property
    def side_count(self) -> int:
        return len(self.side_cids)

    @property
    def extra_count(self) -> int:
        return len(self.extra_cids)

    @property
    def total_count(self) -> int:
        return self.main_count + self.side_count + self.extra_count


@dataclass
class PwLookupResult:
    """密码查找结果。"""

    passcode: str
    name: str
    cid: int
    fuzzy: bool = False  # 是否通过模糊匹配 (±1/±2)
    original_pw: str = ""  # 模糊匹配时的原始密码


class PasscodeResolver:
    """密码 → CID 转换器, 支持旧版密码自动容错。"""

    def __init__(self, pw_to_name: dict[str, str],
                 name_to_cid: dict[str, int],
                 cid_to_nibble: dict[str, int]) -> None:
        self._pw_to_name = pw_to_name
        self._name_to_cid = name_to_cid
        self._cid_to_nibble = cid_to_nibble

    @classmethod
    def from_project(cls, project_dir: str,
                     data_dir: Optional[str] = None) -> PasscodeResolver:
        """从项目目录加载所有数据文件。

        Args:
            project_dir: 项目根目录 (含 common/)
            data_dir: 版本数据目录 (含 cid_to_nibble.json), 默认为 project_dir/data
        """
        base = Path(project_dir)
        data = Path(data_dir) if data_dir else base / "data"

        with open(base / "common" / "pw_to_name.json", encoding="utf-8") as f:
            pw_to_name = json.load(f)

        with open(base / "common" / "konami_card_db.json", encoding="utf-8") as f:
            konami_db = json.load(f)

        name_to_cid: dict[str, int] = {}
        for cid_str, info in konami_db.items():
            name = info.get("name_en", "")
            if name:
                name_to_cid[name.lower()] = int(cid_str)

        with open(data / "cid_to_nibble.json", encoding="utf-8") as f:
            cid_to_nibble = json.load(f)

        return cls(pw_to_name, name_to_cid, cid_to_nibble)

    def _lookup_pw(self, pw: str) -> Optional[str]:
        """精确查找密码 → 卡名, 尝试多种格式。"""
        return (self._pw_to_name.get(pw)
                or self._pw_to_name.get(pw.lstrip("0") or "0")
                or self._pw_to_name.get(pw.zfill(8)))

    def resolve(self, passcode: str) -> Optional[PwLookupResult]:
        """将密码转换为 CID。

        先精确匹配, 失败后尝试 ±1, ±2 模糊匹配 (处理旧版密码勘误)。

        Args:
            passcode: YDK 文件中的密码字符串

        Returns:
            PwLookupResult 或 None
        """
        # 精确匹配
        name = self._lookup_pw(passcode)
        if name:
            cid = self._name_to_cid.get(name.lower())
            if cid:
                return PwLookupResult(passcode=passcode, name=name,
                                      cid=cid, fuzzy=False)

        # 模糊匹配: ±1, ±2
        pw_int = int(passcode)
        for delta in [1, -1, 2, -2]:
            candidate = str(pw_int + delta)
            name = self._lookup_pw(candidate)
            if name:
                cid = self._name_to_cid.get(name.lower())
                if cid:
                    return PwLookupResult(
                        passcode=candidate, name=name, cid=cid,
                        fuzzy=True, original_pw=passcode,
                    )

        return None

    def is_in_game(self, cid: int) -> bool:
        """检查 CID 是否在 WC2009 游戏卡池中。"""
        return str(cid) in self._cid_to_nibble


def parse_ydk(ydk_path: str) -> RecipeDeck:
    """解析 YDK 文件, 返回密码列表 (尚未转换为 CID)。

    Args:
        ydk_path: YDK 文件路径

    Returns:
        RecipeDeck, 其中 CID 列表实际存储的是密码 (int)
    """
    lines = Path(ydk_path).read_text(encoding="utf-8").strip().split("\n")
    section = None
    main_pws: list[int] = []
    extra_pws: list[int] = []
    side_pws: list[int] = []

    for line in lines:
        line = line.strip()
        if line.startswith("#main"):
            section = "main"
        elif line.startswith("#extra"):
            section = "extra"
        elif line.startswith("!side"):
            section = "side"
        elif line.startswith("#") or not line:
            continue
        elif section == "main":
            main_pws.append(int(line))
        elif section == "extra":
            extra_pws.append(int(line))
        elif section == "side":
            side_pws.append(int(line))

    deck = RecipeDeck()
    deck.main_cids = main_pws  # 暂存密码, 后续由 convert 转换
    deck.extra_cids = extra_pws
    deck.side_cids = side_pws
    return deck


@dataclass
class ConvertReport:
    """YDK → CID 转换报告。"""

    deck: RecipeDeck
    fuzzy_matches: list[PwLookupResult] = field(default_factory=list)
    not_in_game: list[PwLookupResult] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    truncated: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return len(self.failed) == 0


def convert_ydk_to_recipe(ydk_path: str, deck_name: str,
                           resolver: PasscodeResolver) -> ConvertReport:
    """将 YDK 文件转换为 RecipeDeck。

    Args:
        ydk_path: YDK 文件路径
        deck_name: 卡组名称
        resolver: 密码转换器

    Returns:
        ConvertReport 包含转换结果和诊断信息
    """
    raw = parse_ydk(ydk_path)
    report = ConvertReport(deck=RecipeDeck(name=deck_name))

    for label, raw_pws, target_list in [
        ("主卡组", raw.main_cids, report.deck.main_cids),
        ("额外卡组", raw.extra_cids, report.deck.extra_cids),
        ("副卡组", raw.side_cids, report.deck.side_cids),
    ]:
        target_list.clear()
        for pw_int in raw_pws:
            pw_str = str(pw_int)
            result = resolver.resolve(pw_str)
            if not result:
                report.failed.append(f"[{label}] 密码 {pw_str} 无法识别")
                continue

            target_list.append(result.cid)

            if result.fuzzy:
                report.fuzzy_matches.append(result)

            if not resolver.is_in_game(result.cid):
                report.not_in_game.append(result)

    return report


def read_recipe(sav_data: bytes, slot: int) -> RecipeDeck:
    """从 .sav 读取预制卡组。

    Args:
        sav_data: 完整 .sav 文件数据
        slot: 槽位索引 (0-49)
    """
    if slot < 0 or slot >= CRGY_SLOT_COUNT:
        raise ValueError(f"槽位必须为 0-{CRGY_SLOT_COUNT - 1}, 收到: {slot}")

    base = CRGY_SLOT_OFFSETS[slot]
    magic = sav_data[base:base + 4]
    if magic != CRGY_MAGIC:
        return RecipeDeck()  # 空槽位

    name_bytes = sav_data[base + CRGY_NAME_OFFSET:
                          base + CRGY_NAME_OFFSET + CRGY_NAME_SIZE]
    name = name_bytes.split(b"\x00")[0].decode("ascii", errors="replace")

    main_count = struct.unpack_from("<H", sav_data, base + CRGY_MAIN_COUNT_OFFSET)[0]
    side_count = struct.unpack_from("<H", sav_data, base + CRGY_SIDE_COUNT_OFFSET)[0]
    extra_count = struct.unpack_from("<H", sav_data, base + CRGY_EXTRA_COUNT_OFFSET)[0]

    cid_base = base + CRGY_CARDS_OFFSET
    main_cids = [struct.unpack_from("<H", sav_data, cid_base + i * 2)[0]
                 for i in range(main_count)]
    side_cids = [struct.unpack_from("<H", sav_data, cid_base + (CRGY_SIDE_START + i) * 2)[0]
                 for i in range(side_count)]
    extra_cids = [struct.unpack_from("<H", sav_data, cid_base + (CRGY_EXTRA_START + i) * 2)[0]
                  for i in range(extra_count)]

    return RecipeDeck(name=name, main_cids=main_cids,
                      side_cids=side_cids, extra_cids=extra_cids)


def write_recipe(sav_data: bytearray, slot: int, deck: RecipeDeck) -> list[str]:
    """将预制卡组写入 .sav 数据。

    超出上限的卡片会被自动截断并返回警告信息。

    Args:
        sav_data: 可变的 .sav 文件数据
        slot: 槽位索引 (0-49)
        deck: 要写入的卡组 (名称仅支持 ASCII)
    """
    if slot < 0 or slot >= CRGY_SLOT_COUNT:
        raise ValueError(f"槽位必须为 0-{CRGY_SLOT_COUNT - 1}, 收到: {slot}")

    warnings: list[str] = []
    if deck.main_count > CRGY_MAIN_MAX:
        warnings.append(f"主卡组 {deck.main_count} 张截断到 {CRGY_MAIN_MAX}")
        deck.main_cids = deck.main_cids[:CRGY_MAIN_MAX]
    if deck.side_count > CRGY_SIDE_MAX:
        warnings.append(f"副卡组 {deck.side_count} 张截断到 {CRGY_SIDE_MAX}")
        deck.side_cids = deck.side_cids[:CRGY_SIDE_MAX]
    if deck.extra_count > CRGY_EXTRA_MAX:
        warnings.append(f"额外卡组 {deck.extra_count} 张截断到 {CRGY_EXTRA_MAX}")
        deck.extra_cids = deck.extra_cids[:CRGY_EXTRA_MAX]

    base = CRGY_SLOT_OFFSETS[slot]

    # 清空并写入 CRGY magic
    sav_data[base + 4:base + CRGY_SLOT_SIZE] = b"\x00" * (CRGY_SLOT_SIZE - 4)
    sav_data[base:base + 4] = CRGY_MAGIC

    # 标志位
    sav_data[base + CRGY_FLAG_OFFSET] = 0x01

    # 卡组名 (ASCII)
    name_bytes = deck.name.encode("ascii", errors="replace")[:CRGY_NAME_SIZE - 1]
    sav_data[base + CRGY_NAME_OFFSET:
             base + CRGY_NAME_OFFSET + len(name_bytes)] = name_bytes

    # 数量
    struct.pack_into("<H", sav_data, base + CRGY_MAIN_COUNT_OFFSET, deck.main_count)
    struct.pack_into("<H", sav_data, base + CRGY_SIDE_COUNT_OFFSET, deck.side_count)
    struct.pack_into("<H", sav_data, base + CRGY_EXTRA_COUNT_OFFSET, deck.extra_count)

    # CID 数组
    cid_base = base + CRGY_CARDS_OFFSET
    for i, cid in enumerate(deck.main_cids):
        struct.pack_into("<H", sav_data, cid_base + i * 2, cid)
    for i, cid in enumerate(deck.side_cids):
        struct.pack_into("<H", sav_data, cid_base + (CRGY_SIDE_START + i) * 2, cid)
    for i, cid in enumerate(deck.extra_cids):
        struct.pack_into("<H", sav_data, cid_base + (CRGY_EXTRA_START + i) * 2, cid)

    # 更新 CRC32
    crc = zlib.crc32(bytes(sav_data[base + 0x08:base + CRGY_SLOT_SIZE])) & 0xFFFFFFFF
    struct.pack_into("<I", sav_data, base + 0x04, crc)

    return warnings


def import_ydk_to_sav(ydk_path: str, sav_path: str, slot: int,
                       deck_name: str, project_dir: str,
                       data_dir: Optional[str] = None) -> ConvertReport:
    """一键导入 YDK 文件到 .sav 预制卡组。

    Args:
        ydk_path: YDK 文件路径
        sav_path: .sav 文件路径
        slot: 目标槽位 (0-49)
        deck_name: 卡组名称 (仅支持 ASCII)
        project_dir: 项目根目录 (含 common/)
        data_dir: 版本数据目录 (含 cid_to_nibble.json)
    """
    resolver = PasscodeResolver.from_project(project_dir, data_dir)
    report = convert_ydk_to_recipe(ydk_path, deck_name, resolver)

    if not report.ok:
        return report

    sav_data = bytearray(Path(sav_path).read_bytes())
    report.truncated = write_recipe(sav_data, slot, report.deck)
    Path(sav_path).write_bytes(sav_data)

    return report
