import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOPICS_PATH = path.join(ROOT, "automation", "topics.json");
const BLOG_PATH = path.join(ROOT, "blog.html");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const DIAGRAM_DIR = path.join(ROOT, "assets", "diagrams");
const SITE_URL = "https://yenuganti.in";
const MARKER = "<!-- POSTS_START -->";
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const ALLOWED_SOURCE_HOSTS = new Set(["learn.microsoft.com"]);
const ALLOWED_ARTICLE_TAGS = new Set([
  "a", "blockquote", "br", "code", "em", "h2", "h3", "li", "ol", "p", "pre",
  "strong", "table", "tbody", "td", "th", "thead", "tr", "ul"
]);
const AUTHOR_BIO = "Cloud engineer with 20+ years in enterprise infrastructure, cloud and security. I design and run Azure platforms for healthcare SaaS, with a focus on Zero Trust, compliance and secure AI.";

// Official draw.io Azure icons (azure2 library) the diagram may use.
export const AZURE_ICONS = {
  "virtual-network": ["networking/Virtual_Networks.svg", 67, 40],
  "firewall": ["networking/Firewalls.svg", 71, 60],
  "firewall-policy": ["networking/Azure_Firewall_Policy.svg", 68, 49],
  "application-gateway": ["networking/Application_Gateways.svg", 64, 64],
  "waf-policy": ["networking/Web_Application_Firewall_Policies_WAF.svg", 68, 68],
  "front-door": ["networking/Front_Doors.svg", 68, 60],
  "private-endpoint": ["networking/Private_Endpoint.svg", 72, 66],
  "private-link": ["networking/Private_Link.svg", 72, 66],
  "dns-zone": ["networking/DNS_Zones.svg", 64, 64],
  "load-balancer": ["networking/Load_Balancers.svg", 72, 72],
  "nat-gateway": ["networking/NAT.svg", 68, 68],
  "vpn-gateway": ["networking/Virtual_Network_Gateways.svg", 52, 69],
  "expressroute": ["networking/ExpressRoute_Circuits.svg", 70, 64],
  "virtual-wan": ["networking/Virtual_WAN_Hub.svg", 65, 64],
  "nsg": ["networking/Network_Security_Groups.svg", 56, 68],
  "bastion": ["networking/Bastions.svg", 58, 68],
  "ddos-protection": ["networking/DDoS_Protection_Plans.svg", 56, 68],
  "traffic-manager": ["networking/Traffic_Manager_Profiles.svg", 68, 68],
  "aks": ["compute/Kubernetes_Services.svg", 68, 60],
  "container-apps": ["other/Container_App_Environments.svg", 68, 68],
  "container-registry": ["containers/Container_Registries.svg", 68, 61],
  "app-service": ["app_services/App_Services.svg", 64, 64],
  "function-app": ["compute/Function_Apps.svg", 68, 60],
  "virtual-machine": ["compute/Virtual_Machine.svg", 69, 64],
  "logic-app": ["integration/Logic_Apps.svg", 67, 52],
  "api-management": ["app_services/API_Management_Services.svg", 65, 60],
  "service-bus": ["general/Service_Bus.svg", 70, 60],
  "event-hubs": ["analytics/Event_Hubs.svg", 67, 60],
  "event-grid": ["integration/Event_Grid_Topics.svg", 67, 60],
  "cosmos-db": ["databases/Azure_Cosmos_DB.svg", 64, 64],
  "sql-database": ["databases/SQL_Database.svg", 48, 64],
  "sql-managed-instance": ["databases/SQL_Managed_Instance.svg", 65, 64],
  "postgresql": ["databases/Azure_Database_PostgreSQL_Server.svg", 48, 64],
  "redis": ["databases/Cache_Redis.svg", 64, 52],
  "storage-account": ["storage/Storage_Accounts.svg", 65, 52],
  "data-factory": ["databases/Data_Factory.svg", 68, 68],
  "databricks": ["analytics/Azure_Databricks.svg", 63, 68],
  "key-vault": ["security/Key_Vaults.svg", 68, 68],
  "managed-identity": ["identity/Managed_Identities.svg", 68, 66],
  "entra-id": ["other/Entra_Identity.svg", 68, 60],
  "users": ["identity/Users.svg", 64, 70],
  "defender": ["security/Azure_Defender.svg", 56, 68],
  "sentinel": ["security/Azure_Sentinel.svg", 56, 68],
  "policy": ["management_governance/Policy.svg", 60, 64],
  "management-group": ["general/Management_Groups.svg", 66, 64],
  "resource-group": ["general/Resource_Groups.svg", 68, 64],
  "monitor": ["management_governance/Monitor.svg", 64, 64],
  "log-analytics": ["analytics/Log_Analytics_Workspaces.svg", 64, 64],
  "application-insights": ["devops/Application_Insights.svg", 44, 63],
  "recovery-services-vault": ["management_governance/Recovery_Services_Vaults.svg", 69, 60],
  "backup-vault": ["other/Backup_Vault.svg", 68, 58],
  "cost-management": ["general/Cost_Management.svg", 67, 60],
  "automation": ["management_governance/Automation_Accounts.svg", 68, 68],
  "arc": ["management_governance/Azure_Arc.svg", 69, 52],
  "openai": ["ai_machine_learning/Azure_OpenAI.svg", 68, 68],
  "foundry": ["ai_machine_learning/AI_Studio.svg", 64, 68],
  "ai-search": ["app_services/Search_Services.svg", 68, 49],
  "machine-learning": ["ai_machine_learning/Machine_Learning.svg", 64, 68],
  "devops": ["devops/Azure_DevOps.svg", 64, 64]
};

