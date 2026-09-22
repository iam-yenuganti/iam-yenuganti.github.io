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
    subtitle: "A realistic trust-boundary view.",
    lanes: [
      {
        name: "Engineering",
        owner: "Application team",
        components: [{ name: "Change", detail: "Reviewed <write> request" }]
      },
      {
        name: "Azure",
        owner: "Platform team",
        components: [{ name: "Target", detail: "Scoped resource" }]
      }
    ],
    flows: ["Review change", "Authorize target"]
  },
  sources: ["https://learn.microsoft.com/azure/test"]
};

const validArticle = {
  title: "A Safe Azure Architecture",
  description: "A practical guide to a safe Azure architecture.",
  excerpt: "Practical architecture guidance.",
  readTimeMinutes: 12,
  articleHtml: [
    "<p>Opening context for architects.</p>",
    "<h2>Executive Context</h2><p>",
    "word ".repeat(150),
    "</p><h2>Constraints and Assumptions</h2><p>",
    "word ".repeat(150),
    "</p><h2>Target Architecture</h2><p>",
    "word ".repeat(150),
    "</p><h2>DevSecOps Control Model</h2><p>",
    "word ".repeat(150),
    "</p><h2>Key Architecture Decisions</h2><p>",
    "word ".repeat(150),
    "</p><h2>Implementation Blueprint</h2><p>",
    "word ".repeat(150),
    "</p><h2>Operational Evidence and SLOs</h2><p>",
    "word ".repeat(150),
    "</p><h2>Failure Modes and Trade-offs</h2><p>",
    "word ".repeat(150),
    "</p><h2>Adoption Roadmap</h2><p>",
    "word ".repeat(150),
    "</p><h2>Conclusion</h2><p>",
    "word ".repeat(150),
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

test("renderScenarioDiagram creates complete ownership lanes and flows", () => {
  const diagram = renderScenarioDiagram(topic);
  assert.match(diagram, /Access flow/);
  assert.match(diagram, /Owner: Application team/);
  assert.match(diagram, /Reviewed &lt;write&gt; request/);
  assert.match(diagram, /End-to-end control flow/);
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
      articleHtml: validArticle.articleHtml.replace("<h2>Operational Evidence and SLOs</h2>", "<h2>Observations</h2>")
    }, topic),
    /missing the required Operational Evidence and SLOs section/
  );
});

test("validateArticle rejects formulaic AI phrasing", () => {
  assert.throws(
    () => validateArticle({
      ...validArticle,
      articleHtml: validArticle.articleHtml.replace(
        "Opening context for architects.",
        "In today's rapidly evolving digital landscape, opening context for architects."
      )
    }, topic),
    /formulaic phrasing/
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
