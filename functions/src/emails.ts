import { readFileSync } from "node:fs";
import { join } from "node:path";
import { escapeHtml, type InlineImage } from "./lib/zeptomail";

export type Lang = "en" | "el";

const SITE = "https://buildthis.stanimeros.com";

/** Same paths as the site: English at `/`, Greek under `/el`. */
export function siteUrl(path: string, lang: Lang) {
  if (lang === "en") return `${SITE}${path}`;
  // "/" and "/#board" are the Greek home, "/el" (no trailing slash).
  return `${SITE}/el${path.replace(/^\/(?=#|$)/, "")}`;
}

// The site's palette (src/index.css) in hex, since mail clients don't do oklch.
const C = {
  paper: "#f9f6f1",
  card: "#fefdfb",
  ink: "#15110d",
  muted: "#625c55",
  border: "#e6e1d8",
  flame: "#f44400",
};
const HEADING = "Geologica,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";
const BODY = "Manrope,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";

/**
 * The logo travels inside every email (`cid:logo`) rather than being loaded from the site, so it
 * shows even where remote images are blocked. Rendered from public/favicon.svg at 96px.
 */
const LOGO: InlineImage = {
  cid: "logo",
  type: "image/png",
  content: readFileSync(join(__dirname, "../assets/logo.png")).toString("base64"),
};

/** Why this person gets the email: the first line of the footer. */
type Reason = "problem" | "solution" | "account";

const reasons: Record<Lang, Record<Reason, string>> = {
  en: {
    problem: "You're getting this because you posted this problem on BuildThis.",
    solution: "You're getting this because you posted this solution on BuildThis.",
    account: "You're getting this because you signed up for BuildThis.",
  },
  el: {
    problem: "Λαμβάνεις αυτό το email επειδή έγραψες αυτό το πρόβλημα στο BuildThis.",
    solution: "Λαμβάνεις αυτό το email επειδή ανέβασες αυτή τη λύση στο BuildThis.",
    account: "Λαμβάνεις αυτό το email επειδή έφτιαξες λογαριασμό στο BuildThis.",
  },
};

type Content = {
  /** Headline. Already escaped. */
  title: string;
  /** Shown in a small card under the headline, e.g. the problem's title. Plain text. */
  card?: string;
  /** Already escaped. */
  paragraphs: string[];
  cta: { label: string; url: string };
};

/** The logo and wordmark, a white card with the message, and the opt-out line. */
function layout(lang: Lang, reason: Reason, c: Content) {
  return { html: page(lang, reason, c), inlineImages: [LOGO] };
}

function page(lang: Lang, reason: Reason, c: Content) {
  const off = lang === "el" ? "Σταμάτα τα emails" : "Turn these emails off";
  const card = c.card
    ? `<div style="margin:0 0 20px;padding:14px 16px;border:1px solid ${C.border};border-radius:14px;` +
      `background:${C.paper};font:700 16px/1.4 ${HEADING};color:${C.ink}">${escapeHtml(c.card)}</div>`
    : "";
  const paragraphs = c.paragraphs
    .map((p) => `<p style="margin:0 0 14px;font:16px/1.6 ${BODY};color:${C.ink}">${p}</p>`)
    .join("");
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.paper}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 4px 20px">
<a href="${siteUrl("/", lang)}" style="text-decoration:none;color:${C.ink}"><img src="cid:logo" width="32" height="32" alt="" style="vertical-align:middle;border:0"><span style="vertical-align:middle;margin-left:10px;font:700 20px/1 ${HEADING};letter-spacing:-0.02em;color:${C.ink}">BuildThis</span></a>
</td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:20px;padding:32px 28px">
<h1 style="margin:0 0 20px;font:800 26px/1.3 ${HEADING};letter-spacing:-0.02em;color:${C.ink}">${c.title}</h1>
${card}${paragraphs}
<a href="${c.cta.url}" style="display:inline-block;margin-top:8px;padding:13px 24px;border-radius:999px;background:${C.flame};color:#fff;font:700 15px/1 ${BODY};text-decoration:none">${c.cta.label} &rarr;</a>
</td></tr>
<tr><td style="padding:20px 8px 0;font:13px/1.6 ${BODY};color:${C.muted}">
${reasons[lang][reason]} <a href="${siteUrl("/me#emails", lang)}" style="color:${C.muted}">${off}</a>.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** "Someone is building a solution for your problem." */
export function builderEmail(lang: Lang, d: { problem: string; builder: string; url: string }) {
  const builder = escapeHtml(d.builder);
  return lang === "el"
    ? {
        subject: `Ένας builder δουλεύει στο «${d.problem}»`,
        ...layout(lang, "problem", {
          title: "Κάποιος φτιάχνει λύση για το πρόβλημά σου",
          card: d.problem,
          paragraphs: [
            `<strong>${builder}</strong> μόλις πάτησε «Το φτιάχνω».`,
            "Θα σου στείλουμε email μόλις ανεβάσει τη λύση.",
          ],
          cta: { label: "Δες το πρόβλημα", url: d.url },
        }),
      }
    : {
        subject: `A builder is working on “${d.problem}”`,
        ...layout(lang, "problem", {
          title: "Someone is building a solution for your problem",
          card: d.problem,
          paragraphs: [
            `<strong>${builder}</strong> just said “I'm building this”.`,
            "We'll email you as soon as they post the solution.",
          ],
          cta: { label: "See the problem", url: d.url },
        }),
      };
}

