import feedparser
from datetime import datetime, timedelta
import os

# News feeds and categories
sources = {
    "The Hacker News - Data Breaches": "https://thehackernews.com/feeds/posts/default/-/data%20breach",
    "BleepingComputer - Latest": "https://www.bleepingcomputer.com/feed/",
    "CyberSecurityNews - Threats": "https://cybersecuritynews.com/category/threats/feed/",
    "SecurityAffairs - Data Breaches": "https://securityaffairs.com/category/data-breach/feed",
    "DarkReading - Threat Intelligence": "https://www.darkreading.com/rss_simple.asp?f_n=598",
    "InfoSecurity Magazine - News": "https://www.infosecurity-magazine.com/rss/news/"
}

# Output file path
output_file = "blog.html"

# Filter threshold
today = datetime.utcnow()
cutoff_date = today - timedelta(days=7)

def parse_feed(url, name):
    feed = feedparser.parse(url)
    items = []
    for entry in feed.entries:
        try:
            # Parse date
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

# Crawl all feeds
news_items = []
for name, url in sources.items():
    print(f"Fetching from {name}")
    news_items.extend(parse_feed(url, name))

# Sort by date (newest first)
news_items = sorted(news_items, key=lambda x: x["published"], reverse=True)

# Generate HTML content
html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Latest Cybersecurity News</title>
<style>
body {{ font-family: Arial, sans-serif; background-color: #f8f9fa; color: #222; margin: 0; }}
header {{ background: #001f3f; color: #fff; text-align: center; padding: 1rem; }}
h1 {{ font-size: 1.8rem; }}
.container {{ max-width: 900px; margin: 2rem auto; padding: 1rem; background: #fff; border-radius: 8px; }}
.news-item {{ border-bottom: 1px solid #ddd; padding: 1rem 0; }}
.news-item:last-child {{ border-bottom: none; }}
.news-item a {{ color: #0074d9; text-decoration: none; font-weight: bold; }}
.news-item a:hover {{ text-decoration: underline; }}
footer {{ text-align: center; background: #001f3f; color: #fff; padding: 1rem 0; margin-top: 3rem; }}
</style>
</head>
<body>
<header>
  <h1>Latest Cybersecurity News (Past 7 Days)</h1>
</header>
<div class="container">
"""

for item in news_items:
    html_content += f"""
    <div class="news-item">
      <a href="{item['link']}" target="_blank">{item['title']}</a><br>
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

# Write output file
with open(output_file, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"✅ Blog updated with {len(news_items)} articles. Output saved to {output_file}")
