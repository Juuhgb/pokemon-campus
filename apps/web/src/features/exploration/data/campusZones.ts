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
 * Zonas dos cursos, nas posições definidas no painel de admin (10/11/2026).
 * O jogo usa a versão publicada pelo admin no servidor (Firestore `mundo/zonas`) quando ela
 * existe; estas são as zonas de partida, usadas antes da primeira sincronização.
 */
export const CAMPUS_ZONES: CampusZone[] = [
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
      { latitude: -23.1060672, longitude: -50.3600675 },
      { latitude: -23.1062449, longitude: -50.3604859 },
      { latitude: -23.1063779, longitude: -50.3608775 },
      { latitude: -23.1064669, longitude: -50.3609848 },
    ],
  },
  {
    id: 'a1f1c2d3-0002-4000-8000-000000000002',
    slug: 'biologia',
    name: 'Biologia',
    color: '#4ade80',
    isDemo: false,
    boundary: [
      { latitude: -23.1074735, longitude: -50.3598046 },
      { latitude: -23.106447, longitude: -50.3579915 },
      { latitude: -23.1083012, longitude: -50.3567898 },
      { latitude: -23.1090329, longitude: -50.3586459 },
    ],
  },
  {
    id: 'a1f1c2d3-0003-4000-8000-000000000003',
    slug: 'enfermagem',
    name: 'Enfermagem',
    color: '#f472b6',
    isDemo: false,
    boundary: [
      { latitude: -23.1100248, longitude: -50.3606951 },
      { latitude: -23.1088106, longitude: -50.3615159 },
      { latitude: -23.1086232, longitude: -50.3606039 },
      { latitude: -23.1084406, longitude: -50.3600943 },
      { latitude: -23.1081347, longitude: -50.3594774 },
      { latitude: -23.1089687, longitude: -50.3588444 },
      { latitude: -23.1094129, longitude: -50.3595632 },
      { latitude: -23.1095708, longitude: -50.3598636 },
      { latitude: -23.1098619, longitude: -50.3602874 },
    ],
  },
  {
    id: 'a1f1c2d3-0004-4000-8000-000000000004',
    slug: 'medicina-veterinaria',
    name: 'Medicina Veterinária',
    color: '#fbbf24',
    isDemo: false,
    boundary: [
      { latitude: -23.110089, longitude: -50.3606844 },
      { latitude: -23.1090032, longitude: -50.3587854 },
      { latitude: -23.1105918, longitude: -50.357691 },
      { latitude: -23.1115297, longitude: -50.359751 },
    ],
  },
  {
    id: 'a1f1c2d3-0005-4000-8000-000000000005',
    slug: 'agronomia',
    name: 'Agronomia',
    color: '#a78bfa',
    isDemo: false,
    boundary: [
      { latitude: -23.1107157, longitude: -50.3619665 },
      { latitude: -23.1100986, longitude: -50.3624439 },
      { latitude: -23.1098815, longitude: -50.362106 },
      { latitude: -23.109887, longitude: -50.36195 },
      { latitude: -23.109811, longitude: -50.361916 },
      { latitude: -23.109683, longitude: -50.361778 },
      { latitude: -23.109593, longitude: -50.361625 },
      { latitude: -23.109466, longitude: -50.3613 },
      { latitude: -23.109434, longitude: -50.361217 },
      { latitude: -23.109466, longitude: -50.361134 },
      { latitude: -23.109573, longitude: -50.36106 },
      { latitude: -23.109649, longitude: -50.361026 },
      { latitude: -23.1100593, longitude: -50.3606844 },
      { latitude: -23.1108539, longitude: -50.3607702 },
    ],
  },
];
