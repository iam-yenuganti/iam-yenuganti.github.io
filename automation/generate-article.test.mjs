import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  AZURE_ICONS,
  buildPrompt,
  checkContentRules,
  checkOriginality,
  escapeHtml,
  extractJson,
  renderDiagramXml,
  renderPost,
  updateBlogIndex,
  updateSitemap,
  validateArticle,
  validateDiagram
} from "./generate-article.mjs";

const topic = {
  slug: "test-topic",
  title: "Test topic",
  category: "Networking",
  angle: "An angle.",
  sources: ["https://learn.microsoft.com/azure/test"]
};

const diagram = {
  title: "Private access to a web app",
  subtitle: "Users reach the app through Front Door; the app reaches data privately.",
  altText: "Users connect to Front Door, which forwards to App Service, which reads from Azure SQL through a private endpoint.",
  lanes: [
    { name: "Edge", nodes: [{ id: "users", label: "Users", detail: "Browser clients", icon: "users" }, { id: "afd", label: "Front Door", detail: "WAF at the edge", icon: "front-door" }] },
    { name: "Workload", nodes: [{ id: "app", label: "App Service", detail: "Web app <b>", icon: "app-service" }] },
    { name: "Data", nodes: [{ id: "sql", label: "Azure SQL", detail: "Private endpoint only", icon: "sql-database" }] }
  ],
  flows: [
    { from: "users", to: "afd", label: "HTTPS request" },
    { from: "afd", to: "app", label: "Private Link origin" },
    { from: "app", to: "sql", label: "Query over private endpoint" }
  ]
};

function section(heading, sentence) {
  return `<h2>${heading}</h2><p>${Array.from({ length: 40 }, (_, i) => `${sentence} number ${i}.`).join(" ")}</p>`;
}

const validArticle = {
  title: "Private Access for a Web App on Azure",
  description: "How I keep a web app's data tier private while serving users through Front Door.",
  excerpt: "Front Door at the edge, private origins and a data tier with no public endpoint.",
  articleHtml: [
    section("Why this matters", "The app should serve users without exposing its database"),
    section("How the request flows", "Front Door forwards traffic to a private origin"),
    section("Choosing the data path", "I keep the database behind a private endpoint"),
    section("Testing it", "A quick check proves the public path is closed"),
    `<p>See <a href="https://learn.microsoft.com/azure/test">the docs</a>.</p>`
  ].join(""),
  diagram
};

test("extractJson accepts fenced JSON", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
});

test("escapeHtml encodes metadata", () => {
  assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
});

test("validateArticle accepts a clean article", () => {
  assert.equal(validateArticle(structuredClone(validArticle), topic).title, validArticle.title);
});

test("validateArticle rejects executable HTML and unapproved links", () => {
  for (const bad of [`<script>x</script>`, `<p onclick="x">x</p>`, `<a href="https://example.com">x</a>`, `<img src="x">`]) {
    const article = structuredClone(validArticle);
    article.articleHtml += bad;
    assert.throws(() => validateArticle(article, topic));
  }
});

test("validateArticle enforces length and section count", () => {
  const short = structuredClone(validArticle);
  short.articleHtml = section("Only", "Too short");
  assert.throws(() => validateArticle(short, topic), /1000 to 2000 words/);
});

test("content rules block dashes, filler, private names and authorship mentions", () => {
  const cases = [
    ["A design — with a dash", /dashes/],
    ["This gives a seamless experience", /Formulaic/],
    ["When I was at Lyric we did this", /employer/],
    ["I worked with a bank on this", /client stories/],
    ["This post was generated with Claude", /AI tools/],
    ["Contact admin@contoso.com", /email/],
    ["Subscription 12345678-1234-1234-1234-123456789abc", /GUIDs/],
    ["Allow 52.10.20.30 inbound", /private placeholder/],
    ["It costs $500 a month", /prices/]
  ];
  for (const [text, pattern] of cases) assert.throws(() => checkContentRules(text), pattern);
  assert.doesNotThrow(() => checkContentRules("Route 10.0.0.0/16 through the firewall and deny 0.0.0.0/0."));
});

test("checkOriginality rejects copied source wording", () => {
  const source = "Azure Private Link enables you to access Azure PaaS services over a private endpoint in your virtual network without exposure to the public internet at all.";
  const copied = `<p>${source}</p>`;
  assert.throws(() => checkOriginality(copied, [source]), /copies source wording/);
  assert.doesNotThrow(() => checkOriginality("<p>I keep data services off the internet by giving each one a private address inside the network.</p>", [source]));
});

test("validateDiagram requires known icons, node ids and enough Azure icons", () => {
  assert.doesNotThrow(() => validateDiagram(structuredClone(diagram)));
  const unknown = structuredClone(diagram);
  unknown.flows.push({ from: "app", to: "missing", label: "x" });
  assert.throws(() => validateDiagram(unknown), /unknown node/);
  const plain = structuredClone(diagram);
  for (const lane of plain.lanes) for (const node of lane.nodes) node.icon = "none";
  assert.throws(() => validateDiagram(plain), /at least three/);
});

test("renderDiagramXml produces draw.io XML with escaped labels and Azure icons", () => {
  const xml = renderDiagramXml(diagram);
  assert.match(xml, /^<mxfile/);
  assert.match(xml, /img\/lib\/azure2\/networking\/Front_Doors\.svg/);
  assert.match(xml, /source="afd" target="app"/);
  assert.ok(xml.includes("Web app &amp;lt;b&amp;gt;"), "user text is escaped inside the HTML label");
  for (const [file] of Object.values(AZURE_ICONS)) assert.match(file, /^[a-z_]+\/[A-Za-z_0-9]+\.svg$/);
});

test("renderPost includes the diagram, sources and author card with no tool mentions", () => {
  const html = renderPost(validArticle, topic, [{ url: topic.sources[0], title: "Test page" }], "2026-11-18", "post-test-topic");
  assert.match(html, /assets\/diagrams\/post-test-topic\.svg/);
  assert.match(html, /Test page<\/a> \(Microsoft Learn\)/);
  assert.match(html, /18 November 2026/);
  assert.doesNotMatch(html, /claude|anthropic|ai-generated|generated by/i);
});

test("buildPrompt includes feedback on retry and forbids copying", () => {
  const prompt = buildPrompt(topic, [{ url: topic.sources[0], title: "Test", content: "Source body" }], "too short");
  assert.match(prompt, /previous attempt failed this check: too short/);
  assert.match(prompt, /do not copy wording/);
});

test("index and sitemap updates insert at the marker", () => {
  const blog = updateBlogIndex("<ul><!-- POSTS_START --></ul>", validArticle, topic, "2026-11-18");
  assert.match(blog, /data-topic="test-topic"/);
  assert.match(blog, /post-test-topic\.html/);
  const sitemap = updateSitemap("<urlset><!-- POSTS_START --></urlset>", topic, "2026-11-18");
  assert.match(sitemap, /<lastmod>2026-11-18<\/lastmod>/);
});

test("topics backlog is valid and does not collide with existing posts", () => {
  const topics = JSON.parse(fs.readFileSync(new URL("./topics.json", import.meta.url), "utf8"));
  const slugs = new Set();
  for (const t of topics) {
    assert.match(t.slug, /^[a-z0-9-]+$/);
    assert.ok(!slugs.has(t.slug), `duplicate slug ${t.slug}`);
    slugs.add(t.slug);
    assert.ok(t.title && t.angle && t.category);
    assert.ok(t.sources.length >= 1 && t.sources.every((u) => u.startsWith("https://learn.microsoft.com/")));
  }
});
