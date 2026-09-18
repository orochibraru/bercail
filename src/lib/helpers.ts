import type { Group, Item } from "./model";

export const hasField = (data: Item | Group, key: string): boolean => {
	return key in data;
};

export const hashString = async (message: string): Promise<string> => {
	const msgBuffer = new TextEncoder().encode(message);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return hashHex;
};

export const generateRandomString = (length: number) => {
	return Math.random()
		.toString(36)
		.substring(2, 2 + length);
};

export const isUrlString = (str: string): boolean => {
	if (!str) {
		return false;
	}
	const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
	return urlRegex.test(str);
};

export function toRgb(hex: string, opacity = 1) {
	return `rgba(${Number.parseInt(hex.substring(1, 3), 16)},${Number.parseInt(hex.substring(3, 5), 16)},${Number.parseInt(hex.substring(5, 7), 16)},${opacity})`;
}

export function formatUptime(totalSeconds: number): string {
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3600);
	if (days > 0) {
		return `${days}d ${hours}h`;
	}

	const minutes = Math.floor((totalSeconds % 3600) / 60);
	return `${hours}h ${minutes}m`;
}
