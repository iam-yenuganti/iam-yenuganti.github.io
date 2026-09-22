import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeHtml,
  extractJson,
  updateBlogIndex,
  updateSitemap,
  validateArticle
} from "./generate-article.mjs";

const topic = {
  id: "test-topic",
  slug: "test-topic",
  sources: ["https://learn.microsoft.com/azure/test"]
};

const validArticle = {
  title: "A Safe Azure Architecture",
  description: "A practical guide to a safe Azure architecture.",
  excerpt: "Practical architecture guidance.",
  readTimeMinutes: 7,
  articleHtml: [
    "<p>Opening context for architects.</p>",
    "<h2>Context</h2><p>",
    "word ".repeat(180),
    "</p><h2>Design</h2><p>",
    "word ".repeat(180),
    "</p><h2>Trade-offs</h2><p>",
    "word ".repeat(180),
    "</p><h2>Checklist</h2><p>",
    "word ".repeat(180),
    '</p><p><a href="https://learn.microsoft.com/azure/test">Source</a></p>'
  ].join("")
};

test("extractJson accepts fenced JSON", () => {
  assert.deepEqual(extractJson('```json\n{"ok":true}\n```'), { ok: true });
});

test("escapeHtml encodes generated metadata", () => {
  assert.equal(escapeHtml('<script>"x"</script>'), "&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
});

test("validateArticle accepts a grounded article", () => {
  assert.equal(validateArticle(validArticle, topic), validArticle);
});

test("validateArticle rejects executable HTML", () => {
  assert.throws(
    () => validateArticle({ ...validArticle, articleHtml: `${validArticle.articleHtml}<script>alert(1)</script>` }, topic),
    /forbidden/
  );
});

test("validateArticle rejects unapproved tags and attributes", () => {
  assert.throws(
    () => validateArticle({ ...validArticle, articleHtml: `${validArticle.articleHtml}<img src="x">` }, topic),
    /unapproved tag/
  );
  assert.throws(
    () => validateArticle({
      ...validArticle,
      articleHtml: validArticle.articleHtml.replace("<p>Opening", '<p class="lead">Opening')
    }, topic),
    /unapproved attributes/
  );
});

test("validateArticle rejects unapproved links", () => {
  assert.throws(
    () => validateArticle({
      ...validArticle,
      articleHtml: validArticle.articleHtml.replace(
        "https://learn.microsoft.com/azure/test",
        "https://example.com"
      )
    }, topic),
    /unapproved link/
  );
});

test("index and sitemap updates are inserted at their markers", () => {
  const blog = updateBlogIndex(`before\n${"<!-- AI_POSTS_START -->"}\nafter`, validArticle, topic, "2026-09-21");
  assert.match(blog, /data-ai-topic="test-topic"/);
  assert.match(blog, /21 September 2026/);

  const sitemap = updateSitemap(`before\n${"<!-- AI_POSTS_START -->"}\nafter`, topic, "2026-09-21");
  assert.match(sitemap, /post-test-topic\.html/);
  assert.match(sitemap, /2026-09-21/);
});
