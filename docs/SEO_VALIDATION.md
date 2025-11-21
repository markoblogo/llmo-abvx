# SEO & AI Indexing Validation Checklist

## Legal Pages

- [ ] `/privacy` page loads correctly
- [ ] `/terms` page loads correctly
- [ ] Both pages maintain terminal aesthetic
- [ ] Footer links to Privacy and Terms work

## Structured Data (JSON-LD)

### Global Schema
- [ ] View page source on homepage
- [ ] Verify `<script type="application/ld+json">` exists in `<head>`
- [ ] Validate JSON-LD at https://validator.schema.org/
- [ ] Check for WebSite, Organization, and SearchAction types

### Per-Listing Schema
- [ ] Individual listing pages include WebPage schema
- [ ] Links include proper title, URL, description
- [ ] isPartOf references LLMO Directory

## Robots.txt & Sitemap

- [ ] Visit https://llmo.abvx.xyz/robots.txt
- [ ] Verify admin and API routes are disallowed
- [ ] Verify sitemap URL is present
- [ ] Visit https://llmo.abvx.xyz/sitemap.xml
- [ ] Verify all public pages are listed
- [ ] Check lastmod dates are current

## RSS Feed

- [ ] Visit https://llmo.abvx.xyz/feed.xml
- [ ] Verify XML is valid
- [ ] Check recent listings appear
- [ ] Verify proper escaping of special characters
- [ ] Test in RSS reader (Feedly, etc.)

## Social Links

- [ ] Footer Twitter link has `rel="me"`
- [ ] Footer GitHub link has `rel="me"`
- [ ] Footer Medium link has `rel="me"`
- [ ] All links open in new tab (`target="_blank"`)
- [ ] All links have `noopener noreferrer`

## Rich Results Testing

### Google Rich Results Test
1. Go to https://search.google.com/test/rich-results
2. Enter https://llmo.abvx.xyz
3. Verify no errors
4. Check detected structured data types

### Schema.org Validator
1. Go to https://validator.schema.org/
2. Enter https://llmo.abvx.xyz
3. Verify JSON-LD is valid
4. Check for warnings

## AI Crawler Verification

### OpenAI GPTBot
- [ ] robots.txt allows GPTBot
- [ ] Structured data is present
- [ ] No hidden text or cloaking

### Anthropic Claude
- [ ] robots.txt allows anthropic-ai
- [ ] robots.txt allows Claude-Web
- [ ] Content is accessible

### Common Crawl
- [ ] robots.txt allows CCBot
- [ ] Sitemap is accessible

## Meta Tags Verification

- [ ] Open Graph tags present (og:title, og:description, og:image)
- [ ] Twitter Card tags present
- [ ] Canonical URL set correctly
- [ ] Meta description under 160 characters
- [ ] Title tag under 60 characters

## Final Production Checks

- [ ] All pages load without errors
- [ ] No console errors in browser
- [ ] Mobile responsive design maintained
- [ ] Terminal aesthetic consistent across all pages
- [ ] Neon green accent (#00FF9C) used appropriately
- [ ] IBM Plex Mono font loads correctly
- [ ] Dark/light mode works on all pages

## Post-Launch Monitoring

### Week 1
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Monitor crawl errors
- [ ] Check indexing status

### Week 2-4
- [ ] Monitor organic traffic
- [ ] Check for rich results in SERPs
- [ ] Verify AI crawler access in logs
- [ ] Test search functionality

## Notes

- All structured data follows schema.org standards
- No black-hat SEO techniques used
- Content is ethical and transparent
- AI visibility achieved through proper markup, not manipulation
