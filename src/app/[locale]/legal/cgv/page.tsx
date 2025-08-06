import React from 'react';

export default function TermsOfServicePage() {
  return (
    <article className="prose max-w-none">
      <h1>Conditions Générales de Vente (CGV)</h1>
      <p className="text-sm text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
      
      <p><strong>VEUILLEZ LIRE ATTENTIVEMENT CES CONDITIONS. ELLES CONTIENNENT DES INFORMATIONS IMPORTANTES CONCERNANT VOS DROITS, RECOURS ET OBLIGATIONS.</strong></p>

      <h2>1. Objet</h2>
      <p>Les présentes conditions générales de vente (CGV) régissent les relations contractuelles entre la société [Nom de votre entreprise] (ci-après « le Vendeur ») et toute personne physique ou morale (ci-après « le Client ») souhaitant procéder à un achat via le site internet www.atelierabijoux.com (le « Site »).</p>
      <p>L'acquisition d'un produit à travers le présent site implique une acceptation sans réserve par le Client des présentes conditions de vente dont le Client reconnaît avoir pris connaissance préalablement à sa commande.</p>

      <h2>2. Produits</h2>
      <p>Les produits proposés sont ceux qui figurent sur le Site, dans la limite des stocks disponibles. Le Vendeur se réserve le droit de modifier à tout moment l'assortiment de produits. Chaque produit est présenté sur le site internet sous forme d’un descriptif reprenant ses principales caractéristiques techniques. Les photographies sont les plus fidèles possibles mais n'engagent en rien le Vendeur.</p>

      <h2>3. Tarifs</h2>
      <p>Les prix figurant sur les fiches produits sont des prix en Euros (€) toutes taxes comprises (TTC) tenant compte de la TVA applicable au jour de la commande. Le Vendeur se réserve le droit de modifier ses prix à tout moment, étant toutefois entendu que le prix figurant sur le site le jour de la commande sera le seul applicable au Client.</p>

      <h2>4. Commandes et modalités de paiement</h2>
      <p>Le Client passe commande sur le Site. Pour commander des produits, il doit remplir son panier. Avant de valider la commande, le Client a la possibilité de vérifier le détail de sa commande et son prix total et de corriger d'éventuelles erreurs. Le paiement est exigible immédiatement à la commande. Le Client peut effectuer le règlement par carte de paiement. Les paiements sont sécurisés par notre partenaire Stripe.</p>

      <h2>5. Droit de rétractation</h2>
      <p>Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture de biens confectionnés selon les spécifications du consommateur ou nettement personnalisés. De ce fait, les créations personnalisées par le Client sur le Site ne peuvent faire l'objet d'un retour.</p>

      <h2>6. Livraison</h2>
      <p>La livraison est effectuée à l'adresse de livraison indiquée par le Client lors de la commande. Les délais de livraison ne sont donnés qu’à titre indicatif.</p>

      <h2>7. Responsabilité</h2>
      <p>Le Vendeur, dans le processus de vente à distance, n'est tenu que par une obligation de moyens. Sa responsabilité ne pourra être engagée pour un dommage résultant de l'utilisation du réseau Internet tel que perte de données, intrusion, virus, rupture du service, ou autres problèmes involontaires.</p>

      <h2>8. Propriété intellectuelle</h2>
      <p>Tous les éléments du Site sont et restent la propriété intellectuelle et exclusive du Vendeur. Personne n'est autorisé à reproduire, exploiter, ou utiliser à quelque titre que ce soit, même partiellement, des éléments du site qu’ils soient sous forme de photo, logo, visuel ou texte.</p>

      <h2>9. Droit applicable et litiges</h2>
      <p>Les présentes conditions de vente à distance sont soumises à la loi française. Pour tous les litiges ou contentieux, le Tribunal compétent sera celui de [Ville de votre tribunal de commerce].</p>

    </article>
  );
}
