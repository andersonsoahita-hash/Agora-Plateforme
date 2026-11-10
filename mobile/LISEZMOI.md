# Agora Studio — application mobile

Variante de l'application Agora **sans les leçons** : Studio, recherche express, objections, orateurs, préparer, preuves et les 38 ruses.
Elle est générée par `node mobile/build.js` à partir des sources de `src` (qui ne sont jamais modifiées).
Stockage, cache et base de données sont isolés de l'application à la racine (préfixes `am_`, `amob-`, `agora_m_db`).
`mobile/acces.json` est son propre coupe-circuit.