/** "A solution was posted for your problem." */
export function solutionEmail(
  lang: Lang,
  d: { problem: string; solution: string; builder: string; url: string },
) {
  const solution = escapeHtml(d.solution);
  const builder = escapeHtml(d.builder);
  return lang === "el"
    ? {
        subject: `Νέα λύση για «${d.problem}»`,
        ...layout(lang, "problem", {
          title: "Υπάρχει νέα λύση για το πρόβλημά σου",
          card: d.problem,
          paragraphs: [
            `<strong>${solution}</strong>, από ${builder}.`,
            "Δοκίμασέ τη και κάνε upvote αν σου λύνει το πρόβλημα.",
          ],
          cta: { label: "Δες τη λύση", url: d.url },
        }),
      }
    : {
        subject: `New solution for “${d.problem}”`,
        ...layout(lang, "problem", {
          title: "There's a new solution for your problem",
          card: d.problem,
          paragraphs: [
            `<strong>${solution}</strong>, by ${builder}.`,
            "Try it out and upvote it if it solves your problem.",
          ],
          cta: { label: "See the solution", url: d.url },
        }),
      };
}

/** Right after signup. Builders are sent to the board, everyone else to posting a problem. */
export function welcomeEmail(lang: Lang, d: { builder: boolean }) {
  return lang === "el"
    ? {
        subject: "Καλώς ήρθες στο BuildThis",
        ...layout(lang, "account", {
          title: "Καλώς ήρθες! Φτιάξε αυτό που ζητάει ο κόσμος.",
          paragraphs: [
            "Γράφεις τα προβλήματα που θέλεις να λύσει μια εφαρμογή και κάνεις upvote σε όσα " +
              "έχεις κι εσύ. Οι builders ανταγωνίζονται για να λύσουν όσα ζητούνται περισσότερο.",
            d.builder
              ? "Διάλεξε ένα πρόβλημα που ζητάει πολύς κόσμος και φτιάξε τη λύση."
              : "Τι σου λείπει στην καθημερινότητα; Γράψ' το και δες πόσοι το έχουν κι αυτοί.",
          ],
          cta: d.builder
            ? { label: "Δες τα προβλήματα", url: siteUrl("/#board", lang) }
            : { label: "Γράψε ένα πρόβλημα", url: siteUrl("/new", lang) },
        }),
      }
    : {
        subject: "Welcome to BuildThis",
        ...layout(lang, "account", {
          title: "Welcome! Build what people ask for.",
          paragraphs: [
            "You post the problems you want an app for and upvote the ones you have too. " +
              "Builders compete to solve the most wanted ones.",
            d.builder
              ? "Pick a problem lots of people want solved, and build the solution."
              : "What's missing from your day? Post it and see how many people have it too.",
          ],
          cta: d.builder
            ? { label: "See the problems", url: siteUrl("/#board", lang) }
            : { label: "Post a problem", url: siteUrl("/new", lang) },
        }),
      };
}

/** A problem reached one of the upvote milestones (notify.ts MILESTONES). */
export function problemVotesEmail(lang: Lang, d: { problem: string; votes: number; url: string }) {
  return lang === "el"
    ? {
        subject: `Το πρόβλημά σου «${d.problem}» έφτασε τα ${d.votes} upvotes`,
        ...layout(lang, "problem", {
          title: `Το πρόβλημά σου έφτασε τα ${d.votes} upvotes`,
          card: d.problem,
          paragraphs: [
            "Όσο περισσότερα upvotes παίρνει, τόσο πιο πιθανό είναι να το πιάσει ένας builder. " +
              "Μοιράσου το με όσους το έχουν κι αυτοί.",
          ],
          cta: { label: "Δες το πρόβλημα", url: d.url },
        }),
      }
    : {
        subject: `Your problem “${d.problem}” reached ${d.votes} upvotes`,
        ...layout(lang, "problem", {
          title: `Your problem reached ${d.votes} upvotes`,
          card: d.problem,
          paragraphs: [
            "The more upvotes it gets, the more likely a builder picks it up. " +
              "Share it with people who have it too.",
          ],
          cta: { label: "See the problem", url: d.url },
        }),
      };
}

/** A solution reached one of the upvote milestones. */
export function solutionVotesEmail(
  lang: Lang,
  d: { problem: string; solution: string; votes: number; url: string },
) {
  const problem = escapeHtml(d.problem);
  return lang === "el"
    ? {
        subject: `Η λύση σου «${d.solution}» έφτασε τα ${d.votes} upvotes`,
        ...layout(lang, "solution", {
          title: `Η λύση σου έφτασε τα ${d.votes} upvotes`,
          card: d.solution,
          paragraphs: [`Για το πρόβλημα «${problem}».`, "Ο κόσμος τη βρίσκει χρήσιμη. Συνέχισε έτσι!"],
          cta: { label: "Δες τη λύση", url: d.url },
        }),
      }
    : {
        subject: `Your solution “${d.solution}” reached ${d.votes} upvotes`,
        ...layout(lang, "solution", {
          title: `Your solution reached ${d.votes} upvotes`,
          card: d.solution,
          paragraphs: [`For the problem “${problem}”.`, "People are finding it useful. Keep it up!"],
          cta: { label: "See the solution", url: d.url },
        }),
      };
}
