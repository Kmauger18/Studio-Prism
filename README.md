# Studio Prism

Site de **Studio Prism — Creative & Technical Solutions** (Prism App, Prism Game, Prism 3D, ArchiVision).

Site statique : HTML, CSS et JavaScript, sans outil de build. Il est prévu pour être publié avec **GitHub Pages**.

## Structure

```
.
├── index.html          page unique (en-tête, pied de page, conteneur des pages)
├── css/style.css       styles
├── js/app.js           routeur, pages, démonstration BIM 3D, formulaires (démo)
├── assets/img/         logos (Studio Prism, ArchiVision, Prism App, Prism Game, Prism 3D)
├── .nojekyll           demande à GitHub Pages de servir les fichiers tels quels
└── README.md
```

La navigation se fait par adresses `#/…` (par exemple `#/projets/archivision`). Aucune configuration serveur n'est nécessaire, et le site fonctionne aussi bien à la racine d'un domaine que dans le sous-dossier d'un dépôt (`https://utilisateur.github.io/nom-du-depot/`).

## Voir le site en local

Depuis le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000>. Ouvrir `index.html` directement dans le navigateur fonctionne aussi.

## Mettre le site en ligne avec GitHub Pages

1. Créer un dépôt sur GitHub (par exemple `studio-prism`).
2. Y envoyer le contenu de ce dossier :
   ```bash
   git init -b main
   git add .
   git commit -m "Site Studio Prism"
   git remote add origin https://github.com/UTILISATEUR/studio-prism.git
   git push -u origin main
   ```
   (ou glisser-déposer les fichiers dans le dépôt depuis le site de GitHub)
3. Sur GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, puis branche `main`, dossier `/ (root)`, et **Save**.
4. Après une minute environ, le site est disponible sur `https://UTILISATEUR.github.io/studio-prism/`.

Pour utiliser un nom de domaine personnalisé : **Settings → Pages → Custom domain** (GitHub crée lui-même le fichier `CNAME`).

## Ressources externes

- Police **Inter** (Google Fonts).
- **three.js r128** (cdnjs), chargé uniquement sur les pages qui affichent de la 3D.

Ces deux dépendances sont citées dans la page « Cookies & données » du site.

## À savoir avant la mise en ligne

- Les pages légales (mentions légales, confidentialité, conditions d'utilisation, cookies) contiennent encore des champs **`[À COMPLÉTER]`**. Ils sont définis dans `js/app.js` (objet `LT`) et doivent être renseignés avant de rendre le site public.
- Contact, devis, rendez-vous, support, comptes ArchiVision et abonnement sont des **interfaces de démonstration** : GitHub Pages n'héberge que des fichiers statiques et aucun service d'envoi ou de paiement n'est branché.

© 2026 Studio Prism. Tous droits réservés.
