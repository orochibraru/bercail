export type SearchEngine = {
	id: string;
	name: string;
	urlTemplate: string;
	icon: string;
};

export const searchEngines: SearchEngine[] = [
	{
		id: "google",
		name: "Google",
		urlTemplate: "https://www.google.com/search?q=",
		icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/google.svg",
	},
	{
		id: "bing",
		name: "Bing",
		urlTemplate: "https://www.bing.com/search?q=",
		icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/bing.svg",
	},
	{
		id: "duckduckgo",
		name: "DuckDuckGo",
		urlTemplate: "https://duckduckgo.com/?q=",
		icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/duckduckgo.svg",
	},
	{
		id: "yahoo",
		name: "Yahoo",
		urlTemplate: "https://search.yahoo.com/search?p=",
		icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/yahoo.svg",
	},
	{
		id: "yandex",
		name: "Yandex",
		urlTemplate: "https://yandex.com/search/?text=",
		icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/yandex.svg",
	},
	{
		id: "ecosia",
		name: "Ecosia",
		urlTemplate: "https://www.ecosia.org/search?q=",
		icon: "https://play-lh.googleusercontent.com/_nuyeEgn6In53vmNpgZkj2nVyR26CPZe3QxKOIk1jWVqwkt4WGWo6m4k4CGNS_3C7Og",
	},
	{
		id: "brave",
		name: "Brave Search",
		urlTemplate: "https://search.brave.com/search?q=",
		icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/brave.svg",
	},
];
