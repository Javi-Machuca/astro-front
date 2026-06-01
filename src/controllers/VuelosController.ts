import type { Vuelo, FiltrosVuelos } from '../models/Vuelo';
import { obtenerVuelos, obtenerVuelosMock } from '../services/VuelosService';
import { nombreAeropuerto } from '../lib/aeropuertos';

// En modo mock se usan datos locales en lugar de llamar al proxy
const USE_MOCK = import.meta.env.PUBLIC_USE_MOCK === 'true';
const ITEMS_POR_PAGINA = 5;

export interface EstadoTabla {
  vuelos: Vuelo[];
  cargando: boolean;
  error: string | null;
  vueloSeleccionado: string | null;
  paginaActual: number;
  totalPaginas: number;
  totalVuelos: number;
}

export type ListenerEstado = (estado: EstadoTabla) => void;

export class VuelosController {
  private estado: EstadoTabla = {
    vuelos: [],
    cargando: false,
    error: null,
    vueloSeleccionado: null,
    paginaActual: 1,
    totalPaginas: 1,
    totalVuelos: 0,
  };

  // `todos` guarda todos los vuelos cargados; `filtrados` los que pasan el filtro activo
  private listeners: ListenerEstado[] = [];
  private todos: Vuelo[] = [];
  private filtrados: Vuelo[] = [];
  private filtrosActivos: {
    origen?: string;
    destino?: string;
    precioMax?: number;
  } = {};

  // Registra un listener que se llama cada vez que cambia el estado; devuelve función para desuscribirse
  suscribir(fn: ListenerEstado): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  // Fusiona el estado parcial y notifica a todos los listeners
  private set(parcial: Partial<EstadoTabla>) {
    this.estado = { ...this.estado, ...parcial };
    this.listeners.forEach((l) => l({ ...this.estado }));
  }

  // Calcula el slice de vuelos para la página solicitada
  private paginar(todos: Vuelo[], pagina: number) {
    const totalPaginas = Math.max(
      1,
      Math.ceil(todos.length / ITEMS_POR_PAGINA)
    );
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    return {
      vuelos: todos.slice(inicio, inicio + ITEMS_POR_PAGINA),
      paginaActual: pagina,
      totalPaginas,
      totalVuelos: todos.length,
    };
  }

  // Carga los vuelos del servicio (o mock) y actualiza el estado inicial
  async inicializar() {
    this.set({ cargando: true, error: null });
    try {
      const vuelos = USE_MOCK ? obtenerVuelosMock() : await obtenerVuelos();
      this.todos = vuelos;
      this.filtrados = vuelos;
      this.set({ cargando: false, ...this.paginar(vuelos, 1) });
    } catch (err: any) {
      this.set({ cargando: false, error: err.message });
    }
  }

  // Alterna la selección de una fila de vuelo (segundo clic la deselecciona)
  seleccionarVuelo(codigo: string) {
    const sel = this.estado.vueloSeleccionado === codigo ? null : codigo;
    this.set({ vueloSeleccionado: sel });
  }

  // Navega a la página indicada dentro del conjunto filtrado
  irAPagina(pagina: number) {
    if (pagina < 1 || pagina > this.estado.totalPaginas) return;
    this.set(this.paginar(this.filtrados, pagina));
  }

  // Filtra los vuelos por origen, destino y precio máximo y resetea a la página 1
  aplicarFiltros(f: { origen?: string; destino?: string; precioMax?: number }) {
    this.filtrosActivos = f;
    const q = (s?: string) => s?.trim().toLowerCase() ?? '';
    const matches = (iata: string, term: string) =>
      nombreAeropuerto(iata).toLowerCase().includes(term) ||
      iata.toLowerCase().includes(term);
    this.filtrados = this.todos.filter((v) => {
      if (
        f.origen &&
        !matches(v.origen, q(f.origen)) &&
        !matches(v.destino, q(f.origen))
      )
        return false;
      if (
        f.destino &&
        !matches(v.destino, q(f.destino)) &&
        !matches(v.origen, q(f.destino))
      )
        return false;
      if (f.precioMax !== undefined && v.precio > f.precioMax) return false;
      return true;
    });
    this.set(this.paginar(this.filtrados, 1));
  }

  // Devuelve el precio más alto y más bajo del conjunto completo de vuelos (para el slider de filtro)
  getPrecioMax() {
    return this.todos.length
      ? Math.max(...this.todos.map((v) => v.precio))
      : 1000;
  }
  getPrecioMin() {
    return this.todos.length ? Math.min(...this.todos.map((v) => v.precio)) : 0;
  }

  getEstado() {
    return { ...this.estado };
  }
}
