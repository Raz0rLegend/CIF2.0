/* CIF 2.0 — version, nouveautés récentes et modules.
   Petit fichier mis à jour seul lors des petites mises à jour (app.js n'a plus besoin d'être modifié).
   Nouveautés : seule la dernière version est détaillée, les précédentes sont résumées. */
window.CIF = {
  version: '2.0.4',
  modules: ['pieces.js', 'affichage.js', 'acces.js', 'fiche.js', 'outils.js', 'plaque.js'],
  changelog: [ ['2.0.4',['Plaques 2 roues : quand le véhicule est en 2RM, le cadre passe au format moto (plus petit, presque carré) et la lecture prend les deux lignes de la plaque (AB-123 / CD, Italie AB 12345)','Lecture des plaques plus sûre : le cadre sombre autour de la plaque ne gêne plus, notamment la nuit']],
    ['2.0.3',['Lecture des plaques : bouton appareil photo à droite de chaque champ Plaque. Cadre au format plaque, plusieurs lectures comparées, mise au format du pays (AB-123-CD, ancien 123 ABC 06, Monaco, Italie). La plaque lue est entourée en orange : à vérifier','Mode développeur : photothèque dans la visée des plaques ; sur une photo entière, l\'appli cherche elle-même la plaque','Scan des pièces : un seul cadre commun à toutes les pièces (carte, permis, titre de séjour, passeport)']],
    ['2.0.2',['Cadre de visée pour scanner les pièces : seule la pièce est gardée, image la plus nette choisie parmi plusieurs prises en rafale, lampe si le téléphone le permet']],
    ['2.0.1',['Correction : en corrigeant une lettre au milieu d\'un mot (adresse, prénom, ville…), le clavier de l\'iPhone la mettait parfois en majuscule (« boulevaRd ») ; elle est maintenant remise en minuscule. Les mots en capitales et le champ Nom ne sont pas touchés']],
    ['2.0.0',['Version 2.0 : les 23 petits modules de l\'appli sont regroupés en 5 fichiers (pièces, affichage, accès, fiche, outils) : démarrage plus rapide, surtout en réseau faible, et mises à jour plus sûres. Rien ne change à l\'usage','Une erreur dans une partie de l\'appli n\'empêche plus les autres de se charger']],
    ['1.2.13',['Mode jour plus lisible (bordures, textes et icônes plus foncés), bouton Face ID en bleu']],
    ['1.2',['Lecture des pièces testée sur 39 documents de 7 pays (France, Monaco, Italie, Portugal, Allemagne, Suisse, Royaume-Uni) : passeports, cartes d\'identité recto et verso, permis, titres de séjour','Chronologie (bouton horloge « + », barre CHRONUS dans la fiche enregistrée), mode développeur (code), mode test de lecture','Affichage jour / nuit automatique au crépuscule','Fiche compacte (sexe ♂ M / ♀ F, filiation dans l\'identité), champ en cours toujours visible au-dessus du clavier, « lm » → Lui-même / Elle-même, couleurs au féminin dans la main courante','Accompagnants devenus passagers quand un véhicule est ajouté après coup']],
    ['1.1.0',['Version 1.1 : scan des pièces d\'identité et du permis, passagers d\'un même véhicule, main courante complète du conducteur (véhicule, carte grise, assurance), alerte de pièce expirée, lieux connus, écran principal stabilisé']]
  ]
};
