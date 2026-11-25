import type { DivId, Patron } from './types';

export interface ClubSeed {
  nombre: string;
  corto: string;
  ciudad: string;
  apodo: string;
  colores: [string, string];
  color3?: string;
  patron: Patron;
  division: DivId;
  /** Código interno fijo (los clásicos lo usan aunque el club cambie de nombre). */
  codigo?: string;
}

// Todos los clubes son inventados.
export const CLUB_SEEDS: ClubSeed[] = [
  { nombre: 'Club Lobos de Mar', corto: 'LOB', codigo: 'ÑAN', ciudad: 'Puerto Lobos', apodo: 'Los Lobos', colores: ['#1f4fa3', '#f2c230'], patron: 'aros', division: 'A' },
  { nombre: 'Uvita RC', corto: 'UVI', codigo: 'CRN', ciudad: 'Uvita', apodo: 'Los Uveros', colores: ['#5b3a1e', '#f0e6d2'], patron: 'banda', division: 'C' },
  { nombre: 'Cucu RC', corto: 'CUC', codigo: 'OMB', ciudad: 'Monte Cucu', apodo: 'Los Cucos', colores: ['#1d7a3a', '#ffffff'], patron: 'cuartos', division: 'A' },
  { nombre: 'Club Lago Sur', corto: 'LSU', codigo: 'MOL', ciudad: 'Lago Sur', apodo: 'Los del Lago', colores: ['#7a1730', '#ffffff'], patron: 'cuartos', division: 'A' },
  { nombre: 'Lagartos RC', corto: 'LGT', codigo: 'SAU', ciudad: 'Laguna del Lagarto', apodo: 'Los Lagartos', colores: ['#6cb4e4', '#ffffff'], patron: 'aros', division: 'A' },
  { nombre: 'Cataratas RC', corto: 'CAT', codigo: 'CDS', ciudad: 'Saltos del Monte', apodo: 'Los de las Cataratas', colores: ['#5a2d82', '#ffffff'], patron: 'cuartos', division: 'A' },
  { nombre: 'Club Perito Moreno', corto: 'PER', codigo: 'CAL', ciudad: 'Perito Moreno', apodo: 'Los del Glaciar', colores: ['#151515', '#f2c230'], patron: 'cuartos', division: 'A' },
  { nombre: 'El Puerto RC', corto: 'PTO', codigo: 'PQU', ciudad: 'El Puerto', apodo: 'Los Portuarios', colores: ['#c62828', '#151515'], patron: 'aros', division: 'A' },
  { nombre: 'La Puna RC', corto: 'PUN', codigo: 'MED', ciudad: 'La Puna', apodo: 'Los Puneños', colores: ['#ef7d1a', '#151515'], patron: 'banda', division: 'A' },
  { nombre: 'Club Arroyitos', corto: 'ARR', codigo: 'ARH', ciudad: 'Arroyitos', apodo: 'Los del Arroyo', colores: ['#0f5132', '#151515'], patron: 'lisa', division: 'A' },
  { nombre: 'Deportivo Camet', corto: 'DCA', codigo: 'LAG', ciudad: 'Camet', apodo: 'Los Patos', colores: ['#ffffff', '#f2f2f2'], patron: 'lisa', division: 'B' },
  { nombre: 'Club Mataderos', corto: 'MAT', codigo: 'QUE', ciudad: 'Mataderos', apodo: 'Los Quebrachos', colores: ['#1f4fa3', '#ffffff'], patron: 'banda', division: 'B' },
  { nombre: 'Club Atlético El Puerto', corto: 'CEP', codigo: 'ESP', ciudad: 'El Puerto', apodo: 'El Espinillo', colores: ['#f2c230', '#1d7a3a'], patron: 'aros', division: 'B' },
  { nombre: 'Club Social Playa Grande', corto: 'PGR', codigo: 'CER', ciudad: 'Playa Grande', apodo: 'Los del Cerro', colores: ['#4a5560', '#ffffff'], patron: 'cuartos', division: 'B' },
  { nombre: 'Los Troncos RC', corto: 'TRO', codigo: 'PMO', ciudad: 'Los Troncos', apodo: 'Los Pedregosos', colores: ['#2c2c54', '#e0e0e0'], patron: 'cuartos', division: 'B' },
  { nombre: 'Club Atlético Chauvin', corto: 'CHV', codigo: 'CHA', ciudad: 'Chauvin', apodo: 'Los Chañares', colores: ['#d35400', '#ffffff'], patron: 'cuartos', division: 'B' },
  { nombre: 'Güemes RC', corto: 'GUE', codigo: 'PAH', ciudad: 'Güemes', apodo: 'Los del Bajo', colores: ['#1f4fa3', '#c62828'], patron: 'aros', division: 'B' },
  { nombre: 'La Perla RC', corto: 'LPE', codigo: 'JUN', ciudad: 'La Perla', apodo: 'Los Juncos', colores: ['#7cb342', '#151515'], patron: 'banda', division: 'B' },
  { nombre: 'Tandil Rugby', corto: 'TAN', codigo: 'BRR', ciudad: 'Tandil', apodo: 'Los Tandilenses', colores: ['#0b4d2c', '#ffffff'], patron: 'lisa', division: 'B' },
  { nombre: 'Valle Hermoso Rugby', corto: 'VHE', codigo: 'ALG', ciudad: 'Valle Hermoso', apodo: 'Los del Valle', colores: ['#3cb043', '#ffffff'], patron: 'lisa', division: 'B' },
];

