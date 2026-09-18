// localStorage over chrome.storage: it's synchronous, so the new tab doesn't wait on it.
const url = localStorage.getItem("dashboardUrl");

if (url) {
	const frame = document.createElement("iframe");
	frame.src = url;
	// Weather falls back to the browser's location when the server has none.
	frame.allow = "geolocation";
	document.body.append(frame);

	// A page that never says ready is something else, like a sign-in page that can't work framed.
	let signInTimer: ReturnType<typeof setTimeout> | undefined;
	const waitForReady = () => {
		signInTimer = setTimeout(() => {
			location.href = url;
		}, 3000);
	};
	waitForReady();

	// Posted by src/routes/+layout.svelte.
	addEventListener("message", (event) => {
		if (event.origin !== new URL(url).origin) {
			return;
		}
		clearTimeout(signInTimer);
		if (event.data === "bercail:leaving") {
			waitForReady();
		}
	});
} else {
	const link = document.createElement("a");
	link.href = "options.html";
	link.textContent = "Set your Bercail URL";
	document.body.append(link);
}
