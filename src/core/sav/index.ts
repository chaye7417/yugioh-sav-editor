/**
 * WC2009 存档引擎。
 *
 * 提供 .sav 文件的解析、编辑和写回功能。
 */

export type {
  SaveData,
  TdgyBlock,
  CrgyRecipe,
  TrunkCard,
  CardCollection,
} from "./types";

export { parseSav } from "./savParser";
export { writeSav } from "./savWriter";
export { readRecipe, readAllRecipes, writeRecipe } from "./recipeEditor";
export {
  getCardCount,
  setCardCount,
  injectCards,
  readCollection,
  setAllCards,
} from "./collectionEditor";
export { readTrunk, trunkToCollection, getTrunkStats } from "./trunkReader";
export { decompress, compress } from "./lz10";
export { crc32 } from "./crc32";
