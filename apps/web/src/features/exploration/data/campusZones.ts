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
 * ⚠️ POLÍGONOS DE DEMONSTRAÇÃO.
 * Estes retângulos NÃO são os limites oficiais dos cursos nem dos prédios: foram
 * posicionados arbitrariamente ao redor do centro do campus apenas para testar
 * a detecção de zonas. Substitua `boundary` por coordenadas verificadas
 * (ou carregue-as de GET /api/v1/zones) e defina `isDemo: false`.
 */
export const CAMPUS_ZONES: CampusZone[] = [
  {
    id: 'a1f1c2d3-0001-4000-8000-000000000001',
    slug: 'ciencia-da-computacao',
    name: 'Ciência da Computação',
    color: '#38bdf8',
    isDemo: true,
    boundary: [
      { latitude: -23.110245, longitude: -50.359458 },
      { latitude: -23.110245, longitude: -50.358091 },
      { latitude: -23.111503, longitude: -50.358091 },
      { latitude: -23.111503, longitude: -50.359458 },
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
  {
    id: 'a1f1c2d3-0003-4000-8000-000000000003',
    slug: 'enfermagem',
    name: 'Enfermagem',
    color: '#f472b6',
    isDemo: true,
    boundary: [
      { latitude: -23.112401, longitude: -50.354672 },
      { latitude: -23.112401, longitude: -50.3535 },
      { latitude: -23.113479, longitude: -50.3535 },
      { latitude: -23.113479, longitude: -50.354672 },
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
  {
    id: 'a1f1c2d3-0005-4000-8000-000000000005',
    slug: 'agronomia',
    name: 'Agronomia',
    color: '#a78bfa',
    isDemo: true,
    boundary: [
      { latitude: -23.115006, longitude: -50.355942 },
      { latitude: -23.115006, longitude: -50.353793 },
      { latitude: -23.116982, longitude: -50.353793 },
      { latitude: -23.116982, longitude: -50.355942 },
    ],
  },
];
