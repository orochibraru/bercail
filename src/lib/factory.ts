import { generateRandomString } from "./helpers";
import type { Group, Item } from "./model";

export const newGroup = (): Group => {
	return {
		id: generateRandomString(10),
		title: "",
		items: [],
	};
};

export const newItem = (): Item => {
	return {
		id: generateRandomString(10),
		target: "_self",
		title: "",
		description: "",
		url: "",
		groupId: "",
	};
};
