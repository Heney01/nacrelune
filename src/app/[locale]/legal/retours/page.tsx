import React from 'react';

export default function ReturnsPolicyPage() {
  return (
    <article className="prose max-w-none">
      <h1>Politique de Retour et de Rétractation</h1>
      <p className="text-sm text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

      <h2>Droit de rétractation</h2>
      <p>Conformément aux dispositions de l'article L.221-18 du Code de la Consommation, le client dispose d'un délai de 14 jours pour exercer son droit de rétractation d'un contrat conclu à distance, sans avoir à motiver sa décision ni à supporter d'autres coûts que ceux prévus aux articles L. 221-23 à L. 221-25.</p>

      <h2>Exception au droit de rétractation</h2>
      <p>Cependant, en vertu de l'article L.221-28, 3° du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture de biens confectionnés selon les spécifications du consommateur ou nettement personnalisés.</p>
      <p><strong>Tous les bijoux créés et assemblés sur mesure par le client via l'éditeur de notre Site sont considérés comme des biens "nettement personnalisés". Par conséquent, ils ne sont ni repris, ni échangés, ni remboursés.</strong></p>
      <p>Nous vous invitons à bien vérifier votre création (modèle, breloques, etc.) dans le panier avant de finaliser votre commande.</p>
      
      <h2>Produits non personnalisés</h2>
      <p>Si nous venions à vendre des produits non personnalisés (par exemple, des chaînes ou des breloques seules, sans assemblage), le droit de rétractation de 14 jours s'appliquerait. Dans ce cas, pour exercer ce droit, le client devra nous notifier sa décision de se rétracter du présent contrat au moyen d'une déclaration dénuée d'ambiguïté.</p>
      <p>Les frais de retour du produit resteront à la charge du client.</p>

      <h2>Produits défectueux ou non-conformes</h2>
      <p>En cas de réception d'un article défectueux ou non-conforme à votre commande, veuillez nous contacter immédiatement à l'adresse [Votre adresse email de contact] avec une photo du problème. Nous trouverons une solution appropriée, qui pourra être un remplacement ou un remboursement, au cas par cas.</p>
    </article>
  );
}
