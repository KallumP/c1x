// the release's docs as html pages (see release.ts), which open in any browser,
// made from their markdown: headings anchored as github anchors them, so links
// into a doc still work, and links to other docs going to their pages
import { Marked, type Tokens } from "marked";

const STYLE = `
:root { color-scheme: light dark; --text: #1f2328; --muted: #59636e; --back: #ffffff; --line: #d1d9e0; --code: #f6f8fa; --link: #0969da; }
@media (prefers-color-scheme: dark) {
  :root { --text: #e6edf3; --muted: #9198a1; --back: #0d1117; --line: #3d444d; --code: #151b23; --link: #4493f8; }
}
body { margin: 0; background: var(--back); color: var(--text); font: 16px/1.6 system-ui, "Segoe UI", sans-serif; }
main { max-width: 52rem; margin: 0 auto; padding: 2rem 1rem 4rem; }
h1, h2 { border-bottom: 1px solid var(--line); padding-bottom: 0.3em; }
a { color: var(--link); }
code { background: var(--code); border-radius: 4px; padding: 0.1em 0.35em; font: 0.9em ui-monospace, Consolas, monospace; }
pre { background: var(--code); border-radius: 6px; padding: 1rem; overflow-x: auto; }
pre code { padding: 0; }
table { border-collapse: collapse; display: block; overflow-x: auto; }
th, td { border: 1px solid var(--line); padding: 0.4em 0.8em; text-align: left; vertical-align: top; }
blockquote { margin: 0; padding: 0 1em; color: var(--muted); border-left: 4px solid var(--line); }
`;

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// the words of some inline html, without its tags
function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]);
}

// a heading's anchor, as github makes it: lower case, punctuation left out
// (but hyphens and underscores kept), spaces as hyphens
export function headingSlug(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replace(/ /g, "-");
}

const isWebLink = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href);

// a link's path, to another doc's page, or the licence's text file; anything else as it is
function docPath(path: string): string {
  if (/\.md$/i.test(path)) {
    return path.replace(/\.md$/i, ".html");
  }
  if (/(^|\/)LICENSE$/.test(path)) {
    return `${path}.txt`;
  }
  return path;
}

// a link in a doc, as it goes in its page: links to websites are left as they are
export function docLink(href: string): string {
  if (isWebLink(href) || href.startsWith("#")) {
    return href;
  }
  const hashAt = href.indexOf("#");
  if (hashAt === -1) {
    return docPath(href);
  }
  return docPath(href.slice(0, hashAt)) + href.slice(hashAt);
}

// a heading's anchor on its page: a second of the same name gets -1, as on github
function uniqueSlug(slug: string, used: Map<string, number>): string {
  const count = used.get(slug) ?? 0;
  used.set(slug, count + 1);
  if (count === 0) {
    return slug;
  }
  return `${slug}-${count}`;
}

// a link's title attribute, if it has a title
function titleAttribute(title: string | null | undefined): string {
  if (!title) {
    return "";
  }
  return ` title="${escapeHtml(title)}"`;
}

// marked, making one page: its headings anchored, its links where linkFor sends them
function pageMarked(linkFor: (href: string) => string): Marked {
  const used = new Map<string, number>();
  return new Marked({
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const html = this.parser.parseInline(tokens);
        return `<h${depth} id="${uniqueSlug(headingSlug(plainText(html)), used)}">${html}</h${depth}>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        return `<a href="${escapeHtml(linkFor(href))}"${titleAttribute(title)}>${this.parser.parseInline(tokens)}</a>`;
      },
    },
  });
}

// the first heading's words, for the page's title
function firstHeading(markdown: string): string {
  const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/m.exec(markdown);
  if (!heading) {
    return "";
  }
  return plainText(new Marked().parseInline(heading[1]) as string);
}

function pageTitle(markdown: string): string {
  const heading = firstHeading(markdown);
  if (!heading) {
    return "c1x";
  }
  return `c1x: ${heading}`;
}

// a doc's markdown as a whole html page; linkFor says where each link goes
// (by default, links to other docs to their pages)
export function htmlDocPage(markdown: string, linkFor: (href: string) => string = docLink): string {
  const body = pageMarked(linkFor).parse(markdown) as string;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle(markdown))}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}</main>
</body>
</html>
`;
}
