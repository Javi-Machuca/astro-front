// Tabla IATA → nombre completo del aeropuerto para mostrar en la UI
export const AEROPUERTOS: Record<string, string> = {
  MAD: 'Madrid-Barajas Adolfo Suárez',
  BCN: 'Barcelona El Prat',
  AGP: 'Málaga-Costa del Sol',
  PMI: 'Palma de Mallorca',
  LPA: 'Gran Canaria',
  SVQ: 'Sevilla San Pablo',
  BIO: 'Bilbao Loiu',
  VLC: 'Valencia Manises',
  JFK: 'Nueva York-John F. Kennedy',
  DXB: 'Dubái Internacional',
  SIN: 'Singapur Changi',
  SYD: 'Sídney Kingsford Smith',
  LAX: 'Los Ángeles Internacional',
  ORD: 'Chicago O\'Hare',
  GRU: 'São Paulo-Guarulhos',
  CDG: 'París Charles de Gaulle',
  NRT: 'Tokio Narita',
  FRA: 'Fráncfort del Meno',
  PEK: 'Pekín Capital',
  LHR: 'Londres Heathrow',
  CPT: 'Ciudad del Cabo',
  HKG: 'Hong Kong Internacional',
  YYZ: 'Toronto Pearson',
  JNB: 'Johannesburgo O.R. Tambo',
  NBO: 'Nairobi Jomo Kenyatta',
  SCL: 'Santiago Arturo Merino Benítez',
  EZE: 'Buenos Aires Ezeiza',
};

// Devuelve el nombre completo del aeropuerto; si el código no está mapeado devuelve el propio código
export function nombreAeropuerto(iata: string): string {
  return AEROPUERTOS[iata.toUpperCase()] ?? iata;
}
