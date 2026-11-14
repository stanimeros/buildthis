import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import {
  builderEmail,
  type Lang,
  problemVotesEmail,
  siteUrl,
  solutionEmail,
  solutionVotesEmail,
  welcomeEmail,
} from "./emails";
import { sendEmail, ZEPTOMAIL_TOKEN } from "./lib/zeptomail";

/** What account deletion leaves in the profile (src/lib/data.ts deleteAccount). */
const DELETED = "Deleted user";

/** Upvote counts that get an email to the author, once each. */
const MILESTONES = [5, 10, 25, 50, 100];

/** The highest milestone this change crossed going up, if any. */
function milestone(before: number, after: number) {
  return MILESTONES.filter((m) => before < m && after >= m).pop();
}

/** gRPC ALREADY_EXISTS, from `create()` on a doc that's there. */
const ALREADY_EXISTS = 6;

/** A user (usually a problem's author), if they still want emails and have a verified address. */
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

/** A new profile (end of onboarding) → welcome email. */
export const onSignup = onDocumentCreated(
  { document: "users/{uid}", secrets: [ZEPTOMAIL_TOKEN] },
  async (event) => {
    const { uid } = event.params;
    const profile = event.data?.data();
    const to = await recipient(uid);
    if (!profile || !to || !(await firstTime(`welcome_${uid}`))) return;

    await sendEmail({ to: to.email, ...welcomeEmail(to.lang, { builder: profile.role !== "user" }) });
    logger.info("email_welcome", { uid });
  },
);

/** A problem's upvotes cross a milestone → email its author. */
export const onProblemVotes = onDocumentUpdated(
  { document: "issues/{issueId}", secrets: [ZEPTOMAIL_TOKEN] },
  async (event) => {
    const before = event.data?.before.data();
    const issue = event.data?.after.data();
    if (!before || !issue || issue.hidden) return;
    const votes = milestone(before.votes ?? 0, issue.votes ?? 0);
    if (!votes) return;
    const { issueId } = event.params;
    const to = await recipient(issue.authorId);
    if (!to || !(await firstTime(`votes_${issueId}_${votes}`))) return;

    await sendEmail({
      to: to.email,
      ...problemVotesEmail(to.lang, {
        problem: issue.title,
        votes,
        url: siteUrl(`/p/${encodeURIComponent(issueId)}`, to.lang),
      }),
    });
    logger.info("email_problem_votes", { issueId, votes });
  },
);

/** A solution's upvotes cross a milestone → email the builder. */
export const onSolutionVotes = onDocumentUpdated(
  { document: "solutions/{solutionId}", secrets: [ZEPTOMAIL_TOKEN] },
  async (event) => {
    const before = event.data?.before.data();
    const solution = event.data?.after.data();
    if (!before || !solution || solution.hidden) return;
    const votes = milestone(before.votes ?? 0, solution.votes ?? 0);
    if (!votes) return;
    const { solutionId } = event.params;
    const issue = (await getFirestore().doc(`issues/${solution.issueId}`).get()).data();
    const to = await recipient(solution.authorId);
    if (!issue || issue.hidden || !to || !(await firstTime(`votes_${solutionId}_${votes}`))) return;

    await sendEmail({
      to: to.email,
      ...solutionVotesEmail(to.lang, {
        problem: issue.title,
        solution: solution.title,
        votes,
        url: siteUrl(`/p/${encodeURIComponent(solution.issueId)}`, to.lang),
      }),
    });
    logger.info("email_solution_votes", { solutionId, votes });
  },
);
