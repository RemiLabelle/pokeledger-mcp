import { createHash, timingSafeEqual } from "node:crypto";

// Schéma Bearer (insensible à la casse, RFC 7235) suivi d'une seule espace et d'un jeton sans blanc.
const BEARER = /^Bearer (\S+)$/i;

// Calcule l'empreinte SHA-256 d'une valeur : une longueur fixe permet la comparaison en temps constant.
function digest(value) {
  return createHash("sha256").update(value).digest();
}

// Crée la garde qui vérifie l'en-tête Authorization d'une requête contre le jeton bearer de référence.
export function createBearerGuard(expectedToken) {
  if (typeof expectedToken !== "string" || expectedToken === "") {
    throw new TypeError("A non-empty bearer token is required");
  }
  const expected = digest(expectedToken);

  // Indique si l'en-tête porte exactement le jeton de référence, sans révéler sa longueur ni son contenu.
  return (authorization = "") => {
    const match = BEARER.exec(authorization);
    return match !== null && timingSafeEqual(digest(match[1]), expected);
  };
}