const FORMULAIC_PHRASES = [
  "in today's", "rapidly evolving", "ever-evolving", "digital landscape", "it is important to note",
  "it's important to note", "it is worth noting", "it's worth noting", "this article explores",
  "this article outlines", "this post explores", "delve", "game-changer", "game changer", "seamless",
  "robust solution", "in conclusion", "in summary", "unlock the power", "harness the power",
  "navigate the complexities", "a testament to", "plays a crucial role", "plays a pivotal role",
  "architect's tip", "representative scenario", "let's dive", "dive deep"
];
const PRIVATE_NAMES = /\b(ispace|lyric|gensource|ggk|ramky|lcgc|resolute|idenizen)\b/i;
const PERSONAL_STORY = /\b(i worked with|my client|our client|my employer|at my company|our customer|in our (production|tenant|platform))\b/i;
const AUTHORSHIP = /\b(as an ai|ai[- ]generated|generated (by|with|using) (ai|claude|chatgpt|an ai|a language model)|written (by|with|using) (ai|claude|chatgpt)|this (article|post) was (generated|written by)|claude|anthropic|chatgpt|openai'?s chatgpt)\b/i;
const ARTICLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "excerpt", "articleHtml", "diagram"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    excerpt: { type: "string" },
    articleHtml: { type: "string" },
    diagram: {
      type: "object",
      additionalProperties: false,
      required: ["title", "subtitle", "altText", "lanes", "flows"],
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        altText: { type: "string" },
        lanes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "nodes"],
            properties: {
              name: { type: "string" },
              nodes: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "label", "detail", "icon"],
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    detail: { type: "string" },
                    icon: { type: "string", enum: ["none", ...Object.keys(AZURE_ICONS)] }
                  }
                }
              }
            }
          }
        },
        flows: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["from", "to", "label"],
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              label: { type: "string" }
            }
          }
        }
      }
    }
  }
};

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function extractJson(raw) {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("The model response did not contain a JSON object.");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

function plainText(html) {
  return html
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(html) {
  return plainText(html).split(/\s+/).filter(Boolean).length;
}

function words(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

function ngrams(list, n) {
  const set = new Set();
  for (let i = 0; i + n <= list.length; i += 1) set.add(list.slice(i, i + n).join(" "));
  return set;
}

// Fails if the article reuses source wording: any 12 consecutive words, or more than 3% of 8-word sequences.
export function checkOriginality(articleHtml, sourceTexts) {
  const article = words(plainText(articleHtml));
  const source = words(sourceTexts.join(" "));
  const source12 = ngrams(source, 12);
  for (let i = 0; i + 12 <= article.length; i += 1) {
    const phrase = article.slice(i, i + 12).join(" ");
    if (source12.has(phrase)) {
      throw new Error(`Article copies source wording: "${phrase}". Rewrite it in your own words.`);
    }
  }
  const source8 = ngrams(source, 8);
  const article8 = [...ngrams(article, 8)];
  const copied = article8.filter((gram) => source8.has(gram)).length;
  if (article8.length && copied / article8.length > 0.03) {
    throw new Error(`Too much source wording reused (${copied} of ${article8.length} eight-word sequences). Rewrite in your own words.`);
  }
}

// Privacy, voice and authorship rules applied to every piece of visible text.
export function checkContentRules(text) {
  const lower = text.toLowerCase();
  if (/—|&mdash;|–|&ndash;/.test(text)) throw new Error("Do not use em dashes or en dashes.");
  const phrase = FORMULAIC_PHRASES.find((p) => lower.includes(p));
  if (phrase) throw new Error(`Formulaic phrasing is not allowed: "${phrase}".`);
  if (PRIVATE_NAMES.test(text)) throw new Error("Do not name any employer, client or past company.");
  if (PERSONAL_STORY.test(text)) throw new Error("Do not include client stories or claims about an employer or customer.");
  if (AUTHORSHIP.test(text)) throw new Error("Do not mention AI tools, Claude, Anthropic, ChatGPT or how the article was written.");
  if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(text)) throw new Error("Do not include email addresses.");
  if (/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(text)) {
    throw new Error("Do not include GUIDs such as subscription, tenant or object IDs; use placeholders.");
  }
  for (const ip of text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? []) {
    if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|127\.|168\.63\.129\.16)/.test(ip)) {
      throw new Error(`Use private placeholder address ranges only, not ${ip}.`);
    }
  }
  if (/\$\s?\d/.test(text)) throw new Error("Do not quote prices or dollar figures.");
}

