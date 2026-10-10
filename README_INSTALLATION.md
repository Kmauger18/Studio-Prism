# Installation et mise à jour — Studio Prism (version « CMS complet + correction de la suppression des comptes »)

Ce guide met en ligne cette version **à la place** de l'ancienne, sans rien casser. Compter 30 à 45 minutes, dont la moitié d'attente (déploiement des fonctions).

> ## ⚠ Un ZIP ne suffit pas
> Cette version contient **trois choses qui ne se déploient pas en envoyant des fichiers sur GitHub** :
> 1. les **règles Firestore** (à publier dans Firebase) ;
> 2. les **règles Storage** et l'**activation de Firebase Storage** (médiathèque) ;
> 3. les **fonctions serveur** (création / suppression de comptes), à déployer chez Google.
>
> Les fichiers du site (`index.html`, `css/`, `js/`) se publient, eux, par GitHub Pages. **L'ordre compte : A → B → C → D → E.** Sans A et B, les écrans Pages / Projets / Médiathèque affichent « Accès refusé » ; sans C, la suppression de comptes reste impossible (le diagnostic intégré dit pourquoi).

**Ce qui ne change pas** : design, navigation, pages, comptes, rôles, licences, catalogue, formules et prix, configuration Firebase (`js/firebase.js`), authentification. **Aucune migration de données obligatoire** (voir §F). **Aucun paiement en ligne** n'existe ni n'est simulé.

## 0. Contenu de l'archive

Le ZIP reproduit l'arborescence du dépôt GitHub. Vous pouvez en copier **tout le contenu** par-dessus le dépôt ; aucun fichier n'est à supprimer.

| Fichier | Statut | Où se déploie-t-il ? |
| --- | --- | --- |
| `firebase/firestore.rules` | **modifié** (pages, brouillons, projets, médias, statut produit « archivé ») | **Firebase** (étape A) |
| `storage.rules` | **nouveau** | **Firebase Storage** (étape B) |
| `firebase.json` | modifié (entrée `storage`) | outil Firebase |
| `functions/handlers.js`, `functions/index.js` | **modifiés** (suppression de comptes réparée, fonction `accountsHealth`) | **Google Cloud Functions** (étape C) |
| `functions/package.json` | inchangé | — |
| `index.html` | modifié (nouveaux scripts du CMS) | GitHub Pages (étape D) |
| `js/cms.js`, `js/cmsdata.js`, `js/cmsadmin.js`, `js/cmsprojects.js`, `js/cmsmedia.js`, `js/storage.js` | **nouveaux** (CMS : rendu public, données, éditeur de pages, projets, médiathèque, Storage) | GitHub Pages |
| `css/cms.css` | **nouveau** | GitHub Pages |
| `js/data.js`, `js/platform.js`, `js/account.js`, `js/catalog.js`, `js/app.js`, `css/account.css` | modifiés | GitHub Pages |
| `README.md`, `README_INSTALLATION.md`, `CHANGELOG.md`, `TESTS.md` | mis à jour | — |
| `README_ADMIN.md`, `FONCTIONS_SERVEUR.md` | **nouveaux** | — |
| `css/style.css`, `js/boot.js`, `js/auth.js`, `js/admin.js`, `js/firebase.js`, `js/functions.js`, `js/seed.js`, `firebase/firestore.indexes.json`, `.firebaserc`, `.nojekyll`, `.gitignore`, `functions/.gitignore`, `assets/` | inchangés | — |

Le ZIP ne contient **aucun secret**, aucune clé privée, aucun `node_modules`.

## A. Publier les règles Firestore — EN PREMIER

**Console (le plus simple)**

1. <https://console.firebase.google.com> → projet `archivision-studioprism` → **Firestore Database** → **Règles**.
2. Ouvrir `firebase/firestore.rules` de l'archive, **tout sélectionner**, copier.
3. **Tout remplacer** dans la console, puis **Publier**.
4. Contrôler la date de publication et que le texte contient `match /pageDrafts/{pid}` et `match /media/{mid}`.

