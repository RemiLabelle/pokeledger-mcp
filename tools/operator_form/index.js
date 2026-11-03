const OPERATOR_TIMEOUT_MS = 60 * 60 * 1000;

// Ouvre un formulaire de l'opérateur en lui laissant une heure pour répondre, au lieu des 60 secondes par défaut du SDK.
export function askOperatorForm(server, params) {
  return server.server.elicitInput(params, { timeout: OPERATOR_TIMEOUT_MS });
}
