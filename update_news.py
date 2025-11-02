import feedparser
from datetime import datetime, timedelta

# Define RSS feeds
sources = {
    "The Hacker News - Data Breaches": "https://thehackernews.com/feeds/posts/default/-/data%20breach",
    "BleepingComputer - Latest": "https://www.bleepingcomputer.com/feed/",
    "CyberSecurityNews - Threats": "https://cybersecuritynews.com/category/threats/feed/",
    "SecurityAffairs - Data Breaches": "https://securityaffairs.com/category/data-breach/feed",
    "DarkReading - Threat Intelligence": "https://www.darkreading.com/rss_simple.asp?f_n=598",
    "InfoSecurity Magazine - News": "https://www.infosecurity-magazine.com/rss/news/"
}

output_file = "news.html"
today = datetime.utcnow()
cutoff_date = today - timedelta(days=7)

def parse_feed(url, name):
    feed = feedparser.parse(url)
    items = []
    for entry in feed.entries:
        try:
            published = None
            if hasattr(entry, 'published_parsed'):
                published = datetime(*entry.published_parsed[:6])
            elif hasattr(entry, 'updated_parsed'):
                published = datetime(*entry.updated_parsed[:6])
            else:
                continue
            if published < cutoff_date:
                continue
            items.append({
                "title": entry.title,
                "link": entry.link,
                "published": published.strftime("%Y-%m-%d"),
                "source": name
            })
        except Exception as e:
            print(f"Error parsing entry: {e}")
    return items

# Collect and sort items
news_items = []
for name, url in sources.items():
    print(f"Fetching from {name}")
    news_items.extend(parse_feed(url, name))
news_items = sorted(news_items, key=lambda x: x["published"], reverse=True)

# Build HTML
html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Latest Cybersecurity News</title>
<style>
body {{
  font-family: "Segoe UI", Roboto, Arial, sans-serif;
  background-color: #f4f6f9;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.6;
}}

header {{
  background: #001f3f;
  color: #fff;
  text-align: center;
  padding: 2rem 1rem;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
}}

h1 {{
  font-size: 2rem;
  margin-bottom: 0.5rem;
}}

header p {{
  font-size: 0.9rem;
  color: #cfd8dc;
}}

.container {{
  max-width: 1000px;
  margin: 2rem auto;
  padding: 0 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}}

.news-card {{
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.2rem 1.5rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}}

.news-card:hover {{
  transform: translateY(-5px);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.15);
}}

.news-card a {{
  color: #0078d4;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.05rem;
}}

.news-card a:hover {{
  color: #005fa3;
  text-decoration: underline;
}}

.news-card small {{
  display: block;
  margin-top: 0.6rem;
  color: #555;
  font-size: 0.85rem;
}}

footer {{
  text-align: center;
  background: #001f3f;
  color: #fff;
  padding: 1rem 0;
  margin-top: 3rem;
  font-size: 0.9rem;
  box-shadow: 0 -3px 6px rgba(0, 0, 0, 0.2);
}}
</style>
</head>
<body>
<header>
  <h1>Latest Cybersecurity News (Past 7 Days)</h1>
  <p>Last updated: {today.strftime("%Y-%m-%d %H:%M UTC")}</p>
</header>
<div class="container">
"""

for item in news_items:
    html_content += f"""
    <div class="news-card">
      <a href="{item['link']}" target="_blank">{item['title']}</a>
      <small>{item['published']} — {item['source']}</small>
    </div>
    """

html_content += """
</div>
<footer>
  © 2025 Srinivas Yenuganti | Data aggregated from public cybersecurity sources
</footer>
</body>
</html>
"""

with open(output_file, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"✅ News updated successfully. {len(news_items)} articles written to {output_file}.")
