SAE501 — Escape Game Parmi Nous

> Escape game multijoueur en ligne inspiré d'Among Us, développé dans le cadre de la SAE 501 par des étudiants MMI.

### Présentation

**SAE501 Escape Game** est une application web multijoueur où des enquêteurs doivent résoudre des énigmes pour identifier un tueur caché parmi cinq suspects. Un saboteur, dissimulé parmi les joueurs, tente de les induire en erreur.

### Principe
- Les joueurs rejoignent un **salon privé**
- Les rôles sont **attribués aléatoirement** (enquêteur ou saboteur)
- Chaque énigme résolue révèle un **indice** sur l'identité du tueur
- Les enquêteurs disposent d'une **tentative unique** pour désigner le coupable
- Victoire enquêteurs si le tueur est trouvé, victoire saboteur sinon

### Niveaux de difficulté

| Niveau | Exemples d'énigmes |
|--------|-------------------|
| 🟢 Facile | Blind test musical, jeu des différences, suite logique |
| 🟡 Moyen | Étiquettes sur objets physiques, secouer le téléphone, GPS |
| 🟠 Difficile | Gestes devant la caméra, décodage de chiffres, boussole |
| 🔴 Très difficile | Énigme GPS visuelle, reconnaissance vocale via micro, surprise |

### Mécaniques utilisées
- **Caméra** — scanner des indices cachés
- **Accéléromètre** — secouer le téléphone pour révéler un indice
- **GPS** — se rendre à un emplacement précis
- **Microphone** — reconnaissance de chanson (Shazam-like)

---

## Stack technique

| Technologie | Usage |
|-------------|-------|
| **Next.js 16** | Framework React (SSR / App Router) |
| **React 18** | UI composants |
| **TypeScript** | Typage statique |
| **Tailwind CSS** | Styles utilitaires |
| **Socket.io** | Temps réel (multijoueur) |
| **Prisma** | ORM base de données |
| **MariaDB** | Base de données relationnelle |
| **Axios** | Requêtes HTTP |
| **web-push** | Notifications push |
| **ngrok** | Tunnel local (dev/démo) |
| **crypto-js** | Chiffrement côté client |

---

## Contributeurs

Pâris,
Seyma,
Antonin,
Noé,
Joran

---

## Licence

Projet réalisé dans le cadre pédagogique de la **SAE 501** — BUT MMI.