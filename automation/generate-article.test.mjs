import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeHtml,
  extractJson,
  normalizeArticleMetadata,
  renderScenarioDiagram,
  updateBlogIndex,
  updateSitemap,
  validateArticle
} from "./generate-article.mjs";

const topic = {
  id: "test-topic",
  slug: "test-topic",
  diagram: {
    title: "Access flow",
    steps: ["Reader access", "Approved <write> access"]
  },
  sources: ["https://learn.microsoft.com/azure/test"]
};

const validArticle = {
  title: "A Safe Azure Architecture",
  description: "A practical guide to a safe Azure architecture.",
  excerpt: "Practical architecture guidance.",
  readTimeMinutes: 7,
  articleHtml: [
    "<p>Opening context for architects.</p>",
    "<h2>Scenario</h2><p>",
    "word ".repeat(90),
    "</p><h2>Target Architecture</h2><p>",
    "word ".repeat(90),
    "</p><h2>Request and Approval Flow</h2><p>",
    "word ".repeat(90),
    "</p><h2>Implementation Steps</h2><p>",
    "word ".repeat(90),
    "</p><h2>Audit and Evidence</h2><p>",
    "word ".repeat(90),
    "</p><h2>Failure Modes and Trade-offs</h2><p>",
    "word ".repeat(90),
    "</p><h2>Implementation Checklist</h2><p>",
    "word ".repeat(90),
    "</p><h2>Conclusion</h2><p>",
    "word ".repeat(90),
    '</p><p><a href="https://learn.microsoft.com/azure/test">Source</a></p>'
  ].join("")
};

test("extractJson accepts fenced JSON", () => {
  assert.deepEqual(extractJson('```json\n{"ok":true}\n```'), { ok: true });
});

test("escapeHtml encodes generated metadata", () => {
  assert.equal(escapeHtml('<script>"x"</script>'), "&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
});

test("normalizeArticleMetadata trims long metadata at word boundaries", () => {
  const normalized = normalizeArticleMetadata({
    title: "Architecture ".repeat(12),
    description: "Description ".repeat(20),
    excerpt: "Excerpt ".repeat(40)
  });
  assert.ok(normalized.title.length <= 100);
  assert.ok(normalized.description.length <= 180);
  assert.ok(normalized.excerpt.length <= 240);
  assert.match(normalized.title, /\.\.\.$/);
});

test("renderScenarioDiagram creates escaped, numbered steps", () => {
  const diagram = renderScenarioDiagram(topic);
  assert.match(diagram, /Access flow/);
  assert.match(diagram, /diagram-number">1/);
  assert.match(diagram, /Approved &lt;write&gt; access/);
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

test("validateArticle requires the scenario-led technical structure", () => {
  assert.throws(
    () => validateArticle({
      ...validArticle,
      articleHtml: validArticle.articleHtml.replace("<h2>Audit and Evidence</h2>", "<h2>Observations</h2>")
    }, topic),
    /missing the required Audit and Evidence section/
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
