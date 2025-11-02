name: Update Cyber News

on:
  workflow_dispatch:        # Allows manual trigger from the Actions tab
  schedule:
    - cron: "0 3 * * *"     # Runs automatically every day at 03:00 UTC

jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: write       # Grants permission to push changes

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.10"

      - name: Install dependencies
        run: pip install feedparser

      - name: Run update script
        run: python update_news.py

      - name: Commit and push changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add news.html
          git diff --quiet && echo "No changes to commit" || git commit -m "Update Cyber News feed"
          git push origin main
