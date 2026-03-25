"""WC2009 存档格式常量。"""

# SAV 文件
SAV_SIZE = 0x10000  # 64KB
SAV_MAGIC = b"YuGiWC08"

# CRGY 预制卡组块 (My Recipe)
CRGY_OFFSET = 0x45A8
CRGY_SIZE = 228                # 每个槽位 228 字节
CRGY_MAGIC = b"CRGY"
CRGY_NAME_OFFSET = 0x09       # ASCII 卡组名, 23字节
CRGY_NAME_SIZE = 23
CRGY_MAIN_COUNT_OFFSET = 0x24  # uint16 LE
CRGY_SIDE_COUNT_OFFSET = 0x28  # uint16 LE
CRGY_EXTRA_COUNT_OFFSET = 0x2C # uint16 LE
CRGY_CARDS_OFFSET = 0x30       # uint16 LE × 90
CRGY_MAX_CARDS = 90            # 主60 + 副15 + 额外15
DECK_SLOT_SIZE = 228           # 所有槽位等间距
DECK_SLOT_COUNT = 50           # 50 个预制卡组槽位

# TDGY 游戏状态
TDGY_OFFSET = 0xB51C
TDGY_SIZE = 2259
TDGY_MAGIC = b"TDGY"
TDGY_BACKUP_OFFSET = 0xDA8C

# TDGY 头部字段 (相对于 TDGY 块起始)
TDGY_VERSION_OFFSET = 0x04       # uint32 LE, 基值 0x3B9ACA00
TDGY_VERSION_BASE = 0x3B9ACA00
TDGY_DATALEN_OFFSET = 0x08       # uint32 LE, LZ10 压缩数据长度
TDGY_CRC32_OFFSET = 0x0C         # uint32 LE, CRC32(压缩数据)
TDGY_GAMEDATA_OFFSET = 0x10      # LZ10 压缩的 gamedata 起始

# 解压后 gamedata 结构 (WC2009: 9552 bytes)
# TDGY gamedata 使用 LZ10 压缩, 解压后映射到 RAM 0x021204B4
GAMEDATA_DECOMP_SIZE = 0x2550    # 9552 bytes (WC2009)
GD_DP = 0x024                    # uint32 LE, 决斗积分
GD_NIBBLE_ARRAY = 0xA4E          # 半字节数组 (1488 bytes, 每 nibble = 持有数 0-9)
GD_NIBBLE_ARRAY_SIZE = 1488

# WC2008 解压后 gamedata (9968 bytes)
# 映射到 RAM 0x02111840, nibble 基址 0x02111E9A
WC2008_GD_NIBBLE_ARRAY = 0x065A  # WC2008 半字节数组偏移

# 兼容旧接口的别名
TDGY_DP_OFFSET = TDGY_DATALEN_OFFSET  # 注意: 旧代码误将此当 DP, 实际是 data_len

# CID 有效范围
CID_MIN = 3500
CID_MAX = 8200
COUNT_MAX = 9                    # 每张卡最多持有 9 张

# melonDS Savestate
MAINRAM_FILE_OFFSET = 0x1C
MAINRAM_SIZE = 0x1000000

# 卡片数据缓冲区 (RAM地址, JP CY8J)
TRUNK_RAM_SEGMENTS = [
    0x02251978,
    0x022551E0,
    0x02257F5C,
    0x022580B4,
]
