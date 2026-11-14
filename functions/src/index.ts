import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();

// Firestore is in eur3, so the triggers run next to it.
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

export {
  onBuilderJoined,
  onProblemVotes,
  onSignup,
  onSolutionPosted,
  onSolutionVotes,
} from "./notify";
