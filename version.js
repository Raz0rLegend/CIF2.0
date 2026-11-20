/* CIF 2.0 — version, nouveautés récentes et modules.
   Petit fichier mis à jour seul lors des petites mises à jour (app.js n'a plus besoin d'être modifié).
   Nouveautés : seules les dernières versions sont détaillées, les versions 1.1 et 1.2 sont résumées. */
window.CIF = {
  version: '1.2.2',
  modules: ['mrz.js', 'naissance.js', 'saisie.js', 'expiration.js', 'passager.js', 'ecran.js', 'mc.js', 'lieux.js', 'docs.js', 'verrou.js', 'intervention.js', 'suggest.js', 'genre.js', 'employeur.js', 'vif.js', 'compact.js', 'focus.js', 'couleur.js', 'accomp.js', 'theme.js', 'scandebug.js'],
  changelog: [ ['1.2.2',['Affichage jour / nuit : clair le jour, sombre la nuit, bascule automatique à l\'aube et au crépuscule (heures calculées sur le téléphone, sans connexion)','Réglages › Affichage : Automatique, Toujours clair ou Toujours sombre','Réglages › Lecture des pièces : mode test, le bouton appareil photo ouvre la photothèque et un panneau jaune montre le texte lu par le moteur']],
    ['1.2.1',['Véhicule ajouté après coup à une fiche (contrôle piéton devenu routier) : les personnes du même contrôle deviennent automatiquement passagères de ce véhicule (sauf si elles ont leur propre véhicule ou sont marquées « Ce n\'est pas un passager »)','Véhicule du conducteur modifié (plaque, couleur…) : ses passagers sont mis à jour']],
    ['1.2.0',['Version 1.2 : nouvelle fiche de contrôle compacte (champs côte à côte, sexe ♂ M / ♀ F, filiation dans l\'identité), champ en cours toujours visible au-dessus du clavier, bouton INTER et heure d\'appel du PC figée, tuile VIF, employeur, sexe deviné d\'après le prénom, « lm » → Lui-même / Elle-même, couleurs au féminin dans la main courante, Face ID uniquement sur le bouton']],
    ['1.1.0',['Version 1.1 : scan des pièces d\'identité et du permis, passagers d\'un même véhicule, main courante complète du conducteur (véhicule, carte grise, assurance), alerte de pièce expirée, lieux connus, écran principal stabilisé']]
  ]
};
