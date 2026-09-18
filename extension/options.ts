const dashboardUrlKey = "dashboardUrl";

const form = document.querySelector("form") as HTMLFormElement;
const input = form.elements.namedItem("url") as HTMLInputElement;
input.value = localStorage.getItem(dashboardUrlKey) ?? "";

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	const url = new URL(input.value);
	// Must run before any other await, it needs the click's user gesture.
	const granted = await chrome.permissions.request({
		origins: [`${url.origin}/*`],
	});
	if (!granted) {
		return;
	}
	localStorage.setItem(dashboardUrlKey, url.href);
	// Top level, so an auth proxy like Pangolin can run its sign-in.
	location.href = url.href;
});
