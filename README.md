# Agora — plateforme et Agora Studio · by Stephen

- `plateforme/` : le site Agora (formation, communauté, tests, certificats). Version de démonstration, sans serveur : les données restent dans le navigateur. Le serveur (Google Sheets + Apps Script) viendra plus tard.
- `mobile/` : Agora Studio, l'application mobile installable, sans les leçons (Studio, recherche express, objections, orateurs, préparer, preuves, 38 ruses). Se régénère avec `node mobile/build.js` (sources dans `mobile/src`).

L'application Agora personnelle reste dans son propre dépôt, séparé. Stockage, cache et base de données de `mobile/` sont isolés (préfixes `am_`, `amob-`).

## Deux plateformes
- `plateforme/` : élèves et formateurs (le formateur ne voit que ses élèves, jamais la trésorerie).
- `admin/` : Agora Gestion, réservée aux administrateurs.

## Comptes et accès (serveur Google Sheet)
- `serveur/Code.gs` : serveur des comptes (Apps Script), à coller dans le Sheet de la plateforme.
- `admin/` : console de gestion unique, protégée par la clé admin. L'onglet « Comptes & accès » gère les vrais comptes (valider, bloquer, supprimer, libérer les appareils) ; les autres onglets sont encore en démonstration.
- Les élèves, paiements et séances de l'espace restent des données de démonstration pour l'instant.

## Téléphone relié au compte (voix transcrite, avancement)
- Sur la plateforme, « Mon compte » puis « Activer mon application » donne un code à 8 caractères (10 minutes, une seule utilisation). Il se saisit dans Agora Studio (« Relier mon compte »). Un seul téléphone par compte ; l'admin le libère au besoin.
- Chaque séance du téléphone part au serveur : date, sujet, durée, résultats et **texte transcrit** (jamais l'audio). Elle apparaît dans l'avancement du téléphone, dans l'onglet Studio de la plateforme et dans la console admin.
- Hors ligne, les séances attendent sur le téléphone et partent toutes seules au retour du réseau.
- Blocage, expiration ou téléphone libéré : l'appli affiche le message neutre et reprend seule dès que l'accès revient.
- Code du téléphone : `mobile/sync.js` et `mobile/sync.css`, insérés par `mobile/build.js`.
- Après une mise à jour de `serveur/Code.gs` : lancer `installer`, puis Déployer > Gérer les déploiements > Nouvelle version.

## Administrateurs et droits
- Le propriétaire (clé du Sheet, envoyée par e-mail à l'installation) ajoute des administrateurs depuis la console : onglet « Administrateurs ».
- Chaque administrateur reçoit par e-mail le lien de la console et sa clé personnelle (stockée hachée dans l'onglet `Admins`).
- Droits au choix : voir, valider, bloquer, libérer les appareils, voir les séances et transcriptions, supprimer/effacer. Gabarits : lecture seule, gestionnaire, tous les droits.
- Le propriétaire peut modifier les droits, renvoyer une clé, révoquer, réactiver ou supprimer. Le journal note qui a fait quoi.
