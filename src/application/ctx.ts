import { HostEnvironmentConfig } from "@/browser-common/lib";
import {
	BanlistService,
	CardPredicateService,
	CardService,
	DeckExportService,
	DeckFileService,
	DeckService,
	FilterService,
	SortingService,
} from "@/core/lib";
import { TooltipController } from "@/tooltip/controller/TooltipController";
import { DeckController } from "./controller/DeckController";

export const environmentConfig = new HostEnvironmentConfig();

// 使用一个占位 cardDatabase 接口 —— 原项目的 YgoprodeckCardDatabase
// 此处简化为 null，在 App 启动时由本地 cards.json 替代
// 但原有组件仍依赖 CardDatabase 接口，需要提供一个空实现
import type { CardDatabase } from "@/core/lib";
import { FindCardBy } from "@/core/lib";

/**
 * 本地空 CardDatabase 实现（满足接口要求）。
 * 实际的卡片数据通过 src/data/cardDatabase.ts 管理。
 */
class LocalCardDatabase implements CardDatabase {
	async prepareAll(): Promise<void> {
		// 数据通过 loadCardDatabase() 加载，此处无需操作
	}

	async prepareCard(
		_cardKey: string,
		_findCardBy: FindCardBy,
	): Promise<string | null> {
		return null;
	}

	hasCard(_cardKey: string, _findCardBy: FindCardBy): boolean {
		return false;
	}

	getCard(_cardKey: string, _findCardBy: FindCardBy): null {
		return null;
	}

	getCards(): never[] {
		return [];
	}

	getSets(): never[] {
		return [];
	}

	getArchetypes(): never[] {
		return [];
	}

	getTypes(): never[] {
		return [];
	}

	getSubTypes(): never[] {
		return [];
	}

	getAttributes(): never[] {
		return [];
	}

	getLevels(): never[] {
		return [];
	}

	getLinkMarkers(): never[] {
		return [];
	}
}

const cardDatabase: CardDatabase = new LocalCardDatabase();

const cardService = new CardService();
const cardPredicateService = new CardPredicateService();
const banlistService = new BanlistService();
const sortingService = new SortingService(cardDatabase);
const filterService = new FilterService(cardService, banlistService);

const deckService = new DeckService(
	cardService,
	sortingService,
	banlistService,
);
const deckExportService = new DeckExportService(
	deckService,
	cardService,
	filterService,
);
const deckFileService = new DeckFileService(cardDatabase, deckService);

const deckController = new DeckController(cardDatabase, cardService);

const tooltipController = new TooltipController(cardDatabase);

export {
	banlistService,
	cardDatabase,
	cardPredicateService,
	cardService,
	deckController,
	deckExportService,
	deckFileService,
	deckService,
	filterService,
	sortingService,
	tooltipController,
};
