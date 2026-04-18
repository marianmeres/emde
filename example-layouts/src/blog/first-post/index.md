---
title: On Building Static Sites
description: Why static site generators still matter in 2025.
date: "2025-03-15"
author: Alex Morgan
---

# On Building Static Sites

There's something deeply satisfying about a tool that takes markdown files and
produces HTML. No runtime, no database, no build pipeline that takes longer
than your coffee break.

Static sites are having a moment — again. And this time, the tooling is
actually good enough that you don't have to sacrifice developer experience
for simplicity.

## The case for constraints

When your entire site is a directory of markdown files, you're forced to think
about structure. Every page has a place. Every piece of metadata lives in
frontmatter or a shared `meta.yaml`. There's no "quick hack" — just clean,
intentional content.

## What's next

I'm exploring how design tokens can be integrated directly into the build
pipeline, so theme changes propagate from a single YAML file to every page.

---

<div id="like-widget" style="padding: 1rem; margin-top: 1rem; border: 1px solid var(--b-border, #e2e8f0); border-radius: 0.5rem; font-family: system-ui, sans-serif; text-align: center;">
	<p style="margin: 0 0 0.5rem; font-size: 0.9rem; color: var(--b-muted-fg, #64748b);">Did you enjoy this post?</p>
	<button id="like-btn" style="padding: 0.5rem 1.5rem; font-size: 1rem; border: 1px solid var(--b-border, #e2e8f0); border-radius: 0.375rem; background: var(--b-muted, #f8fafc); cursor: pointer; transition: transform 0.1s;">
		&#10084; <span id="like-count">0</span>
	</button>
</div>

<script>
(function () {
	var KEY = "emde-demo-likes";
	var countEl = document.getElementById("like-count");
	var btn = document.getElementById("like-btn");
	var count = 0;

	try { count = parseInt(sessionStorage.getItem(KEY)) || 0; } catch (e) {}
	countEl.textContent = count;

	btn.addEventListener("click", function () {
		count++;
		countEl.textContent = count;
		btn.style.transform = "scale(1.15)";
		setTimeout(function () { btn.style.transform = "scale(1)"; }, 150);
		try { sessionStorage.setItem(KEY, count); } catch (e) {}
	});
})();
</script>
