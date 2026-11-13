import { escapeHtml } from "./lib/zeptomail";

export type Lang = "en" | "el";

const SITE = "https://buildthis.stanimeros.com";

/** Same paths as the site: English at `/`, Greek under `/el`. */
export function siteUrl(path: string, lang: Lang) {
  return `${SITE}${lang === "el" ? "/el" : ""}${path}`;
}

/** Plain paragraphs, one link styled as a button, and the opt-out line. */
function layout(lang: Lang, paragraphs: string[], cta: { label: string; url: string }) {
  const footer =
    lang === "el"
      ? "Λαμβάνεις αυτό το email επειδή έγραψες αυτό το πρόβλημα στο BuildThis. " +
        `<a href="${siteUrl("/me#emails", lang)}">Σταμάτα τα emails</a>.`
      : "You're getting this because you posted this problem on BuildThis. " +
        `<a href="${siteUrl("/me#emails", lang)}">Turn these emails off</a>.`;
  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.5;color:#1c1a17">
${paragraphs.map((p) => `<p>${p}</p>`).join("\n")}
<p><a href="${cta.url}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#1c1a17;color:#fff;text-decoration:none;font-weight:600">${cta.label}</a></p>
<p style="font-size:13px;color:#6b665e">${footer}</p>
</div>`;
}

/** "Someone is building a solution for your problem." */
export function builderEmail(lang: Lang, d: { problem: string; builder: string; url: string }) {
  const problem = escapeHtml(d.problem);
  const builder = escapeHtml(d.builder);
  return lang === "el"
    ? {
        subject: `Ένας builder δουλεύει στο «${d.problem}»`,
        html: layout(
          lang,
          [
            `<strong>${builder}</strong> φτιάχνει λύση για το πρόβλημά σου «${problem}».`,
            "Θα σου στείλουμε email μόλις την ανεβάσει.",
          ],
          { label: "Δες το πρόβλημα", url: d.url },
        ),
      }
    : {
        subject: `A builder is working on “${d.problem}”`,
        html: layout(
          lang,
          [
            `<strong>${builder}</strong> is building a solution for your problem “${problem}”.`,
            "We'll email you as soon as they post it.",
          ],
          { label: "See the problem", url: d.url },
        ),
      };
}

/** "A solution was posted for your problem." */
export function solutionEmail(
  lang: Lang,
  d: { problem: string; solution: string; builder: string; url: string },
) {
  const problem = escapeHtml(d.problem);
  const solution = escapeHtml(d.solution);
  const builder = escapeHtml(d.builder);
  return lang === "el"
    ? {
        subject: `Νέα λύση για «${d.problem}»`,
        html: layout(
          lang,
          [
            `Ανέβηκε νέα λύση για το πρόβλημά σου «${problem}»: <strong>${solution}</strong> ` +
              `(από ${builder}).`,
            "Δοκίμασέ τη και κάνε upvote αν σου λύνει το πρόβλημα.",
          ],
          { label: "Δες τη λύση", url: d.url },
        ),
      }
    : {
        subject: `New solution for “${d.problem}”`,
        html: layout(
          lang,
          [
            `<strong>${solution}</strong> by ${builder} was just posted for your problem “${problem}”.`,
            "Try it out and upvote it if it solves your problem.",
          ],
          { label: "See the solution", url: d.url },
        ),
      };
}
