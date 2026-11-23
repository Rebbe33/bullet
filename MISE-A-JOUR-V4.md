# Mise à jour V4 — liens avec tes autres applis (lecture seule)

Bullet AFFICHE ce qui vient des autres applis, il ne les modifie jamais.

## Ce qui apparaît
- 🏡 Gîtes : arrivées et départs (locataire, nombre de personnes, notes) + 🧹 « Ménage » le jour du départ.
  Le ménage passe en « ✓ validé » quand tu l'as enregistré dans l'appli gîtes (un passage ou une session d'heures,
  du même gîte, à partir du jour du départ et jusqu'à l'arrivée suivante). Non validé, il reste affiché 3 jours.
- 🌱 Plantes : UNE ligne « N soins à faire » aujourd'hui (détail par soin et par plante). Mêmes règles que l'appli plantes.
- 🐶 Vanya : rappels de santé actifs (à leur date ; en retard, ils restent affichés aujourd'hui).
- 📖 Année > Lecture : tracker annuel des pages lues (sessions de l'appli bibliothèque), objectif, pages par mois.

## À faire
1. Dans Vercel > Settings > Environment Variables, ajoute :
   - `A_SUPABASE_URL` : l'adresse du projet A (Supabase du projet A > Settings > API)
   - `A_SUPABASE_SERVICE_KEY` : la clé **secret** du projet A (jamais en NEXT_PUBLIC)
   - `A_BIBLIO_USER_ID` : ton identifiant dans le projet A (celui que tu m'as donné)
   - (facultatif) `NEXT_PUBLIC_URL_GITES`, `NEXT_PUBLIC_URL_PLANTES`, `NEXT_PUBLIC_URL_VANYA` : les adresses de tes applis
2. Envoie les fichiers du zip en UN SEUL commit, puis un seul déploiement.
3. Pas de SQL à lancer.