export function validateDiagram(diagram) {
  if (!diagram || !Array.isArray(diagram.lanes) || !Array.isArray(diagram.flows)) {
    throw new Error("The diagram must have lanes and flows.");
  }
  if (diagram.lanes.length < 2 || diagram.lanes.length > 4) throw new Error("The diagram needs 2 to 4 lanes.");
  const ids = new Set();
  let iconCount = 0;
  for (const lane of diagram.lanes) {
    if (!lane.name?.trim() || !Array.isArray(lane.nodes) || lane.nodes.length < 1 || lane.nodes.length > 4) {
      throw new Error("Each diagram lane needs a name and 1 to 4 nodes.");
    }
    for (const node of lane.nodes) {
      if (!/^[a-z][a-z0-9-]{1,30}$/.test(node.id) || ids.has(node.id)) {
        throw new Error(`Diagram node ids must be unique lowercase slugs: ${node.id}`);
      }
      ids.add(node.id);
      if (node.icon !== "none" && !AZURE_ICONS[node.icon]) throw new Error(`Unknown diagram icon: ${node.icon}`);
      if (node.icon !== "none") iconCount += 1;
      if (node.label.length > 40 || node.detail.length > 70) throw new Error("Keep diagram labels under 40 and details under 70 characters.");
    }
  }
  if (iconCount < 3) throw new Error("Use official Azure icons for at least three diagram nodes.");
  if (diagram.flows.length < 2 || diagram.flows.length > 9) throw new Error("The diagram needs 2 to 9 numbered flows.");
  for (const flow of diagram.flows) {
    if (!ids.has(flow.from) || !ids.has(flow.to) || flow.from === flow.to) {
      throw new Error(`Diagram flow references an unknown node: ${flow.from} -> ${flow.to}`);
    }
    if (flow.label.length > 40) throw new Error("Keep diagram flow labels under 40 characters.");
  }
  if (!diagram.altText?.trim() || diagram.altText.length > 600) throw new Error("The diagram needs alt text under 600 characters.");
  return diagram;
}

