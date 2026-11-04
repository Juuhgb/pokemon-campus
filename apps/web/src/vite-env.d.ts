/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Área de spawn pessoal (opcional). Defina em apps/web/.env.local — nunca commite coordenadas da sua casa. */
  readonly VITE_PERSONAL_AREA_LAT?: string;
  readonly VITE_PERSONAL_AREA_LNG?: string;
  readonly VITE_PERSONAL_AREA_RADIUS_METERS?: string;
  readonly VITE_PERSONAL_AREA_NAME?: string;
}
