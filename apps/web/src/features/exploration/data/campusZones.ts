import type { CampusZone, GeoPoint } from '../types.js';

/**
 * Centro do Campus Luiz Meneghel (UENP), Bandeirantes – PR.
 * Fonte: OpenStreetMap/Nominatim ("UENP - Campus Luiz Meneghel", Av. Tiradentes).
 */
export const CAMPUS_CENTER: GeoPoint = { latitude: -23.1131197, longitude: -50.3570162 };

/** Área aproximada do campus segundo a bounding box do OpenStreetMap. Usada para limitar o mapa. */
export const CAMPUS_BOUNDS: [GeoPoint, GeoPoint] = [
  { latitude: -23.1209055, longitude: -50.3636896 },
  { latitude: -23.1048961, longitude: -50.3506991 },
];

export const CAMPUS_DEFAULT_ZOOM = 17;

/**
 * Zonas dos cursos. Ciência da Computação, Enfermagem e Agronomia seguem lugares reais
 * do mapa (contornos do OpenStreetMap). As marcadas com `isDemo: true` ainda são
 * ⚠️ RETÂNGULOS DE DEMONSTRAÇÃO, posicionados arbitrariamente: substitua `boundary`
 * por coordenadas verificadas (ou carregue-as de GET /api/v1/zones) e defina `isDemo: false`.
 */
export const CAMPUS_ZONES: CampusZone[] = [
  // Contorno da "Mata Central UENP" (OpenStreetMap, way 638318339).
  {
    id: 'a1f1c2d3-0001-4000-8000-000000000001',
    slug: 'ciencia-da-computacao',
    name: 'Ciência da Computação',
    color: '#38bdf8',
    isDemo: false,
    boundary: [
      { latitude: -23.10664, longitude: -50.360906 },
      { latitude: -23.106969, longitude: -50.361434 },
      { latitude: -23.108495, longitude: -50.360423 },
      { latitude: -23.108199, longitude: -50.359865 },
      { latitude: -23.108021, longitude: -50.359914 },
      { latitude: -23.107895, longitude: -50.359667 },
      { latitude: -23.107662, longitude: -50.359814 },
      { latitude: -23.107474, longitude: -50.35994 },
      { latitude: -23.106817, longitude: -50.358717 },
      { latitude: -23.106147, longitude: -50.359291 },
      { latitude: -23.106408, longitude: -50.359769 },
      { latitude: -23.106744, longitude: -50.359581 },
      { latitude: -23.106906, longitude: -50.359594 },
      { latitude: -23.107362, longitude: -50.360411 },
      { latitude: -23.107148, longitude: -50.360563 },
    ],
  },
  {
    id: 'a1f1c2d3-0002-4000-8000-000000000002',
    slug: 'biologia',
    name: 'Biologia',
    color: '#4ade80',
    isDemo: true,
    boundary: [
      { latitude: -23.110155, longitude: -50.356039 },
      { latitude: -23.110155, longitude: -50.354672 },
      { latitude: -23.111413, longitude: -50.354672 },
      { latitude: -23.111413, longitude: -50.356039 },
    ],
  },
  // "Mata Setor Enfermagem" + prédio "Setor Enfermagem" (OpenStreetMap, ways 638318343 e 638318364).
  {
    id: 'a1f1c2d3-0003-4000-8000-000000000003',
    slug: 'enfermagem',
    name: 'Enfermagem',
    color: '#f472b6',
    isDemo: false,
    boundary: [
      { latitude: -23.109731, longitude: -50.360815 },
      { latitude: -23.109424, longitude: -50.361019 },
      { latitude: -23.108983, longitude: -50.360303 },
      { latitude: -23.108852, longitude: -50.360031 },
      { latitude: -23.10865, longitude: -50.359592 },
      { latitude: -23.109091, longitude: -50.359322 },
      { latitude: -23.109306, longitude: -50.359668 },
      { latitude: -23.109439, longitude: -50.3599 },
      { latitude: -23.10971, longitude: -50.360395 },
    ],
  },
  {
    id: 'a1f1c2d3-0004-4000-8000-000000000004',
    slug: 'medicina-veterinaria',
    name: 'Medicina Veterinária',
    color: '#fbbf24',
    isDemo: true,
    boundary: [
      { latitude: -23.114557, longitude: -50.359751 },
      { latitude: -23.114557, longitude: -50.358188 },
      { latitude: -23.115994, longitude: -50.358188 },
      { latitude: -23.115994, longitude: -50.359751 },
    ],
  },
  // Prédio "Setor Engenharia" com ~12 m de margem (OpenStreetMap, way 638318354).
  {
    id: 'a1f1c2d3-0005-4000-8000-000000000005',
    slug: 'agronomia',
    name: 'Agronomia',
    color: '#a78bfa',
    isDemo: false,
    boundary: [
      { latitude: -23.110114, longitude: -50.36175 },
      { latitude: -23.110082, longitude: -50.361833 },
      { latitude: -23.109963, longitude: -50.361916 },
      { latitude: -23.109887, longitude: -50.36195 },
      { latitude: -23.109811, longitude: -50.361916 },
      { latitude: -23.109683, longitude: -50.361778 },
      { latitude: -23.109593, longitude: -50.361625 },
      { latitude: -23.109466, longitude: -50.3613 },
      { latitude: -23.109434, longitude: -50.361217 },
      { latitude: -23.109466, longitude: -50.361134 },
      { latitude: -23.109573, longitude: -50.36106 },
      { latitude: -23.109649, longitude: -50.361026 },
      { latitude: -23.109725, longitude: -50.36106 },
      { latitude: -23.110082, longitude: -50.361667 },
    ],
  },
];
