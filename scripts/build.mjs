import { readFile, writeFile, mkdir, copyFile, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputArgument = process.argv.indexOf("--out-dir");
const output = outputArgument < 0 ? root : resolve(root, process.argv[outputArgument + 1]);
const source = await readFile(join(root, "script.js"), "utf8");
const css = await readFile(join(root, "styles.css"), "utf8");
const template = await readFile(join(root, "src/page.html"), "utf8");
const context = vm.createContext({});
vm.runInContext(source, context, { timeout: 1000 });
const translations = vm.runInContext("translations", context);
const languages = ["en", "de", "fa"];
const version = createHash("sha256").update(source + css + template).digest("hex").slice(0, 12);
const origin = "https://www.farooghyousefi.com";
const routes = { en: "/", de: "/de/", fa: "/fa/" };
const locales = { en: "en_GB", de: "de_DE", fa: "fa_IR" };
const keys = Object.keys(translations.en).sort();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${origin}/#person`,
  name: "Faroogh Yousefi",
  alternateName: ["FarooghYousefi", "Faruk Yousefi", "فاروق یوسفی"],
  url: `${origin}/`,
  image: `${origin}/assets/faroogh-yousefi-sep-2026-800.webp`,
  jobTitle: "Cloud Engineer | AWS & Azure | DevOps & Automation",
  description: translations.en["meta.description"],
  homeLocation: { "@type": "Place", name: "Berlin, Germany" },
  knowsLanguage: ["de", "en", "fa", "ku", "prs"],
  knowsAbout: ["Amazon Web Services", "Microsoft Azure", "Azure Administration", "Microsoft Entra ID", "Azure Networking", "Azure Monitor", "Azure Backup", "Bicep", "Cloud Architecture", "DevOps", "Terraform", "Docker", "Linux", "Microsoft 365", "Power Automate", "PowerShell"],
  hasCredential: [
    { "@type": "EducationalOccupationalCredential", name: "Microsoft Certified: Azure Administrator Associate", credentialCategory: "Certification", identifier: "CB7D5DA096843C0D", dateCreated: "2026-10-10", expires: "2027-10-11", url: "https://learn.microsoft.com/de-de/users/farooghyousefi-8393/credentials/certification/azure-administrator?tab=credentials-tab" },
    { "@type": "EducationalOccupationalCredential", name: "AWS Certified Solutions Architect – Associate", credentialCategory: "Certification", url: "https://www.credly.com/badges/5a12bdb6-9ff6-47e6-ba10-af309c26da79" },
    { "@type": "EducationalOccupationalCredential", name: "Fachinformatiker für Anwendungsentwicklung (IHK)", credentialCategory: "Vocational qualification" },
  ],
  alumniOf: { "@type": "EducationalOrganization", name: "FORUM Berufsbildung e.V., Berlin" },
  sameAs: ["https://www.linkedin.com/in/farooghyousefi/", "https://github.com/farooghyousefi", "https://www.credly.com/users/faroogh-yousefi"],
}).replace(/</g, "\\u003c");

const siteNameData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${origin}/#website`,
  name: "Faroogh Yousefi",
  alternateName: "farooghyousefi.com",
  url: `${origin}/`,
  publisher: { "@id": `${origin}/#person` },
}).replace(/</g, "\\u003c");

for (const language of languages) {
  const content = translations[language];
  if (JSON.stringify(Object.keys(content).sort()) !== JSON.stringify(keys)) {
    throw new Error(`Translation keys differ for ${language}`);
  }
  const values = {
    ...content, lang: language, dir: language === "fa" ? "rtl" : "ltr",
    canonical: origin + routes[language], locale: locales[language],
    base: language === "en" ? "" : "../", version,
    cvFile: language === "de" ? "Faroogh-Yousefi-CV.pdf" : "Faroogh-Yousefi-CV-EN.pdf",
  };
  let html = template.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    if (key === "structuredData") return structuredData;
    if (key === "siteNameData") return siteNameData;
    if (values[key] === undefined) throw new Error(`Missing ${language} translation: ${key}`);
    return escapeHtml(values[key]);
  });
  html = html.replace(`data-lang="${language}"`, `data-lang="${language}" class="is-active" aria-current="true"`);
  const destination = join(output, language === "en" ? "" : language, "index.html");
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html);
}

const alternateLinks = languages.map((lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${origin}${routes[lang]}" />`).join("\n") + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}/" />`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${languages.map((lang) => `  <url>\n    <loc>${origin}${routes[lang]}</loc>\n    <lastmod>2026-10-10</lastmod>\n${alternateLinks}\n  </url>`).join("\n")}\n</urlset>\n`;
await writeFile(join(output, "sitemap.xml"), sitemap);

// Publish only this explicit set, never local CV sources, scratch files or tools.
if (output !== root) {
  const assets = ["favicon.svg", "apple-touch-icon.png", "faroogh-yousefi-sep-2026-400.webp", "faroogh-yousefi-sep-2026-800.webp", "Faroogh-Yousefi-CV.pdf", "Faroogh-Yousefi-CV-EN.pdf", "credentials/aws-solutions-architect-associate.png", "credentials/aws-cloud-practitioner.png", "credentials/microsoft-certified-associate.svg"];
  const icons = (await readdir(join(root, "assets/icons"))).filter((name) => name.endsWith(".svg") || name === "LUCIDE-LICENSE");
  const files = ["styles.css", "script.js", "robots.txt", ...assets.map((name) => `assets/${name}`), ...icons.map((name) => `assets/icons/${name}`)];
  for (const file of files) {
    await mkdir(dirname(join(output, file)), { recursive: true });
    await copyFile(join(root, file), join(output, file));
  }
}
console.log(`Built EN, DE and FA with ${keys.length} matching translation keys. Output: ${output}`);
