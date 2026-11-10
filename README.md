# Agora — plateforme et Agora Studio · by Stephen

- `plateforme/` : le site Agora (formation, communauté, tests, certificats). Version de démonstration, sans serveur : les données restent dans le navigateur. Le serveur (Google Sheets + Apps Script) viendra plus tard.
- `mobile/` : Agora Studio, l'application mobile installable, sans les leçons (Studio, recherche express, objections, orateurs, préparer, preuves, 38 ruses). Se régénère avec `node mobile/build.js` (sources dans `mobile/src`).

L'application Agora personnelle reste dans son propre dépôt, séparé. Stockage, cache et base de données de `mobile/` sont isolés (préfixes `am_`, `amob-`).

## Deux plateformes
- `plateforme/` : élèves et formateurs (le formateur ne voit que ses élèves, jamais la trésorerie).
- `admin/` : Agora Gestion, réservée aux administrateurs.
