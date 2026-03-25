import {
	environmentConfig,
	tooltipController,
} from "@/application/ctx";
import { getLogger } from "@/core/lib";
import type { Instance } from "tippy.js";
import { delegate } from "tippy.js";
import type { TooltipInstance } from "../api";

import { bindReferenceLink } from "./bindReferenceLink";
import {
	createErrorTooltip,
	createLoadingTooltip,
	createTooltipElement,
} from "./createTooltipElement";

const logger = getLogger("bindTooltip");

const showTooltip = (
	instance: Instance,
	target: HTMLElement | HTMLAnchorElement,
	cardKey: string,
): void => {
	logger.debug(`Attempting to show tooltip for '${cardKey}'.`);
	tooltipController
		.loadCard(cardKey)
		.then((card) => {
			logger.debug("Loaded card.", card);
			instance.setContent(createTooltipElement(card));

			if (target instanceof HTMLAnchorElement) {
				bindReferenceLink(target, card);
			}
		})
		.catch((err) => {
			instance.setContent(
				createErrorTooltip("加载卡片信息失败。"),
			);
			logger.error("Error while loading card.", err);
		});
};

export const bindTooltipHandlers = (context: HTMLElement): TooltipInstance => {
	const delegateInstance = delegate(context, {
		target: "[data-name]",
		delay: [500, 0],
		placement: "auto",
		maxWidth: "none",
		allowHTML: true,
		content: () => createLoadingTooltip(),
		onShow: (instance) => {
			const target = instance.reference as HTMLElement;
			const cardKey = target.dataset["name"]!;
			showTooltip(instance, target, cardKey);
		},
	});

	let cancelPendingEnable = false;
	return {
		disable() {
			delegateInstance.disable();
			cancelPendingEnable = true;
		},
		enable: () => {
			cancelPendingEnable = false;
			setTimeout(() => {
				if (!cancelPendingEnable) {
					delegateInstance.enable();
				}
			}, 100);
		},
	};
};
