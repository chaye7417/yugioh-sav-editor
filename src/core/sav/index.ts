/**
 * 存档引擎。
 *
 * 提供 .sav 文件的解析、编辑和写回功能。
 * 支持 WC2008 和 WC2009 两个版本。
 */

export type {
  SaveData,
  TdgyBlock,
  CrgyRecipe,
  TrunkCard,
  CardCollection,
  ActiveDeck,
} from "./types";

export type { GameVersion, GameProfile } from "./gameProfiles";
export {
  WC2007_PROFILE,
  WC2008_PROFILE,
  WC2009_PROFILE,
  GAME_PROFILES,
  detectGameVersion,
} from "./gameProfiles";

export { parseSav } from "./savParser";
export { writeSav } from "./savWriter";
export { readRecipe, readAllRecipes, writeRecipe } from "./recipeEditor";
export {
  getCardCount,
  setCardCount,
  setAllCards,
} from "./collectionEditor";
export { readTrunk, trunkToCollection, getTrunkStats } from "./trunkReader";
export { readActiveDeck, writeActiveDeck } from "./activeDeckEditor";
export { decompress, compress } from "./lz10";
export { crc32 } from "./crc32";
