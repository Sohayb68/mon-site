<?php
/* =========================================================================
   ClairEspace — traitement du formulaire de devis (Hostinger / PHP)
   - Valide les champs, bloque le spam (honeypot), envoie un email.
   - Répond en JSON si appelé en AJAX (fetch), sinon redirige vers merci.html.
   ========================================================================= */

// ---------- CONFIGURATION (à personnaliser) ----------
$DESTINATAIRE = "clairespace.maison@gmail.com";     // ⚠️ où recevoir les demandes
$EXPEDITEUR   = "no-reply@clairespace.fr";          // ⚠️ adresse @votre-domaine (évite le spam)
$SUJET        = "Nouvelle demande de devis — ClairEspace";
$REDIRECT_OK  = "merci.html";                        // page après envoi (mode sans JS)
$REDIRECT_KO  = "index.html#devis";                  // page en cas d'erreur (mode sans JS)
// -----------------------------------------------------

// Détecte un appel AJAX (fetch) pour répondre en JSON
$isAjax = (
  (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'fetch')
  || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
);

function repondre($ok, $message, $isAjax, $redirect) {
  if ($isAjax) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($ok ? 200 : 422);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
  } else {
    header('Location: ' . $redirect);
  }
  exit;
}

// N'accepte que le POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  repondre(false, "Méthode non autorisée.", $isAjax, $GLOBALS['REDIRECT_KO']);
}

// Anti-spam : le champ "website" est invisible ; s'il est rempli, c'est un bot
if (!empty($_POST['website'])) {
  // On simule un succès pour ne pas informer le bot
  repondre(true, "Merci, votre demande a bien été envoyée.", $isAjax, $REDIRECT_OK);
}

// Récupération + nettoyage
function champ($k) { return isset($_POST[$k]) ? trim($_POST[$k]) : ''; }
$nom     = champ('nom');
$tel     = champ('tel');
$email   = champ('email');
$ville   = champ('ville');
$type      = champ('type');
$volume    = champ('volume');
$surface   = champ('surface');
$hauteur   = champ('hauteur');
$volume_m3 = champ('volume_m3');
$message   = champ('message');

// Validation
$erreurs = [];
if ($nom === '')   $erreurs[] = "le nom";
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $erreurs[] = "un email valide";
if (preg_replace('/\D/', '', $tel) === '' || strlen(preg_replace('/\D/', '', $tel)) < 8) $erreurs[] = "un téléphone valide";
if ($ville === '') $erreurs[] = "la ville";
if ($type === '')  $erreurs[] = "le type de débarras";

if (!empty($erreurs)) {
  repondre(false, "Merci d'indiquer : " . implode(', ', $erreurs) . ".", $isAjax, $REDIRECT_KO);
}

// Construction de l'email (texte brut)
$corps  = "Nouvelle demande de devis depuis le site ClairEspace\n";
$corps .= "------------------------------------------------------\n\n";
$corps .= "Nom         : $nom\n";
$corps .= "Téléphone   : $tel\n";
$corps .= "Email       : $email\n";
$corps .= "Ville / CP  : $ville\n";
$corps .= "Type        : $type\n";
$corps .= "Volume      : " . ($volume !== '' ? $volume : "non précisé") . "\n";
$corps .= "Surface     : " . ($surface !== '' ? $surface . " m²" : "non précisée") . "\n";
$corps .= "Hauteur     : " . ($hauteur !== '' ? $hauteur . " m" : "non précisée") . "\n";
$corps .= "Volume (m³) : " . ($volume_m3 !== '' ? $volume_m3 : "non calculé") . "\n\n";
$corps .= "Message :\n" . ($message !== '' ? $message : "(aucun)") . "\n\n";
$corps .= "------------------------------------------------------\n";
$corps .= "Reçu le " . date('d/m/Y à H:i') . "\n";

// En-têtes (nettoyés pour éviter l'injection)
$nomEntete   = preg_replace('/[\r\n]+/', ' ', $nom);
$emailEntete = preg_replace('/[\r\n]+/', '', $email);
$entetes  = "From: ClairEspace <{$EXPEDITEUR}>\r\n";
$entetes .= "Reply-To: {$nomEntete} <{$emailEntete}>\r\n";
$entetes .= "Content-Type: text/plain; charset=UTF-8\r\n";
$entetes .= "X-Mailer: PHP/" . phpversion();

$envoye = @mail($DESTINATAIRE, "=?UTF-8?B?" . base64_encode($SUJET) . "?=", $corps, $entetes);

if ($envoye) {
  repondre(true, "Merci, votre demande a bien été envoyée. Nous vous recontactons sous 24h.", $isAjax, $REDIRECT_OK);
} else {
  repondre(false, "Une erreur est survenue. Merci de nous appeler directement.", $isAjax, $REDIRECT_KO);
}