**Ligne de commande (équivalent)**

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes --project archivision-studioprism
```

Aucun index Firestore n'est à créer (`firebase/firestore.indexes.json` reste vide : toutes les requêtes du site n'ont qu'un critère d'égalité).

## B. Activer Firebase Storage et publier ses règles

La médiathèque (envoi d'images / vidéos) utilise Firebase Storage.

1. Console Firebase → **Build → Storage → Commencer**. Mode production, emplacement proche de vos visiteurs (par exemple `eur3`/`europe-west`). Le forfait **Blaze** est requis pour les nouveaux buckets.
2. Après création, noter le nom du bucket affiché en haut de la page Storage. Il doit être **identique** à `storageBucket` dans `js/firebase.js` (`archivision-studioprism.firebasestorage.app`). S'il est différent (ancien format `….appspot.com`), corriger `js/firebase.js` avant l'étape D.
3. Onglet **Règles** → remplacer tout le contenu par celui de `storage.rules` de l'archive → **Publier**. Ou :
   ```bash
   firebase deploy --only storage --project archivision-studioprism
   ```
4. **Autorisation inter-services.** Ces règles lisent Firestore (`firestore.get`) pour reconnaître un administrateur. Au premier déploiement, la CLI / la console propose d'accorder à Storage le droit de lire Firestore (rôle « Firebase Rules Firestore Service Agent ») : **répondre oui**. Si, ensuite, tout envoi de fichier par un administrateur est refusé alors que les règles Firestore sont bonnes, vérifier dans *Google Cloud → IAM* que l'agent de service Storage (`service-NUMERO_DU_PROJET@gcp-sa-firebasestorage.iam.gserviceaccount.com`) porte ce rôle ; le lui accorder sinon.

Ce que les règles Storage imposent : **seul un administrateur actif** envoie ou supprime ; images JPEG / PNG / WebP / GIF ≤ 8 Mo, vidéos MP4 / WebM ≤ 50 Mo ; rien d'autre (ni SVG, ni PDF, ni HTML) ; un fichier envoyé n'est jamais écrasé ; tout le reste du bucket est refusé.

> Le fichier `storage.rules` n'a **pas** pu être testé contre un vrai bucket (voir `TESTS.md`) : il a été vérifié avec un interpréteur de règles maison (45 cas, 25 mutations). Faire le test de l'étape E.

## C. Déployer les fonctions serveur

Procédure complète, zéro installation (Cloud Shell), droits à accorder et vérifications : **[`FONCTIONS_SERVEUR.md`](FONCTIONS_SERVEUR.md)**. Résumé :

```bash
(cd functions && npm install)
firebase deploy --only functions --project archivision-studioprism
```

puis, dans l'application : **Administration → Utilisateurs → Vérifier le service de comptes → Lancer le diagnostic** : trois lignes vertes attendues. Cette étape est **indispensable** pour « Ajouter un utilisateur », « Supprimer le compte » et « Supprimer mon compte ».

## D. Envoyer les fichiers du site sur GitHub

**Interface web**

1. Décompresser l'archive.
2. Dépôt `Kmauger18/Studio-Prism` → **Add file → Upload files**.
3. Glisser **le contenu** du dossier décompressé (`css`, `js`, `firebase`, `functions`, `assets`, `index.html`, `storage.rules`, `firebase.json`, les `.md`…), **pas** le dossier parent. GitHub remplace les fichiers de même chemin.
4. Message de validation, par exemple « CMS complet, médiathèque, suppression de comptes réparée », puis **Commit changes**.

**Ligne de commande (équivalent)**

```bash
git clone https://github.com/Kmauger18/Studio-Prism.git
cd Studio-Prism
# copier ici le contenu de l'archive décompressée (en écrasant)
git add -A
git commit -m "CMS complet, médiathèque, suppression de comptes réparée"
git push
```

5. Attendre 1 à 2 minutes (onglet **Actions** du dépôt / *Settings → Pages*), puis ouvrir le site et forcer le rechargement (**Ctrl + F5**, ou **Cmd + Maj + R**).

Les fichiers cachés (`.nojekyll`, `.firebaserc`, `.gitignore`) ne changent pas : s'ils ne se glissent pas, ils sont déjà sur GitHub.

> **GitHub n'exécute rien.** Envoyer `functions/` sur GitHub ne déploie pas les fonctions (étape C) ; envoyer `firebase/firestore.rules` ou `storage.rules` ne publie pas les règles (étapes A et B).

## E. Vérification après installation (≈ 15 minutes, avec le vrai projet)

1. **Site public** (déconnecté) : menu, pages, ArchiVision, Produits, Abonnements, Rendez-vous, Contact fonctionnent comme avant ; aucune page vide.
2. **Connexion** avec votre compte administrateur : **Administration** affiche **six onglets** (Utilisateurs, Catalogue, Offres et prix, Pages, Projets, Médiathèque), sans message « Accès refusé ».
3. **Médiathèque** : envoyer une petite image JPEG ou PNG → elle apparaît dans la grille ; renseigner son texte alternatif. Si « droits insuffisants » : étape B (activation / règles / autorisation inter-services).
4. **Pages** : *Pages → Accueil → Modifier*. Changer un titre (onglet **Textes et liens**), voir l'aperçu à droite changer, **Publier…**, confirmer. Ouvrir le site **déconnecté** (ou en navigation privée) : le texte modifié est visible ; **recharger** : il persiste. Puis **Dépublier…** : le texte d'origine revient.
5. **Brouillon invisible** : modifier un texte **sans publier**, ouvrir le site en navigation privée : l'ancienne version s'affiche.
6. **Image sur une page** : onglet **Textes et liens**, une image → *Choisir dans la médiathèque* → publier → visible pour un visiteur (média « Visible du public » coché).
7. **Projet** : *Projets → Nouveau projet*, le laisser en **brouillon** : absent de **Réalisations** pour un visiteur ; le **publier** : présent ; le **dépublier** : absent, mais toujours dans la liste de l'administration.
8. **Produit** : *Catalogue* → un produit de test → **Publier** puis **Dépublier** (confirmation demandée, statut « Archivé »).
9. **Diagnostic des comptes** (étape C) puis **test de suppression sur un compte d'essai créé pour l'occasion** (voir `FONCTIONS_SERVEUR.md` §9). **Ne supprimez aucun compte réel pour tester.**
10. **Téléphone** (ou fenêtre étroite) : menu, Administration → Pages, éditeur (l'aperçu passe sous les champs), envoi d'une photo depuis la galerie.

## F. Migration des données

**Rien n'est obligatoire** et rien n'est supprimé ou réécrit automatiquement :

| Donnée existante | Ce qui se passe |
| --- | --- |
| Pages du site | continuent de s'afficher avec leur contenu d'origine tant qu'aucune version n'est publiée dans le CMS (statut « Contenu d'origine ») |
| Produits (`active` / `hidden`) | lus comme Publié / Brouillon, sans conversion ; le nouveau statut `archived` n'apparaît que quand vous cliquez sur « Dépublier » |
| Produits intégrés au code | à importer une fois comme avant (*Catalogue → Importer le catalogue du site*) si ce n'est pas déjà fait |
| Utilisateurs, licences, entreprises, formules, prix | inchangés |
| Collections nouvelles (`pages`, `pageDrafts`, `projects`, `media`) | créées au premier enregistrement dans l'éditeur ; pas de script d'import |
| Visuels de produits référencés par lien (`assets/…`, `https://…`) | continuent de fonctionner ; on peut les remplacer par un média quand on veut |

