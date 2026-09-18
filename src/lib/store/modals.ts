import { writable } from "svelte/store";
import { newGroup, newItem } from "#lib/factory.ts";
import type { Group, Item } from "#lib/model.ts";

export type GroupModalState = {
	open: boolean;
	group: Group;
	action: "create" | "edit";
};

export const groupModalState = writable<GroupModalState>({
	open: false,
	group: newGroup(),
	action: "create",
});

export type ItemModalState = {
	open: boolean;
	item: Item;
	action: "create" | "edit";
};

export const itemModalState = writable<ItemModalState>({
	open: false,
	item: newItem(),
	action: "create",
});

export type DeleteModalState = {
	open: boolean;
	type: "group" | "item";
	id: string;
	name: string;
};

export const deleteModalState = writable<DeleteModalState>({
	open: false,
	type: "group",
	id: "",
	name: "",
});
