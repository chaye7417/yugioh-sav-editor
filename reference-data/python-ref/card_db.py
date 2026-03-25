"""卡片数据库: CID → 卡名查询。"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class CardInfo:
    """卡片信息。"""
    cid: int
    name: str
    card_type: str = ""
    attribute: str = ""
    race: str = ""
    atk: Optional[int] = None
    def_: Optional[int] = None
    level: Optional[int] = None


class CardDB:
    """卡片数据库, 支持 CID 和名称查询。"""

    def __init__(self) -> None:
        self._by_cid: dict[int, CardInfo] = {}
        self._by_name: dict[str, CardInfo] = {}

    @classmethod
    def from_json(cls, konami_db_path: str, pw_db_path: str) -> CardDB:
        """从已有的JSON文件加载数据库。

        Args:
            konami_db_path: konami_card_db.json 路径
            pw_db_path: pw_to_name.json 路径
        """
        db = cls()

        with open(konami_db_path, encoding="utf-8") as f:
            konami_data = json.load(f)
        for cid_str, info in konami_data.items():
            cid = int(cid_str)
            card = CardInfo(
                cid=cid,
                name=info.get("name_en", ""),
                card_type=info.get("type", ""),
                attribute=info.get("attribute", ""),
                race=info.get("race", ""),
                atk=info.get("atk"),
                def_=info.get("def"),
                level=info.get("level"),
            )
            db._by_cid[cid] = card
            db._by_name[card.name.lower()] = card

        return db

    def get_name(self, cid: int) -> Optional[str]:
        """通过 CID 查卡名。"""
        card = self._by_cid.get(cid)
        return card.name if card else None

    def get_info(self, cid: int) -> Optional[CardInfo]:
        """通过 CID 查完整卡片信息。"""
        return self._by_cid.get(cid)

    def search(self, keyword: str) -> list[CardInfo]:
        """按名称关键词搜索。"""
        keyword_lower = keyword.lower()
        return [
            card for card in self._by_cid.values()
            if keyword_lower in card.name.lower()
        ]
