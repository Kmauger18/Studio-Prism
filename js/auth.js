/* Studio Prism — comptes : Firebase Authentication + profil Firestore (users/{uid}).
 *
 * Ce module est la SEULE source de vérité côté navigateur pour l'état de connexion.
 * Il n'affiche rien : l'interface (js/account.js) s'abonne via subscribe() et appelle signUp / signIn / signOutUser / resetPassword.
 *
 * Rappels de sécurité :
 *  - le mot de passe n'est jamais lu ni stocké par le site : il est transmis à Firebase Authentication uniquement ;
 *  - un profil neuf est TOUJOURS créé avec role = "user", subscription = "free", status = "active" ;
 *    les règles Firestore (firebase/firestore.rules) refusent toute autre valeur à la création et interdisent à un
 *    utilisateur de modifier son rôle, son abonnement ou son statut. Ce code n'est qu'un confort d'interface.
 */
import {
  auth, db, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence,
  updateProfile, deleteUser, doc, collection, getDoc, updateDoc, writeBatch, serverTimestamp
} from "./firebase.js";

/* status : "loading" (état inconnu) | "out" | "in" | "error" (connecté mais profil illisible) */
let state = { status: "loading", user: null, profile: null, notice: null };
const listeners = new Set();
let seq = 0;              // ignore les chargements de profil devenus obsolètes
let pendingSignup = null; // empêche de lire le profil avant que l'inscription ne l'ait créé
let pendingNotice = null; // raison d'une déconnexion forcée (compte suspendu, profil introuvable…)

const appError = (code) => Object.assign(new Error(code), { code });

/* Résolue dès que l'état initial est connu (premier retour de onAuthStateChanged + profil). Sans cette attente, un clic très
   rapide sur « Se connecter » pourrait recevoir l'état initial « déconnecté » à la place du résultat de la connexion. */
let markReady;
const ready = new Promise((resolve) => { markReady = resolve; });
const whenReady = () => Promise.race([ready, new Promise((resolve) => setTimeout(resolve, 10000))]);

function emit(next) {
  state = next;
  if (next.status !== "loading") markReady();
  listeners.forEach((fn) => {
    try { fn(state); } catch (e) { console.error(e); }
  });
}

export const getState = () => state;

export function subscribe(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

/* Attend la prochaine émission « résolue » (hors "loading") — utilisé après signIn / signUp. */
function waitNext(ms = 20000) {
  let fn, timer;
  const promise = new Promise((resolve, reject) => {
    timer = setTimeout(() => { listeners.delete(fn); reject(appError("app/timeout")); }, ms);
    fn = (s) => {
      if (s.status === "loading") return;
      clearTimeout(timer);
      listeners.delete(fn);
      resolve(s);
    };
    listeners.add(fn);
  });
  promise.catch(() => {});
  return { promise, cancel: () => { clearTimeout(timer); listeners.delete(fn); } };
}

async function forceOut(code) {
  pendingNotice = code;
  await signOut(auth);
}

async function loadProfile(user) {
  const mine = ++seq;
  if (pendingSignup) await pendingSignup;
  if (mine !== seq || !auth.currentUser || auth.currentUser.uid !== user.uid) return;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (mine !== seq) return;
    if (!snap.exists()) return forceOut("app/profile-missing");
    const profile = { uid: user.uid, ...snap.data() };
    if (profile.status !== "active") return forceOut("app/suspended");
    emit({ status: "in", user: { uid: user.uid, email: user.email }, profile, notice: null });
  } catch (err) {
    if (mine !== seq) return;
    console.error("[Studio Prism] Lecture du profil impossible :", err);
    emit({ status: "error", user: { uid: user.uid, email: user.email }, profile: null, notice: err.code || "unknown" });
  }
}

/* Persistance de session + détection de l'état de connexion. */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    seq++;
    const notice = pendingNotice;
    pendingNotice = null;
    emit({ status: "out", user: null, profile: null, notice });
    return;
  }
  loadProfile(user);
});

/* Relit le profil de l'utilisateur connecté (bouton « Réessayer » après une erreur réseau, par exemple). */
export function refresh() {
  const user = auth.currentUser;
  if (!user) return Promise.resolve();
  emit({ ...state, status: "loading" });
  return loadProfile(user);
}

/* ------------------------------------------------------------------ inscription */
/* p : { firstName, lastName, email, password, accountKind: "individual"|"company",
 *       company?: { name, email, jobTitle?, phone?, website?, userRange, userLimit } } */
export async function signUp(p) {
  await whenReady();
  await setPersistence(auth, browserLocalPersistence);
  const next = waitNext();
  const task = (async () => {
    const cred = await createUserWithEmailAndPassword(auth, p.email, p.password);
    const user = cred.user;
    try {
      const batch = writeBatch(db);
      const profile = {
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        accountKind: p.accountKind,
        subscription: "free",   // une entreprise ne reçoit PAS Pro Entreprise automatiquement
        role: "user",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        termsAcceptedAt: serverTimestamp()
      };
      if (p.accountKind === "company" && p.company) {
        const c = p.company;
        const companyRef = doc(collection(db, "companies"));
        const companyDoc = {
          name: c.name,
          email: c.email,
          ownerUid: user.uid,
          userRange: c.userRange,
          userLimit: c.userLimit,
          subscription: "free",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        if (c.phone) companyDoc.phone = c.phone;
        if (c.website) companyDoc.website = c.website;
        batch.set(companyRef, companyDoc);
        Object.assign(profile, {
          companyId: companyRef.id,
          companyName: c.name,
          companyEmail: c.email,
          companyUserRange: c.userRange,
          companyUserLimit: c.userLimit
        });
        if (c.jobTitle) profile.jobTitle = c.jobTitle;
      }
      batch.set(doc(db, "users", user.uid), profile);
      await batch.commit();
      updateProfile(user, { displayName: `${p.firstName} ${p.lastName}` }).catch(() => {});
    } catch (err) {
      // Profil non enregistré : on annule la création du compte pour que l'utilisateur puisse réessayer proprement.
      await deleteUser(user).catch(() => {});
      throw err;
    }
  })();
  pendingSignup = task.catch(() => {});
  try {
    await task;
  } catch (err) {
    next.cancel();
    throw err;
  } finally {
    pendingSignup = null;
  }
  const s = await next.promise;
  if (s.status !== "in") throw appError(s.notice || "unknown");
  return s;
}

/* ------------------------------------------------------------------ connexion / déconnexion */
export async function signIn({ email, password, remember }) {
  await whenReady();
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const next = waitNext();
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    next.cancel();
    throw err;
  }
  const s = await next.promise;
  if (s.status !== "in") throw appError(s.notice || "unknown");
  // Meilleur effort : la connexion ne doit jamais échouer à cause de la date de dernière connexion.
  updateDoc(doc(db, "users", s.user.uid), { lastLogin: serverTimestamp() })
    .catch((e) => console.warn("[Studio Prism] lastLogin non mis à jour :", e.code || e));
  return s;
}

export async function signOutUser() {
  await signOut(auth);
}

/* ------------------------------------------------------------------ mot de passe oublié */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    // Adresse inconnue : même réponse que pour une adresse connue, pour ne pas révéler quels e-mails ont un compte.
    if (err && err.code === "auth/user-not-found") return;
    throw err;
  }
}
