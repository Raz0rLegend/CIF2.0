/* CIF 2.0 — version, nouveautés récentes et modules.
   Petit fichier mis à jour seul lors des petites mises à jour (app.js n'a plus besoin d'être modifié). */
window.CIF = {
  version: '1.0.8',
  modules: ['mrz.js'],
  changelog: [
    ['1.0.8', ['Nouvelle fiche : bouton « Scanner une pièce d\'identité » (lecture de la bande <<< des passeports, cartes d\'identité et titres de séjour) qui remplit nom, prénoms, date de naissance, sexe, nationalité et numéro du document', 'Lecture faite sur le téléphone : la photo n\'est ni envoyée ni conservée (module de lecture d\'environ 5 Mo téléchargé une seule fois)', 'Lieu de naissance comme l\'adresse : ville avec code postal (communes de France et Monaco) ou ville + pays. Main courante : « né à Nice (06000) », « né à Pigna en Italie », « né à Monaco »', 'Feuille de service et photos : zoom à deux doigts, double tap pour zoomer, croix pour fermer', 'Mises à jour plus légères : version et nouveautés dans un petit fichier séparé']]
  ]
};
