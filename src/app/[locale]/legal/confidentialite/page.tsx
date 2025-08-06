import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <article className="prose max-w-none">
      <h1>Politique de Confidentialité</h1>
      <p className="text-sm text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

      <p>La présente Politique de Confidentialité décrit la manière dont vos informations personnelles sont collectées, utilisées et partagées lorsque vous visitez ou effectuez un achat sur www.atelierabijoux.com (le « Site »).</p>

      <h2>Informations personnelles que nous collectons</h2>
      <p>Lorsque vous visitez le Site, nous collectons automatiquement certaines informations sur votre appareil, notamment des informations sur votre navigateur web, votre adresse IP, votre fuseau horaire et certains des cookies installés sur votre appareil.</p>
      <p>Lorsque vous effectuez un achat ou tentez d'effectuer un achat via le Site, nous collectons certaines informations vous concernant, notamment votre nom, votre adresse de facturation, votre adresse de livraison, vos informations de paiement (y compris les numéros de carte de crédit), votre adresse e-mail et votre numéro de téléphone. Nous appelons ces informations « Informations sur la Commande ».</p>
      <p>Lorsque nous parlons d'« Informations Personnelles » dans cette Politique de Confidentialité, nous parlons à la fois des Informations sur l'Appareil et des Informations sur la Commande.</p>
      
      <h2>Comment utilisons-nous vos informations personnelles ?</h2>
      <p>Nous utilisons les Informations sur la Commande que nous collectons généralement pour exécuter toute commande passée via le Site (y compris le traitement de vos informations de paiement, l'organisation de l'expédition et la fourniture de factures et/ou de confirmations de commande).</p>
      <p>De plus, nous utilisons ces Informations sur la Commande pour :</p>
      <ul>
        <li>Communiquer avec vous ;</li>
        <li>Examiner nos commandes pour détecter tout risque potentiel ou fraude ;</li>
        <li>Lorsque cela correspond aux préférences que vous nous avez communiquées, vous fournir des informations ou de la publicité concernant nos produits ou services.</li>
      </ul>

      <h2>Partage de vos informations personnelles</h2>
      <p>Nous partageons vos Informations Personnelles avec des tiers pour nous aider à utiliser vos Informations Personnelles, comme décrit ci-dessus. Par exemple, nous utilisons Google Firebase pour faire fonctionner notre site. Nous utilisons également Google Analytics pour nous aider à comprendre comment nos clients utilisent le Site.</p>
      <p>Enfin, nous pouvons également partager vos Informations Personnelles pour nous conformer aux lois et réglementations applicables, pour répondre à une citation à comparaître, à un mandat de perquisition ou à toute autre demande légale d'informations que nous recevons, ou pour protéger nos droits.</p>

      <h2>Vos droits</h2>
      <p>Si vous êtes un résident européen, vous disposez d'un droit d'accès aux informations personnelles que nous détenons à votre sujet et de demander que vos informations personnelles soient corrigées, mises à jour ou supprimées. Si vous souhaitez exercer ce droit, veuillez nous contacter via les coordonnées ci-dessous.</p>

      <h2>Conservation des données</h2>
      <p>Lorsque vous passez une commande via le Site, nous conserverons vos Informations sur la Commande pour nos dossiers, sauf si et jusqu'à ce que vous nous demandiez de supprimer ces informations.</p>

      <h2>Modifications</h2>
      <p>Nous pouvons mettre à jour cette politique de confidentialité de temps à autre afin de refléter, par exemple, des changements dans nos pratiques ou pour d'autres raisons opérationnelles, légales ou réglementaires.</p>

      <h2>Contactez-nous</h2>
      <p>Pour plus d'informations sur nos pratiques de confidentialité, si vous avez des questions, ou si vous souhaitez déposer une réclamation, veuillez nous contacter par e-mail à support@atelierabijoux.com ou par courrier en utilisant les détails fournis dans nos mentions légales.</p>
    </article>
  );
}