/** La tercera categoría (Primera C). También inventados. */
export const CLUB_SEEDS_C: ClubSeed[] = [
  { nombre: 'Mar Chiquita Rugby Club', corto: 'MCH', codigo: 'TOT', ciudad: 'Mar Chiquita', apodo: 'Los Totoraleros', colores: ['#2e7d32', '#f2c230'], patron: 'aros', division: 'C' },
  { nombre: 'Club Atlético Los Pinares', corto: 'PIN', codigo: 'VIZ', ciudad: 'Los Pinares', apodo: 'Las Vizcachas', colores: ['#6d4c41', '#ffffff'], patron: 'cuartos', division: 'C' },
  { nombre: 'Parque Luro Club', corto: 'PLU', codigo: 'TAL', ciudad: 'Parque Luro', apodo: 'Los del Tala', colores: ['#c62828', '#151515'], color3: '#ffffff', patron: 'aros', division: 'C' },
  { nombre: 'Pacheco Club', corto: 'PAC', codigo: 'CRE', ciudad: 'Pacheco', apodo: 'Los Camineros', colores: ['#b71c1c', '#f0e6d2'], patron: 'cuartos', division: 'C' },
  { nombre: 'Carupá RC', corto: 'CRP', codigo: 'CAÑ', ciudad: 'Carupá', apodo: 'Los de la Cañada', colores: ['#00838f', '#151515'], patron: 'cuartos', division: 'C' },
  { nombre: 'Santa Celina', corto: 'SCE', codigo: 'BAÑ', ciudad: 'Santa Celina', apodo: 'Los Celinenses', colores: ['#2e7d32', '#6d3b1a'], patron: 'aros', division: 'C' },
  { nombre: 'Galera RC', corto: 'GAL', codigo: 'MIS', ciudad: 'Galera', apodo: 'Los de Galera', colores: ['#151515', '#1f1f1f'], patron: 'lisa', division: 'A' },
  { nombre: 'Club Jarilla', corto: 'JAR', ciudad: 'Jarilla', apodo: 'Los Jarilleros', colores: ['#f9a825', '#151515'], patron: 'cuartos', division: 'C' },
  { nombre: 'Sierras de los Padres RC', corto: 'SDP', codigo: 'CUB', ciudad: 'Sierras de los Padres', apodo: 'Los Serranos', colores: ['#7ec8f0', '#ffffff'], patron: 'lisa', division: 'C' },
  { nombre: 'ODP RC', corto: 'ODP', codigo: 'PEN', ciudad: 'ODP', apodo: 'Los de ODP', colores: ['#151515', '#ffffff'], patron: 'aros', division: 'C' },
];

export const NOMBRES = [
  'Santiago', 'Mateo', 'Joaquín', 'Tomás', 'Felipe', 'Facundo', 'Agustín', 'Nicolás', 'Lautaro', 'Bautista',
  'Juan Cruz', 'Ignacio', 'Francisco', 'Manuel', 'Benjamín', 'Gonzalo', 'Martín', 'Federico', 'Lucas', 'Matías',
  'Rodrigo', 'Julián', 'Ramiro', 'Valentín', 'Thiago', 'Pedro', 'Gerónimo', 'Simón', 'Bruno', 'Emiliano',
  'Juan Martín', 'Santino', 'Tobías', 'Marcos', 'Ezequiel', 'Augusto', 'Franco', 'Lisandro', 'Hernán', 'Esteban',
  'Patricio', 'Germán', 'Diego', 'Pablo', 'Iñaki', 'Juan Pedro', 'Máximo', 'Leandro', 'Rafael', 'Camilo',
];

export const APELLIDOS = [
  'Arrieta', 'Bustamante', 'Carranza', 'Del Solar', 'Echeverría', 'Funes', 'Garmendia', 'Herrera', 'Iturbe', 'Juárez',
  'Larrea', 'Montenegro', 'Nazar', 'Olmos', 'Peralta', 'Quiroga', 'Rivarola', 'Saravia', 'Toledo', 'Urquiza',
  'Villafañe', 'Zabala', 'Achával', 'Barrionuevo', 'Cabral', 'Dellepiane', 'Elizalde', 'Ferreyra', 'Goñi', 'Heredia',
  'Ibarra', 'Lacroze', 'Maldonado', 'Ocampo', 'Paz', 'Rinaldi', 'Sosa', 'Tissera', 'Uriarte', 'Vidal',
  'Agüero', 'Benítez', 'Castro', 'Domínguez', 'Escudero', 'Figueroa', 'Gallardo', 'Ledesma', 'Molina', 'Navarro',
  'Ortiz', 'Pereyra', 'Ríos', 'Salinas', 'Taborda', 'Varela', 'Aguirre', 'Bianchi', 'Costa', 'Di Pietro',
  'Etchart', 'Frías', 'Giménez', 'Irigoyen', 'Lucero', 'Medina', 'Núñez', 'Oviedo', 'Ponce', 'Romero',
  'Sanz', 'Torres', 'Vera', 'Zárate', 'Albornoz', 'Bravo', 'Cornejo', 'Duarte', 'Espósito', 'Fontana',
];
