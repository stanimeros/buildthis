import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { builderEmail, type Lang, siteUrl, solutionEmail } from "./emails";
import { sendEmail, ZEPTOMAIL_TOKEN } from "./lib/zeptomail";

/** What account deletion leaves in the profile (src/lib/data.ts deleteAccount). */
const DELETED = "Deleted user";

/** gRPC ALREADY_EXISTS, from `create()` on a doc that's there. */
const ALREADY_EXISTS = 6;

/** A problem's author, if they still want emails and have a verified address. */
async function recipient(uid: string): Promise<{ email: string; lang: Lang } | null> {
  const profile = (await getFirestore().doc(`users/${uid}`).get()).data();
  if (!profile || profile.name === DELETED || profile.emails === false) return null;
  const user = await getAuth().getUser(uid).catch(() => null);
  if (!user?.email || !user.emailVerified || user.disabled) return null;
  return { email: user.email, lang: profile.lang === "el" ? "el" : "en" };
}

/**
 * Marks `key` as sent; false if it already was. `mail/` has no rules, so only functions see it.
 * Keeps a builder who un-claims and claims again (or a retried trigger) from sending twice.
 */
async function firstTime(key: string) {
  try {
    await getFirestore().doc(`mail/${key}`).create({ sentAt: FieldValue.serverTimestamp() });
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === ALREADY_EXISTS) return false;
    throw err;
  }
}

/** The problem, unless it's hidden or the actor is its own author. */
async function problemFor(issueId: string, actorId: string) {
  const issue = (await getFirestore().doc(`issues/${issueId}`).get()).data();
  if (!issue || issue.hidden || issue.authorId === actorId) return null;
  return issue as { title: string; authorId: string };
}

/** "I'm building this" on someone's problem → email its author. */
export const onBuilderJoined = onDocumentCreated(
  { document: "issues/{issueId}/builders/{uid}", secrets: [ZEPTOMAIL_TOKEN] },
  async (event) => {
    const { issueId, uid } = event.params;
    const issue = await problemFor(issueId, uid);
    if (!issue) return;
    const builder = (await getFirestore().doc(`users/${uid}`).get()).data();
    const to = await recipient(issue.authorId);
    if (!builder || !to || !(await firstTime(`builder_${issueId}_${uid}`))) return;

    await sendEmail({
      to: to.email,
      ...builderEmail(to.lang, {
        problem: issue.title,
        builder: builder.name,
        url: siteUrl(`/p/${encodeURIComponent(issueId)}`, to.lang),
      }),
    });
    logger.info("email_builder_joined", { issueId, uid });
  },
);

/** A new solution → email the problem's author. */
export const onSolutionPosted = onDocumentCreated(
  { document: "solutions/{solutionId}", secrets: [ZEPTOMAIL_TOKEN] },
  async (event) => {
    const solution = event.data?.data();
    if (!solution || solution.hidden) return;
    const issue = await problemFor(solution.issueId, solution.authorId);
    if (!issue) return;
    const to = await recipient(issue.authorId);
    if (!to || !(await firstTime(`solution_${event.params.solutionId}`))) return;

    await sendEmail({
      to: to.email,
      ...solutionEmail(to.lang, {
        problem: issue.title,
        solution: solution.title,
        builder: solution.authorName,
        url: siteUrl(`/p/${encodeURIComponent(solution.issueId)}`, to.lang),
      }),
    });
    logger.info("email_solution_posted", { solutionId: event.params.solutionId });
  },
);
