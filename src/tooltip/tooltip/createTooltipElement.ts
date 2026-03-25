import type { Card } from "@/core/lib";
import { CardTypeCategory } from "@/core/lib";
import {
	createDiv,
	createImg,
	createP,
	createSpan,
} from "./domHelper";

const CARD_IMG_BASE = "https://cdn.233.momobako.com/ygopro/pics/";

export const createLoadingTooltip = (): HTMLElement =>
	createDiv(
		["card-tooltip__content", "card-tooltip__content--loading"],
		[
			createDiv(
				["card-tooltip__loading"],
				[
					createSpan(["fas", "fa-spinner", "fa-spin"], ""),
					createSpan([], "加载中..."),
				],
			),
		],
	);

const createMonsterStats = (card: Card): HTMLElement => {
	const statsChildren: HTMLElement[] = [];
	if (card.atk != null) {
		statsChildren.push(createSpan([], `ATK/ ${card.atk}`));
	}
	if (card.def != null) {
		statsChildren.push(createSpan([], `DEF/ ${card.def}`));
	} else if (card.linkRating != null) {
		statsChildren.push(createSpan([], `LINK-${card.linkRating}`));
	}
	return createDiv(["card-tooltip__stats"], statsChildren);
};

const createSubType = (card: Card): HTMLElement => {
	const subTypeChildren: HTMLElement[] = [];

	if (card.type.category === CardTypeCategory.MONSTER) {
		subTypeChildren.push(createSpan([], `属性: ${card.attribute!}`));
	}
	subTypeChildren.push(createSpan([], `类型: ${card.subType}`));

	return createDiv(["card-tooltip__subtype"], subTypeChildren);
};

const createDescription = (card: Card): HTMLElement =>
	createDiv(
		["card-tooltip__description"],
		card.description.split("\n").map((paragraph) => createP([], paragraph)),
	);

const createCardDetailsCol = (card: Card): HTMLElement => {
	const children: HTMLElement[] = [];

	const primaryDetails = createDiv(
		["card-tooltip__details"],
		[
			createSpan(["card-tooltip__name"], card.name),
		],
	);
	children.push(primaryDetails);

	if (card.type.category === CardTypeCategory.MONSTER) {
		children.push(createMonsterStats(card));
	}

	if (card.type.category !== CardTypeCategory.SKILL) {
		children.push(createSubType(card));
	}

	if (card.type.category === CardTypeCategory.MONSTER) {
		if (card.level != null) {
			const level = createDiv(
				["card-tooltip__level"],
				[
					createSpan([], `等级/阶级: ${card.level}`),
				],
			);
			children.push(level);
		} else if (card.linkMarkers != null) {
			const linkMarkers = createDiv(
				["card-tooltip__link-markers"],
				[
					createSpan(
						[],
						`连接标记: ${card.linkMarkers.join(", ")}`,
					),
				],
			);
			children.push(linkMarkers);
		}
	}

	children.push(createDescription(card));

	return createDiv(["card-tooltip__details__col"], children);
};

const createCardImageCol = (card: Card): HTMLElement => {
	const imgUrl = card.passcode
		? `${CARD_IMG_BASE}${card.passcode}.jpg`
		: card.image?.url ?? "#";
	const cardImage = createImg(
		["card-tooltip__image"],
		imgUrl,
		"",
	);
	return createDiv(["card-tooltip__image__col"], [cardImage]);
};

export const createTooltipElement = (card: Card): HTMLElement =>
	createDiv(
		["card-tooltip"],
		[
			createDiv(
				["card-tooltip__content"],
				[createCardDetailsCol(card), createCardImageCol(card)],
			),
		],
	);

export const createErrorTooltip = (message: string): HTMLElement =>
	createDiv(
		["card-tooltip__content", "card-tooltip__content--error"],
		[
			createDiv(
				["card-tooltip__error"],
				[createSpan(["fas", "fa-times"], ""), createSpan([], message)],
			),
		],
	);
