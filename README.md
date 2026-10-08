# Studio Prism

Site de **Studio Prism — Creative & Technical Solutions** (Prism App, Prism Game, Prism 3D, ArchiVision), avec les **comptes Studio Prism** (Firebase Authentication + Cloud Firestore).

Site statique : HTML, CSS et JavaScript, sans outil de build. Il se publie avec **GitHub Pages**. Les comptes passent par Firebase : aucun serveur à héberger.

## Sommaire

1. [Structure du projet](#structure-du-projet)
2. [Comptes Studio Prism : fonctionnement](#comptes-studio-prism--fonctionnement)
3. [Installer Firebase (une seule fois)](#installer-firebase-une-seule-fois)
4. [Règles de sécurité Firestore](#règles-de-sécurité-firestore)
5. [Créer le premier administrateur](#créer-le-premier-administrateur)
6. [Lancer le site en local](#lancer-le-site-en-local)
7. [Publier sur GitHub Pages](#publier-sur-github-pages)
8. [Sécurité : ce qui est public, ce qui ne l'est pas](#sécurité--ce-qui-est-public-ce-qui-ne-lest-pas)
9. [Limites actuelles et évolutions prévues](#limites-actuelles-et-évolutions-prévues)
10. [Vérification après installation](#vérification-après-installation)
11. [À compléter avant la mise en ligne](#à-compléter-avant-la-mise-en-ligne)

## Structure du projet

```
.
├── index.html               page unique (en-tête, pied de page, conteneur des pages)
├── css/
│   ├── style.css            styles du site
│   └── account.css          styles des comptes, de l'administration et de l'offre Pro Entreprise
├── js/
│   ├── app.js               routeur, pages, démonstration BIM 3D, panier, formulaires (démo), offres
│   ├── firebase.js          configuration Firebase + SDK (seul fichier qui importe le SDK)
│   ├── auth.js              inscription, connexion, déconnexion, mot de passe oublié, état de session
│   ├── admin.js             lecture et modification des comptes (réservé aux administrateurs)
│   ├── account.js           interface : pages de compte, en-tête / pied de page connectés, page Administration
│   └── boot.js              lance le routage une fois tous les scripts chargés
├── firebase/
│   ├── firestore.rules      règles de sécurité Firestore
│   └── firestore.indexes.json
├── firebase.json            configuration de la CLI Firebase (règles + index)
├── .firebaserc              projet Firebase par défaut
├── assets/img/              logos et visuels
├── .nojekyll                demande à GitHub Pages de servir les fichiers tels quels
└── README.md
```

La navigation se fait par adresses `#/…` (par exemple `#/projets/archivision`, `#/compte/connexion`, `#/admin`). Tous les chemins sont relatifs : le site fonctionne à la racine d'un domaine comme dans le sous-dossier d'un dépôt (`https://utilisateur.github.io/nom-du-depot/`).

## Comptes Studio Prism : fonctionnement

Un compte Studio Prism sert pour tous les services, **y compris ArchiVision** : ArchiVision n'a plus de compte séparé. Les boutons « Créer un compte » / « Se connecter » d'ArchiVision ouvrent les écrans Studio Prism (avec un rappel du contexte ArchiVision).

### Écrans

| Adresse | Rôle |
| --- | --- |
| `#/compte/inscription` | Créer un compte Studio Prism (Particulier ou Entreprise) |
| `#/compte/connexion` | Se connecter, « Se souvenir de moi », « Mot de passe oublié ? » |
| `#/archivision/inscription`, `#/archivision/connexion` | Mêmes écrans, avec le contexte ArchiVision |
| `#/admin` | **Administration Studio Prism** (page provisoire vers laquelle tout le monde est envoyé après connexion) |
| `#/abonnement` | Formules Free, Pro et **Pro Entreprise** |

- **Visiteur** : l'en-tête n'affiche pas de bouton de compte ; le pied de page (colonne « Studio Prism ») propose « Créer un compte » et « Se connecter ».
- **Connecté** : l'en-tête affiche « Mon compte » et « Se déconnecter » (dans le menu sur mobile) ; le pied de page propose « Mon compte » et « Se déconnecter ».
- Un utilisateur **non administrateur** qui ouvre `#/admin` voit uniquement la fiche de son propre compte (pas la liste des utilisateurs).

### Modèle de données

Quatre notions **séparées** (une entreprise n'obtient **pas** automatiquement Pro Entreprise) :

| Champ | Valeurs | Valeur à la création |
| --- | --- | --- |
| `accountKind` | `individual` (Particulier), `company` (Entreprise) | selon le choix |
| `subscription` | `free`, `pro`, `pro_entreprise` | `free` |
| `role` | `user`, `admin` | `user` |
| `status` | `active`, `suspended` | `active` |

Collection `users/{uid}` (l'identifiant du document est l'UID Firebase Authentication) :
`firstName`, `lastName`, `email`, `accountKind`, `subscription`, `role`, `status`, `createdAt`, `updatedAt`, `lastLogin`, `termsAcceptedAt`, et pour une entreprise : `companyId`, `companyName`, `companyEmail`, `companyUserRange` (`1`, `2-10`, `11-25`, `26-50`, `51-100`, `100+`), `companyUserLimit`, `jobTitle` (facultatif).

Collection `companies/{companyId}` (créée uniquement à l'inscription d'une entreprise) :
`name`, `email`, `ownerUid`, `userRange`, `userLimit`, `subscription`, `createdAt`, `updatedAt`, `phone` et `website` (facultatifs).

**Le mot de passe n'est jamais stocké dans Firestore** (ni lu par le site) : il est envoyé uniquement à Firebase Authentication.

### Administration

Un administrateur actif voit : le nombre d'utilisateurs, de comptes Free / Pro / Pro Entreprise et d'administrateurs (compteurs calculés côté serveur) ; la liste des comptes, du plus récent au plus ancien, par pages de 50 (« Charger plus ») ; une recherche (nom, prénom, e-mail, entreprise) et des filtres (Particulier / Entreprise, Free / Pro / Pro Entreprise, rôle, actif / suspendu). Il peut modifier l'**abonnement**, le **rôle** et le **statut** d'un compte ; les changements sont enregistrés dans Firestore. Il ne peut pas modifier son propre rôle ni son propre statut.

La recherche et les filtres portent sur les utilisateurs **déjà chargés** (le message au-dessus de la liste le rappelle). Pour une recherche sur toute la base à grande échelle, prévoir un index de recherche dédié (voir « Évolutions »).

### Pro Entreprise

La page « Passer à Pro » propose trois offres : Free, Pro, **Pro Entreprise** (sur devis, avec un choix indicatif du nombre d'utilisateurs). **Aucun tarif n'est inventé et aucun paiement n'est branché** : le bouton mène au formulaire de contact. La structure (`SUBSCRIPTION_CONFIG.plans.PRO_ENTREPRISE` dans `js/app.js`) est prête pour renseigner des prix et brancher Stripe plus tard.

## Installer Firebase (une seule fois)

Le projet Firebase utilisé par défaut est `archivision-studioprism` (voir `js/firebase.js` et `.firebaserc`). Pour utiliser un autre projet, remplacer l'objet `firebaseConfig` dans `js/firebase.js` (Console Firebase → Paramètres du projet → Vos applications → Configuration du SDK) et le projet dans `.firebaserc`.

1. **Authentication** : Console Firebase → *Build → Authentication → Sign-in method* → activer **Adresse e-mail / Mot de passe** (laisser « Lien par e-mail » désactivé).
2. **Domaines autorisés** : *Authentication → Settings → Authorized domains* → ajouter `UTILISATEUR.github.io` (et votre domaine personnalisé s'il y en a un). `localhost` est présent par défaut.
3. **E-mail de réinitialisation** : *Authentication → Templates → Réinitialisation du mot de passe* → vérifier la langue (Français) et le nom d'expéditeur. C'est Firebase qui envoie l'e-mail.
4. **Firestore** : *Build → Firestore Database → Créer une base de données* (mode production, région européenne au choix).
5. **Règles** : voir la section suivante (indispensable : sans elles, aucun profil ne peut être créé).
6. *(Recommandé)* **Restreindre la clé API Web** : Console Google Cloud → *APIs & Services → Credentials* → clé « Browser key » → *Application restrictions : Websites* → `https://UTILISATEUR.github.io/*` et `http://localhost:*/*`.

Firebase Analytics n'est **pas** activé (il déposerait des identifiants de suivi sans recueil de consentement). `measurementId` reste dans la configuration pour une activation ultérieure accompagnée d'un bandeau de consentement.

## Règles de sécurité Firestore

Les règles sont dans `firebase/firestore.rules`. Principes :

- tout est refusé par défaut (aucune règle « utilisateur connecté = accès à tout ») ;
- un utilisateur lit **uniquement son propre profil** ; il peut seulement mettre à jour sa date de dernière connexion ;
- à la création, le profil doit avoir `role = user`, `subscription = free`, `status = active` ; un utilisateur **ne peut pas** modifier son rôle, son abonnement ni son statut ;
- seul un administrateur **actif** (`role == admin` et `status == active` lus dans `users/{uid}`) peut lister les comptes et modifier `subscription`, `role`, `status` (valeurs dans des listes fermées) ; il ne peut pas modifier son propre rôle ni son propre statut ;
- la suppression de documents est interdite depuis le navigateur.

Déploiement, au choix :

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

ou copier-coller le contenu de `firebase/firestore.rules` dans *Console Firebase → Firestore Database → Règles* puis **Publier**.

> Les règles n'ont pas pu être exécutées pendant la préparation de ce projet (pas d'accès réseau). Après déploiement, suivre la [vérification](#vérification-après-installation) ; l'onglet **Simulateur de règles** de la console permet aussi de tester chaque cas.

## Créer le premier administrateur

Personne ne peut se déclarer administrateur depuis le site (c'est voulu). Le premier administrateur se définit **à la main** dans la console, qui contourne les règles :

1. Sur le site, créer un compte normalement (`#/compte/inscription`).
2. Console Firebase → *Authentication → Users* : copier l'**UID** du compte.
3. *Firestore Database → Données → `users` → document portant cet UID* → modifier le champ `role` : `admin` (type *string*). Facultatif : `subscription` → `pro_entreprise`.
4. Se déconnecter puis se reconnecter sur le site : la page **Administration Studio Prism** affiche la liste des comptes.

Les administrateurs suivants se nomment ensuite depuis la page Administration (Modifier → Rôle).

## Lancer le site en local

Les comptes utilisent des modules JavaScript (`import`) : ils **ne fonctionnent pas** en ouvrant `index.html` directement (`file://`). Utiliser un petit serveur local :

```bash
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000>. (Le reste du site s'affiche aussi sans serveur, mais pas les comptes.)

## Publier sur GitHub Pages

1. Créer un dépôt sur GitHub (par exemple `studio-prism`) et y envoyer le contenu de ce dossier :
   ```bash
   git init -b main
   git add .
   git commit -m "Site Studio Prism"
   git remote add origin https://github.com/UTILISATEUR/studio-prism.git
   git push -u origin main
   ```
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`, **Save**.
3. Après une minute environ, le site est disponible sur `https://UTILISATEUR.github.io/studio-prism/`.
4. Vérifier que ce domaine figure dans les **domaines autorisés** Firebase (étape 2 de l'installation).

Domaine personnalisé : **Settings → Pages → Custom domain**, puis l'ajouter aussi aux domaines autorisés Firebase.

## Sécurité : ce qui est public, ce qui ne l'est pas

- La configuration Web Firebase (`apiKey`, `projectId`…) de `js/firebase.js` est **publique par conception** : elle identifie le projet, elle ne donne aucun droit. La sécurité repose sur Firebase Authentication et sur les règles Firestore.
- **Ne jamais** ajouter au dépôt (ni à un fichier du site) une clé privée Firebase Admin SDK, un fichier de compte de service ou un secret : GitHub Pages publie tout le dépôt. Le dossier `firebase/` (règles) est lui aussi public ; les règles ne sont pas un secret.
- Les droits ne reposent jamais sur le JavaScript du navigateur : masquer un bouton n'empêche rien ; ce sont les règles, appliquées par Google, qui refusent un accès non autorisé.
- Toutes les données venant de Firestore sont **échappées** avant affichage (un nom contenant du HTML s'affiche comme du texte).
- « Mot de passe oublié » répond de la même façon que l'adresse existe ou non (pas de divulgation des e-mails inscrits).
- Les rôles sont lus dans Firestore (`users/{uid}.role`), pas dans un jeton modifiable par l'utilisateur.

## Limites actuelles et évolutions prévues

- **Suspension** : un compte `suspended` est refusé par le site (déconnexion avec message) et perd ses droits dans les règles, mais son compte Firebase Authentication reste « actif » : on ne peut pas le désactiver ni le supprimer depuis un site statique (cela demande l'Admin SDK, donc des Cloud Functions ou la console). Tout futur service payant ou sensible devra aussi tester `status` côté serveur.
- **Inscription interrompue** : en cas de coupure entre la création du compte et celle du profil, le site annule la création du compte. Dans le cas rare où l'annulation échoue, le compte existe sans profil : la connexion est refusée (« profil introuvable ») ; corriger depuis la console (créer le profil, ou supprimer l'utilisateur dans Authentication).
- **Paiement** : aucune passerelle (Stripe) n'est branchée ; l'abonnement se change à la main dans la page Administration. Prévoir ensuite des Cloud Functions + webhook Stripe qui écrivent `subscription`.
- **Espaces séparés Free / Pro / Pro Entreprise** : tout le monde arrive pour l'instant sur `#/admin`. La redirection est centralisée dans `spHome()` (`js/account.js`) : il suffira d'y associer une adresse par abonnement.
- **Recherche sur très gros volume** : filtrage sur les comptes chargés ; au-delà de quelques milliers de comptes, ajouter un index de recherche (Algolia, Typesense, ou extension Firebase).
- **Version du SDK** : `10.14.1`, indiquée dans `js/firebase.js` uniquement. Si un jour l'adresse `gstatic.com/firebasejs/<version>/…` ne répond plus, y mettre une version actuelle.
- **Durcissement possible** : Firebase App Check (reCAPTCHA), vérification de l'e-mail, authentification à deux facteurs pour les administrateurs, tests des règles avec l'émulateur Firebase.

## Vérification après installation

À faire une fois, sur le site publié (ou en local), avec le vrai projet Firebase :

1. Créer un compte **Particulier** → arrivée sur `#/admin` (fiche « Mon compte » car non administrateur). Dans la console : `users/{uid}` contient `accountKind: individual`, `subscription: free`, `role: user`, `status: active`.
2. Se déconnecter (en-tête), puis se reconnecter ; recharger la page (la session doit rester ouverte) ; tester « Se souvenir de moi » décoché.
3. « Mot de passe oublié ? » → e-mail reçu.
4. Créer un compte **Entreprise** → un document `companies/…` apparaît, `users/{uid}` contient les champs entreprise et **`subscription: free`**.
5. Passer le premier compte en `admin` (console) → la liste, les compteurs, la recherche et les filtres s'affichent ; modifier l'abonnement d'un autre compte → vérifier dans la console.
6. Avec un compte non administrateur, ouvrir `#/admin` : aucune liste. Dans la console du navigateur, tenter une lecture de `users` → `permission-denied`.
7. Passer un compte en `suspended` → sa connexion est refusée avec un message.
8. Depuis la fiche ArchiVision (`#/projets/archivision`), les liens « Créer un compte » / « Se connecter » ouvrent les écrans Studio Prism.

## À compléter avant la mise en ligne

- Les pages légales (mentions légales, confidentialité, conditions d'utilisation, cookies) contiennent encore des champs **`[À COMPLÉTER]`** (objet `LT` de `js/app.js`) : identité de l'éditeur, hébergeur, contact, durées de conservation, etc. Les textes ont été adaptés aux comptes (données collectées, finalités, services tiers Google/Firebase, stockage technique de session) mais doivent être relus et validés par vos soins.
- Contact, devis, rendez-vous, support et panier restent des **interfaces de démonstration** : GitHub Pages n'héberge que des fichiers statiques et aucun service d'envoi ou de paiement n'est branché.

## Ressources externes

- Police **Inter** (Google Fonts).
- **three.js r128** (cdnjs), chargé uniquement sur les pages qui affichent de la 3D.
- **SDK Firebase** (`www.gstatic.com`), chargé pour les comptes.

© 2026 Studio Prism. Tous droits réservés.