export function validateArticle(article, topic) {
  for (const field of ["title", "description", "excerpt", "articleHtml"]) {
    if (typeof article[field] !== "string" || !article[field].trim()) {
      throw new Error(`The response is missing a non-empty ${field}.`);
    }
  }
  if (/[\r\n]/.test(article.title)) throw new Error("The title must be a single line.");
  if (article.title.length > 90 || article.description.length > 180 || article.excerpt.length > 220) {
    throw new Error("Title must be at most 90, description 180 and excerpt 220 characters.");
  }

  const html = article.articleHtml;
  const forbidden = [
    /<\s*(script|style|iframe|object|embed|form|input|button|link|meta|img|svg)\b/i,
    /\son[a-z]+\s*=/i,
    /(?:href|src)\s*=\s*["']\s*(javascript|data)\s*:/i,
    /<!--/
  ];
  if (forbidden.some((pattern) => pattern.test(html))) {
    throw new Error("Article HTML contains a forbidden element or attribute.");
  }
  for (const match of html.matchAll(/<\s*(\/?)\s*([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const [, closing, tagName, rawAttributes] = match;
    const tag = tagName.toLowerCase();
    if (!ALLOWED_ARTICLE_TAGS.has(tag)) throw new Error(`Article HTML contains an unapproved tag: ${tag}`);
    const attributes = rawAttributes.trim();
    if (!closing && attributes && !(tag === "a" && /^href\s*=\s*["'][^"']+["']$/i.test(attributes))) {
      throw new Error(`Article HTML contains unapproved attributes on ${tag}.`);
    }
  }
  const allowedUrls = new Set(topic.sources);
  for (const match of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    if (!allowedUrls.has(match[1])) throw new Error(`Article contains an unapproved link: ${match[1]}`);
  }

  const wordCount = countWords(html);
  if (wordCount < 1000 || wordCount > 2000) {
    throw new Error(`The article must be 1000 to 2000 words of prose (code excluded); it has ${wordCount}.`);
  }
  const h2Count = (html.match(/<h2>/gi) ?? []).length;
  if (h2Count < 4 || h2Count > 9) throw new Error("Use 4 to 9 H2 sections.");

  validateDiagram(article.diagram);
  const visibleText = [
    article.title, article.description, article.excerpt, plainText(html),
    article.diagram.title, article.diagram.subtitle, article.diagram.altText,
    ...article.diagram.lanes.flatMap((lane) => [lane.name, ...lane.nodes.flatMap((n) => [n.label, n.detail])]),
    ...article.diagram.flows.map((f) => f.label)
  ].join("\n");
  checkContentRules(visibleText);
  return article;
}

function xmlAttr(value) {
  return escapeHtml(value);
}

// Builds an editable draw.io diagram: lanes as columns, official Azure icons, numbered flows.
export function renderDiagramXml(diagram) {
  const laneW = 300;
  const gap = 120;
  const cardW = 260;
  const cardH = 76;
  const slot = 120;
  const top = 64;
  const maxNodes = Math.max(...diagram.lanes.map((lane) => lane.nodes.length));
  const laneH = top + maxNodes * slot;
  const cells = [];
  const place = {};
  diagram.lanes.forEach((lane, laneIndex) => {
    const x = 20 + laneIndex * (laneW + gap);
    cells.push(`<mxCell id="lane-${laneIndex}" value="${xmlAttr(lane.name)}" style="rounded=1;arcSize=3;whiteSpace=wrap;html=1;fillColor=${laneIndex % 2 ? "#F2F8FD" : "#F6F8FA"};strokeColor=#C8D3E0;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;fontStyle=1;fontSize=15;fontColor=#1F2328;" vertex="1" parent="1"><mxGeometry x="${x}" y="20" width="${laneW}" height="${laneH}" as="geometry"/></mxCell>`);
    lane.nodes.forEach((node, nodeIndex) => {
      const cx = x + (laneW - cardW) / 2;
      const cy = 20 + top + nodeIndex * slot;
      const hasIcon = node.icon !== "none";
      const label = `&lt;b&gt;${escapeHtml(escapeHtml(node.label))}&lt;/b&gt;&lt;br&gt;${escapeHtml(escapeHtml(node.detail))}`;
      cells.push(`<mxCell id="${node.id}" value="${label}" style="rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=${hasIcon ? "#0078D4" : "#8C959F"};fontSize=12;align=left;verticalAlign=middle;spacingLeft=${hasIcon ? 58 : 12};spacingRight=8;" vertex="1" parent="1"><mxGeometry x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" as="geometry"/></mxCell>`);
      if (hasIcon) {
        const [file, iw, ih] = AZURE_ICONS[node.icon];
        const scale = 40 / Math.max(iw, ih);
        const w = Math.round(iw * scale);
        const h = Math.round(ih * scale);
        cells.push(`<mxCell id="${node.id}-icon" value="" style="image;aspect=fixed;html=1;points=[];image=img/lib/azure2/${file};" vertex="1" parent="1"><mxGeometry x="${cx + 10 + Math.round((40 - w) / 2)}" y="${cy + Math.round((cardH - h) / 2)}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
      }
      place[node.id] = { lane: laneIndex, row: nodeIndex, right: cx + cardW };
    });
  });
  diagram.flows.forEach((flow, index) => {
    const from = place[flow.from];
    const to = place[flow.to];
    let ports;
    let points = "";
    if (from.lane === to.lane && Math.abs(from.row - to.row) === 1) {
      ports = from.row < to.row
        ? "exitX=0.5;exitY=1;entryX=0.5;entryY=0;"
        : "exitX=0.5;exitY=0;entryX=0.5;entryY=1;";
    } else if (from.lane === to.lane) {
      const sideX = from.right + 14;
      ports = "exitX=1;exitY=0.5;entryX=1;entryY=0.5;";
      points = `<Array as="points"><mxPoint x="${sideX}" y="${20 + top + from.row * slot + cardH / 2}"/><mxPoint x="${sideX}" y="${20 + top + to.row * slot + cardH / 2}"/></Array><mxPoint x="60" y="0" as="offset"/>`;
    } else if (from.lane < to.lane) {
      ports = "exitX=1;exitY=0.5;entryX=0;entryY=0.5;";
    } else {
      ports = "exitX=0;exitY=0.5;entryX=1;entryY=0.5;";
    }
    const style = `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#0078D4;strokeWidth=1.5;endArrow=block;endFill=1;fontSize=11;labelBackgroundColor=#FFFFFF;${ports.replace(/;(entry|exit)([XY])=/g, ";$1$2=")}exitDx=0;exitDy=0;entryDx=0;entryDy=0;`;
    cells.push(`<mxCell id="flow-${index + 1}" value="${xmlAttr(`${index + 1}  ${flow.label}`)}" style="${style}" edge="1" parent="1" source="${flow.from}" target="${flow.to}"><mxGeometry relative="1" as="geometry">${points}</mxGeometry></mxCell>`);
  });
  const width = 40 + diagram.lanes.length * laneW + (diagram.lanes.length - 1) * gap;
  return `<mxfile host="drawio"><diagram id="architecture" name="${xmlAttr(diagram.title)}"><mxGraphModel grid="1" gridSize="10" page="1" pageWidth="${width}" pageHeight="${laneH + 60}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel></diagram></mxfile>\n`;
}

function exportSvg(drawioPath, svgPath) {
  const [command, ...prefix] = (process.env.DRAWIO_CMD || "drawio").split(/\s+/);
  const extra = (process.env.DRAWIO_EXTRA_ARGS || "").split(/\s+/).filter(Boolean);
  execFileSync(command, [...prefix, "-x", "-f", "svg", "-e", "--embed-svg-images", "-o", svgPath, drawioPath, ...extra], {
    stdio: "inherit",
    timeout: 180000
  });
}

async function fetchSources(topic) {
  return Promise.all(topic.sources.map(async (sourceUrl) => {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" || !ALLOWED_SOURCE_HOSTS.has(url.hostname)) {
      throw new Error(`Source is not on Microsoft Learn: ${sourceUrl}`);
    }
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "yenuganti-site-builder/2.0" },
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Could not fetch ${sourceUrl}: HTTP ${response.status}`);
    const html = await response.text();
    const title = (html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "Microsoft Learn")
      .replace(/\s*\|\s*Microsoft Learn\s*$/i, "")
      .trim();
    const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? html;
    const content = plainText(main.replace(/<(script|style|svg|nav)\b[\s\S]*?<\/\1>/gi, " "));
    return { url: sourceUrl, title: plainText(title), content };
  }));
}

const SYSTEM_PROMPT = `You write for Srinivas Yenuganti's personal blog about Azure architecture and solution design. Readers are cloud architects and senior engineers.

Voice:
- First person, plain words, the way an experienced architect explains a design to a colleague. Short paragraphs. Opinions with reasons ("I default to X because...").
- Start with the real problem in two or three sentences. No scene-setting, no restating the title.
- Explain trade-offs and what you would choose, when, and why. Name the failure modes and how to test the design.
- End with practical next steps, not a summary.
- Never use em dashes or en dashes. Avoid filler and cliches such as "in today's", "seamless", "robust", "delve", "it's important to note", "game-changer", "in conclusion", "plays a crucial role".
- No "Architect's Tip" boxes, disclaimers or "representative scenario" labels.

Accuracy and originality:
- Use the Microsoft Learn source material only to check facts. Write everything in your own words and your own structure. Never copy sentences or long phrases from the sources.
- Do not invent product behavior, limits, prices, dates, statistics or quotes. If the sources don't support a detail, leave it out or keep it general.
- Use current product names (Microsoft Entra ID, Microsoft Defender for Cloud, Microsoft Foundry, Azure Monitor Agent).

Privacy:
- Do not name any employer, client or company, and do not tell stories about real customers, projects, metrics or costs.
- Use placeholder names only (contoso, rg-app-prod, id-deploy-prod, 10.0.0.0/16). No real IDs, emails or public IP addresses.
- Never mention AI tools, Claude, Anthropic, ChatGPT or how the article was written.`;

export function buildPrompt(topic, sources, feedback = "") {
  const sourceText = sources
    .map((source, index) => `SOURCE ${index + 1} (${source.title}): ${source.url}\n${source.content.slice(0, 12000)}`)
    .join("\n\n");
  return `Write a new blog post.

Topic: ${topic.title}
Angle: ${topic.angle}

Return JSON with:
- title: a natural title, at most 90 characters.
- description: one sentence for search results, at most 180 characters.
- excerpt: one or two sentences for the blog index, at most 220 characters.
- articleHtml: 1,100 to 1,700 words of prose (code blocks don't count), with 4 to 8 <h2> sections whose headings sound natural, not like a template. Allowed tags: p, h2, h3, ul, ol, li, strong, em, code, pre, table, thead, tbody, tr, th, td, blockquote, a, br. Links may only use these exact URLs: ${topic.sources.join(", ")}. Include a short code, CLI, policy or configuration example only where it genuinely helps and the sources support it. Do not include a "Sources" section; it is added automatically.
- diagram: the solution architecture the article describes, drawn as 2 to 4 lanes (for example identity, network, workload, operations) with 1 to 4 nodes each, at least three using the official Azure icons from the enum, and 2 to 9 numbered flows between node ids that match the order the article explains them. Labels under 40 characters, details under 70. altText describes the whole diagram in plain sentences.
${feedback ? `\nYour previous attempt failed this check: ${feedback}\nFix it in the new version.\n` : ""}
Microsoft Learn source material (for fact checking only, do not copy wording):
${sourceText}`;
}

async function callClaude(prompt) {
  const client = new Anthropic({ maxRetries: 3, timeout: 20 * 60 * 1000 });
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: { type: "json_schema", schema: ARTICLE_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }]
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("The model declined the request.");
  if (message.stop_reason === "max_tokens") throw new Error("The response was cut off at max_tokens.");
  const text = message.content.filter((block) => block.type === "text").map((block) => block.text).join("");
  if (!text) throw new Error("The model returned no text.");
  return text;
}

function displayDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

export function renderPost(article, topic, sources, date, diagramFile) {
  const readTime = Math.max(4, Math.round(countWords(article.articleHtml) / 220));
  const sourceItems = sources
    .map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a> (Microsoft Learn)</li>`)
    .join("\n          ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(article.description)}" />
  <title>${escapeHtml(article.title)} | Srinivas Yenuganti</title>
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(article.title)}" />
  <meta property="og:description" content="${escapeHtml(article.description)}" />
  <meta property="og:url" content="${SITE_URL}/post-${topic.slug}.html" />
  <meta property="article:published_time" content="${date}" />
  <meta name="twitter:card" content="summary" />
  <link rel="canonical" href="${SITE_URL}/post-${topic.slug}.html" />
  <link rel="stylesheet" href="style.css?v=4" />
  <style>
    .post-header{background:linear-gradient(135deg,#071b33,#0b4f75);padding:3.5rem 1.5rem 3rem}
    .post-header-inner,.article-body,.author-card{max-width:760px;margin:0 auto}
    .post-breadcrumb,.post-meta{font-size:.78rem;color:rgba(255,255,255,.65)}
    .post-breadcrumb a{color:rgba(255,255,255,.85)}
    .post-title{font-size:clamp(1.7rem,4vw,2.5rem);color:#fff;line-height:1.2;margin:1rem 0}
    .article-section{padding:3.5rem 1.5rem}
    .article-body p,.article-body li{color:#374151;margin-bottom:1rem}
    .article-body h2{font-size:1.45rem;margin:2.5rem 0 .8rem;padding-top:1.5rem;border-top:1px solid #e2e8f0}
    .article-body h3{font-size:1.1rem;color:#0b4f75;margin:1.5rem 0 .5rem}
    .article-body ul,.article-body ol{margin:0 0 1.25rem 1.5rem}
    .article-body pre{background:#0b1f33;color:#e6edf3;padding:1rem;border-radius:8px;overflow:auto}
    .article-body code{background:#eef2f7;padding:.1rem .3rem;border-radius:4px;overflow-wrap:anywhere}
    .article-body pre code{background:none;padding:0;color:inherit;border-radius:0}
    .article-body table{display:block;width:100%;border-collapse:collapse;margin:1.5rem 0;overflow-x:auto}
    .article-body th,.article-body td{border:1px solid #dbe3ec;padding:.65rem;text-align:left;vertical-align:top}
    .article-body blockquote{border-left:4px solid #1565c0;background:#f7f9fb;padding:1rem 1.2rem;margin:1.5rem 0}
    .architecture-diagram{max-width:100%;margin:0 0 2.5rem;padding:1rem;background:#fff;border:1px solid #c8c6c4;border-top:4px solid #0078d4;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .architecture-diagram figcaption{font-size:1.05rem;font-weight:760;color:#201f1e;margin-bottom:.3rem}
    .diagram-subtitle{font-size:.82rem!important;color:#605e5c!important;margin-bottom:.85rem!important}
    .architecture-diagram img{display:block;width:100%;height:auto;border:1px solid #d2d0ce;border-radius:3px}
    .diagram-note{margin-top:.65rem!important;font-size:.72rem!important;color:#605e5c!important}
    @media(max-width:640px){.architecture-diagram{padding:.8rem}}
    .sources{margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid #e2e8f0}
    .author-card{background:#f7f9fb;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem;margin-top:3rem}
  </style>
</head>
<body>
  <nav class="main-nav">
    <a href="index.html" class="nav-logo">Srinivas Yenuganti</a>
    <button class="hamburger" aria-label="Toggle menu" aria-expanded="false" aria-controls="navlinks"
      onclick="const o=document.getElementById('navlinks').classList.toggle('open');this.setAttribute('aria-expanded',o)">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links" id="navlinks">
      <li><a href="index.html">About</a></li>
      <li><a href="blog.html" class="active">Blog</a></li>
    </ul>
  </nav>

  <header class="post-header">
    <div class="post-header-inner">
      <div class="post-breadcrumb"><a href="blog.html">&larr; Blog</a> &middot; ${escapeHtml(topic.category)}</div>
      <h1 class="post-title">${escapeHtml(article.title)}</h1>
      <div class="post-meta">${readTime} min read &middot; ${escapeHtml(displayDate(date))}</div>
    </div>
  </header>

  <main class="article-section">
    <article class="article-body">
      <figure class="architecture-diagram" aria-labelledby="architecture-title">
        <figcaption id="architecture-title">${escapeHtml(article.diagram.title)}</figcaption>
        <p class="diagram-subtitle">${escapeHtml(article.diagram.subtitle)}</p>
        <img src="assets/diagrams/${diagramFile}.svg" alt="${escapeHtml(article.diagram.altText)}" loading="lazy" />
        <p class="diagram-note">Editable source: assets/diagrams/${diagramFile}.drawio</p>
      </figure>

${article.articleHtml}

      <section class="sources">
        <h2>Sources</h2>
        <ol>
          ${sourceItems}
        </ol>
      </section>
      <aside class="author-card">
        <strong>Srinivas Yenuganti</strong>
        <p>${AUTHOR_BIO}</p>
      </aside>
    </article>
  </main>

  <footer class="main-footer">
    <p>&copy; ${date.slice(0, 4)} Srinivas Yenuganti &nbsp;&middot;&nbsp;
      <a href="index.html">About</a> &nbsp;&middot;&nbsp;
      <a href="blog.html">Blog</a> &nbsp;&middot;&nbsp;
      <a href="https://www.linkedin.com/in/srinivas-yenuganti-bb767744/" target="_blank" rel="noopener">LinkedIn</a>
    </p>
  </footer>
</body>
</html>
`;
}

export function updateBlogIndex(html, article, topic, date) {
  if (!html.includes(MARKER)) throw new Error(`blog.html is missing ${MARKER}.`);
  const item = `
      <li class="post-item" data-topic="${escapeHtml(topic.slug)}">
        <h2><a href="post-${topic.slug}.html">${escapeHtml(article.title)}</a></h2>
        <div class="post-date">${escapeHtml(displayDate(date))}</div>
        <p>${escapeHtml(article.excerpt)}</p>
      </li>
`;
  return html.replace(MARKER, `${MARKER}\n${item}`);
}

export function updateSitemap(xml, topic, date) {
  if (!xml.includes(MARKER)) throw new Error(`sitemap.xml is missing ${MARKER}.`);
  const entry = `
  <url>
    <loc>${SITE_URL}/post-${topic.slug}.html</loc>
    <lastmod>${date}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  return xml.replace(MARKER, `${MARKER}\n${entry}`);
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function chooseTopic(topics, requestedSlug) {
  if (requestedSlug) {
    const selected = topics.find((topic) => topic.slug === requestedSlug);
    if (!selected) throw new Error(`Unknown topic: ${requestedSlug}`);
    return selected;
  }
  for (const topic of topics) {
    if (!(await exists(path.join(ROOT, `post-${topic.slug}.html`)))) return topic;
  }
  throw new Error("The topic backlog is empty. Add new entries to automation/topics.json.");
}

async function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function main() {
  const topics = JSON.parse(await fs.readFile(TOPICS_PATH, "utf8"));
  const date = process.env.PUBLICATION_DATE || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("PUBLICATION_DATE must use YYYY-MM-DD.");
  for (const file of await fs.readdir(ROOT)) {
    if (file.startsWith("post-") && (await fs.readFile(path.join(ROOT, file), "utf8")).includes(`article:published_time" content="${date}"`)) {
      console.log(`A post is already published for ${date} (${file}); nothing to do.`);
      await writeOutput("published", "false");
      return;
    }
  }

  const topic = await chooseTopic(topics, process.env.TOPIC_SLUG);
  const sources = await fetchSources(topic);
  let article;
  let feedback = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const candidate = validateArticle(extractJson(await callClaude(buildPrompt(topic, sources, feedback))), topic);
      checkOriginality(candidate.articleHtml, sources.map((source) => source.content));
      article = candidate;
      break;
    } catch (error) {
      if (error instanceof Anthropic.APIError) throw error;
      feedback = error.message;
      console.warn(`Attempt ${attempt} failed a check: ${feedback}`);
      if (attempt === 3) throw new Error(`No publishable draft after ${attempt} attempts: ${feedback}`);
    }
  }

  const diagramFile = `post-${topic.slug}`;
  const drawioPath = path.join(DIAGRAM_DIR, `${diagramFile}.drawio`);
  const svgPath = path.join(DIAGRAM_DIR, `${diagramFile}.svg`);
  await fs.mkdir(DIAGRAM_DIR, { recursive: true });
  await fs.writeFile(drawioPath, renderDiagramXml(article.diagram));
  exportSvg(drawioPath, svgPath);
  const svg = await fs.readFile(svgPath, "utf8");
  if (!svg.includes("<svg") || svg.length < 2000) throw new Error("The diagram export did not produce a valid SVG.");

  const postFile = `post-${topic.slug}.html`;
  await fs.writeFile(path.join(ROOT, postFile), renderPost(article, topic, sources, date, diagramFile));
  await fs.writeFile(BLOG_PATH, updateBlogIndex(await fs.readFile(BLOG_PATH, "utf8"), article, topic, date));
  await fs.writeFile(SITEMAP_PATH, updateSitemap(await fs.readFile(SITEMAP_PATH, "utf8"), topic, date));

  await writeOutput("published", "true");
  await writeOutput("title", article.title.replace(/[\r\n]/g, " "));
  await writeOutput("post_file", postFile);
  console.log(`Published ${postFile}: ${article.title}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
