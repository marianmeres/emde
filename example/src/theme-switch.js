(function () {
	const KEY = "emde-theme";
	const root = document.documentElement;

	function get() {
		return root.classList.contains("dark") ? "dark" : "light";
	}

	function set(mode) {
		if (mode === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
		try {
			sessionStorage.setItem(KEY, mode);
		} catch (_e) {
			//
		}
		document.dispatchEvent(
			new CustomEvent("emde-theme-change", { detail: { mode: mode } }),
		);
	}

	// apply persisted preference on load
	try {
		if (sessionStorage.getItem(KEY) === "dark") {
			root.classList.add("dark");
		}
	} catch (_e) {
		//
	}

	globalThis.__emdeTheme = {
		toggle: function () {
			set(get() === "dark" ? "light" : "dark");
		},
		set: set,
		get: get,
	};
})();