Ordre conseillé si vous voulez tout migrer vers la médiathèque : envoyer les images dans la médiathèque → les choisir dans les produits / pages → publier.

## G. Retour en arrière

- **Site** : sur GitHub, ouvrir le commit de cette mise à jour → **Revert** (ou `git revert`).
- **Règles Firestore** : l'ancienne version se retrouve dans l'historique du dépôt (`firebase/firestore.rules` du commit précédent) ; la republier. Les contenus du CMS déjà créés (`pages`, `projects`, `media`…) sont alors simplement ignorés par l'ancien site et refusés par les anciennes règles ; **rien n'est perdu ni corrompu**.
- **Storage** : les fichiers déjà envoyés restent dans le bucket ; supprimer `storage.rules` de la console les rendrait inaccessibles aux administrateurs (le public continue de voir les images par leur adresse de téléchargement).
- **Fonctions** : `firebase functions:delete adminCreateUser adminDeleteUser deleteMyAccount accountsHealth --region europe-west1`, ou redéployer l'ancienne version du dossier `functions/`.
- Les comptes, licences, produits, formules et prix n'ont pas été modifiés par cette mise à jour : il n'y a rien à restaurer côté base.

## H. Limites connues (à lire)

- **Tests faits en simulation.** Le CMS, les règles Firestore / Storage et les fonctions ont été testés avec un faux SDK Firebase, un interpréteur de règles maison et un faux Admin SDK — **pas** sur le vrai projet. La liste de ce qui reste à contrôler est l'étape E et `TESTS.md`.
- **Aucune cause « confirmée » pour la suppression de comptes** : la plus probable est l'absence de déploiement des fonctions ; le diagnostic intégré le vérifie sur votre projet (`FONCTIONS_SERVEUR.md`).
- Le référencement (SEO) modifiable est appliqué **par le navigateur** (voir `README_ADMIN.md`, §7).
- Les fichiers de la médiathèque sont **publics** : n'y déposez rien de confidentiel.
- **Aucune intégration de paiement.** Une licence est ajoutée à la main par un administrateur.
- La démonstration 3D d'ArchiVision (three.js depuis un CDN) n'a pas pu être exécutée dans l'environnement de test ; son code est **identique octet pour octet** à la version précédente.
