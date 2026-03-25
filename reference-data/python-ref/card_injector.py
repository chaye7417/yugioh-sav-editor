"""卡片注入器 - 生成 melonDS 金手指文件来修改特定卡片。

原理: 直接修改 RAM 中的半字节压缩卡片数组 (0x02120F02),
游戏保存时自动序列化到 LWORD_Tree → .sav。

使用方式:
    1. 生成 .mch 金手指文件
    2. melonDS 加载 ROM + .sav + .mch
    3. 进入游戏,等自动保存 (或手动保存)
    4. .sav 即包含修改后的卡片数据
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional


# JP 版 RAM 地址
CARD_NIBBLE_BASE = 0x02120F02  # 半字节卡片数组基址
CARD_NIBBLE_SIZE = 1488        # 总字节数 (44 turbo + 1444 main)


def _load_cid_to_nibble(data_dir: str) -> dict[int, int]:
    """加载 CID → nibble_index 映射。

    nibble_index 是卡片在 RAM 半字节数组 (0x02120F02) 中的直接索引。
    """
    path = Path(data_dir) / "cid_to_nibble.json"
    with open(path, encoding="utf-8") as f:
        return {int(k): int(v) for k, v in json.load(f).items()}


def cid_to_ram_addr(cid: int, cid_to_nibble: dict[int, int]) -> tuple[int, int]:
    """将 CID 转换为 RAM 地址和半字节位置。

    Args:
        cid: Konami 官方 CID
        cid_to_nibble: CID → nibble_idx 映射

    Returns:
        (byte_addr, nibble): byte_addr 是 RAM 字节地址, nibble 是 0(低) 或 1(高)

    Raises:
        KeyError: CID 不在映射中
    """
    nibble_idx = cid_to_nibble[cid]
    byte_addr = CARD_NIBBLE_BASE + nibble_idx // 2
    nibble = nibble_idx % 2  # 0=低半字节, 1=高半字节
    return byte_addr, nibble


def generate_ar_code(cid: int, count: int, cid_to_nibble: dict[int, int]) -> list[str]:
    """为单张卡生成 Action Replay 代码。

    Args:
        cid: 卡片 CID
        count: 持有数量 (1-9)
        cid_to_nibble: CID → nibble_idx 映射

    Returns:
        AR 代码行列表
    """
    if count < 0 or count > 9:
        raise ValueError(f"持有数量必须在 0-9 之间, 实际: {count}")

    byte_addr, nibble = cid_to_ram_addr(cid, cid_to_nibble)
    # NDS AR 代码地址需减去 0x02000000
    ar_addr = byte_addr & 0x0FFFFFFF

    if nibble == 0:
        val = count
    else:
        val = count << 4

    return [f"2{ar_addr:07X} 000000{val:02X}"]


def generate_mch_file(
    cards: dict[int, int],
    output_path: str,
    data_dir: str,
    name: str = "卡片注入",
) -> str:
    """生成 melonDS .mch 金手指文件。

    Args:
        cards: {CID: count} 字典, count 为持有数量 (1-9)
        output_path: 输出 .mch 文件路径
        data_dir: 项目目录 (含 cid_to_nibble.json)
        name: 金手指名称

    Returns:
        生成的文件路径
    """
    cid_to_nibble = _load_cid_to_nibble(data_dir)

    # 按字节地址分组, 合并同一字节的两个半字节
    byte_values: dict[int, int] = {}  # byte_addr → value
    skipped: list[str] = []

    for cid, count in cards.items():
        if cid not in cid_to_nibble:
            skipped.append(f"CID {cid} 不在游戏卡池中, 跳过")
            continue
        if count < 0 or count > 9:
            raise ValueError(f"CID {cid}: 数量 {count} 超出范围 0-9")

        nibble_idx = cid_to_nibble[cid]
        byte_addr = CARD_NIBBLE_BASE + nibble_idx // 2
        nibble = nibble_idx % 2

        if byte_addr not in byte_values:
            byte_values[byte_addr] = 0

        if nibble == 0:
            byte_values[byte_addr] = (byte_values[byte_addr] & 0xF0) | count
        else:
            byte_values[byte_addr] = (byte_values[byte_addr] & 0x0F) | (count << 4)

    warnings = list(skipped)

    # 生成 AR 代码 (地址需减去 0x02000000)
    ar_lines = []
    for byte_addr in sorted(byte_values.keys()):
        val = byte_values[byte_addr]
        ar_addr = byte_addr & 0x0FFFFFFF
        ar_lines.append(f"2{ar_addr:07X} 000000{val:02X}")

    # 写 .mch 文件 (melonDS 标准格式)
    output = Path(output_path)
    with open(output, "w", encoding="utf-8") as f:
        f.write("ROOT\n")
        f.write("\n")
        f.write(f"CODE 1 ({name})\n")
        for line in ar_lines:
            f.write(f"{line}\n")
        f.write("\n")

    return str(output), warnings


def generate_card_injection(
    cards: dict[int, int],
    data_dir: str,
) -> str:
    """生成卡片注入的 .mch 内容 (不写文件)。

    Args:
        cards: {CID: count} 字典

    Returns:
        .mch 文件内容字符串
    """
    cid_to_nibble = _load_cid_to_nibble(data_dir)

    konami_path = Path(data_dir) / "konami_card_db.json"
    with open(konami_path, encoding="utf-8") as f:
        konami_db = json.load(f)

    byte_values: dict[int, int] = {}
    for cid, count in cards.items():
        if cid not in cid_to_nibble:
            continue
        nibble_idx = cid_to_nibble[cid]
        byte_addr = CARD_NIBBLE_BASE + nibble_idx // 2
        nibble = nibble_idx % 2
        if byte_addr not in byte_values:
            byte_values[byte_addr] = 0
        if nibble == 0:
            byte_values[byte_addr] = (byte_values[byte_addr] & 0xF0) | count
        else:
            byte_values[byte_addr] = (byte_values[byte_addr] & 0x0F) | (count << 4)

    lines = []
    lines.append(f"ROOT")
    lines.append(f"")
    lines.append(f"CODE 1 (注入 {len(cards)} 张卡片)")
    for byte_addr in sorted(byte_values.keys()):
        val = byte_values[byte_addr]
        ar_addr = byte_addr & 0x0FFFFFFF
        lines.append(f"2{ar_addr:07X} 000000{val:02X}")
    lines.append("")

    return "\n".join(lines)
