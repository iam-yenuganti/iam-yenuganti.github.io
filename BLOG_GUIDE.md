# Blog Publishing Guide

## Weekly Blog Post Template

This guide will help you publish new blog articles weekly to maintain your portfolio as a thought leader.

---

## Quick Start: Create a New Blog Post

### Step 1: Create the HTML File
Copy this template and save as `post-YOUR-SLUG.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="YOUR DESCRIPTION HERE" />
  <title>YOUR TITLE | Srinivas Yenuganti</title>
  <meta property="og:type" content="article" />
  <meta property="og:title" content="YOUR TITLE" />
  <meta property="og:description" content="YOUR DESCRIPTION" />
  <meta property="og:url" content="https://yenuganti.in/post-YOUR-SLUG.html" />
  <meta property="article:published_time" content="YYYY-MM-DD" />
  <meta name="twitter:card" content="summary" />
  <link rel="canonical" href="https://yenuganti.in/post-YOUR-SLUG.html" />
  <link rel="stylesheet" href="style.css" />
  <style>
    /* Post-specific styles here */
  </style>
</head>
<body>

  <!-- NAV -->
  <nav class="main-nav">
    <a href="index.html" class="nav-logo">Srinivas <span>Y.</span></a>
    <button class="hamburger" onclick="document.getElementById('navlinks').classList.toggle('open')" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links" id="navlinks">
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html">About</a></li>
      <li><a href="blog.html" class="active">Blog</a></li>
      <li><a href="contact.html" class="nav-cta">Contact</a></li>
    </ul>
  </nav>

  <!-- POST HEADER -->
  <header class="post-header">
    <div class="post-breadcrumb">
      <a href="blog.html">← Blog</a> · CATEGORY
    </div>
    <h1 class="post-title">YOUR ARTICLE TITLE</h1>
    <div class="post-meta">
      <span>⏱ XX min read</span>
      <span>MONTH DD, YYYY</span>
    </div>
  </header>

  <!-- ARTICLE CONTENT -->
  <article class="article-section">
    <div class="article-body">
      <h2>Introduction Section</h2>
      <p>Your introduction paragraph here...</p>
      
      <h2>Main Section</h2>
      <p>Content here...</p>
      
      <h2>Conclusion</h2>
      <p>Wrap up your article...</p>
    </div>
  </article>

  <!-- FOOTER -->
  <footer class="main-footer">
    <p>&copy; 2026 Srinivas Yenuganti · <a href="resume.html">Resume</a> · <a href="https://www.linkedin.com/in/syenuganti-bb767744/" target="_blank">LinkedIn</a> · <a href="contact.html">Contact</a></p>
  </footer>

</body>
</html>
```

### Step 2: Add to Blog Grid
Open `blog.html` and add a new card to the `.blog-grid` section:

```html
<a href="post-YOUR-SLUG.html" class="blog-card">
  <div class="blog-card-header" style="background:linear-gradient(135deg,#0a1628 0%,#1a3a5c 55%,#0369a1 100%);">
    <span class="blog-category">CATEGORY</span>
    <h2>Your Article Title Here</h2>
  </div>
  <div class="blog-card-body">
    <div class="blog-meta"><span>⏱ XX min read</span><span>Month DD, YYYY</span></div>
    <p class="blog-excerpt">Brief excerpt of your article (1-2 sentences)...</p>
    <div class="blog-tags">
      <span class="blog-tag">Tag1</span>
      <span class="blog-tag">Tag2</span>
      <span class="blog-tag">Tag3</span>
    </div>
    <span class="read-more">Read Article →</span>
  </div>
</a>
```

### Step 3: Commit & Push

```bash
git add post-YOUR-SLUG.html blog.html
git commit -m "Publish blog: Your Article Title"
git push origin main
```

---

## Blog Post Categories

Use these categories for consistency:

- `Cloud Architecture`
- `Security & Identity`
- `DevSecOps & CI/CD`
- `Compliance & Governance`
- `Data & AI Architecture`
- `Developer Experience`
- `Platform Engineering`
- `AI Agents`

---

## Weekly Publishing Checklist

- [ ] **Draft** - Write your article in Markdown or HTML
- [ ] **Metadata** - Add title, description, date, read time
- [ ] **Tags** - Add 3-4 relevant tags
- [ ] **Blog Card** - Add entry to blog.html grid
- [ ] **Featured Image** - Optional: add gradient or background
- [ ] **Internal Links** - Link to related articles or projects
- [ ] **Review** - Proofread and test links
- [ ] **Commit** - `git add . && git commit -m "Publish: Title"`
- [ ] **Push** - `git push origin main`
- [ ] **Verify** - Check yenuganti.in/blog.html (wait 5 min)

---

## Content Ideas for Weekly Posts

Given your expertise, here are article ideas:

1. **"Azure Landing Zone Design for Healthcare Platforms"**
2. **"Zero Trust Security: Step-by-Step Implementation on Azure"**
3. **"FinOps Strategy: Reducing Cloud Costs by 40%"**
4. **"HIPAA Compliance Checklist: A Quick Guide"**
5. **"Kubernetes on Azure (AKS): Best Practices for Production"**
6. **"DevSecOps Pipeline Automation with GitHub Actions"**
7. **"Disaster Recovery Architecture on Azure"**
8. **"Azure Data Platform: From Raw Data to Insights"**
9. **"Migrating Legacy Applications to Azure"**
10. **"Azure OpenAI: Practical Enterprise Use Cases"**

---

## Tips for Success

✅ **Keep It Technical** – Your audience expects depth  
✅ **Use Real Examples** – Reference your projects  
✅ **Include Diagrams** – Consider ASCII art or descriptions  
✅ **Add Code Snippets** – Show practical implementations  
✅ **Link to Resources** – Azure docs, tools, best practices  
✅ **Consistent Schedule** – Publish weekly on the same day  
✅ **Promote** – Share new posts on LinkedIn  

---

## Publishing Frequency

- **Weekly**: 1 article per week (~500-1000 words)
- **Bi-weekly**: 1 article every 2 weeks (~1000-2000 words)
- **Monthly**: Deep dives (2000+ words)

**Recommendation**: Publish one article per week. Even short 500-word pieces demonstrate consistent thought leadership.

---

## Support

Questions? Check existing blog posts in your repo for structure examples.
