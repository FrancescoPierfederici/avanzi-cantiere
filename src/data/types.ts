/** I 7 comuni della zona demo ('senigallia', 'jesi'…) o una città generata al momento ('TO-TOR'). */
export type ComuneId = string

/** Un comune italiano (o una frazione della zona demo) dall'elenco GeoNames. */
export interface Luogo {
  /** nome mostrato */
  nome: string
  /** tutti i nomi validi ("Bolzano", "Bozen") */
  nomi: string[]
  lat: number
  lng: number
  provincia?: string
  /** sigla unica nella provincia, per i codici lotto */
  sigla?: string
  /** fascia di popolazione 0–7 */
  fascia: number
  /** direzione dell'entroterra in gradi (0 = est), null se non nota */
  entroterra: number | null
  /** comuni con acqua vicino: località abitate [lat, lng] a cui agganciare le sedi, per restare a terra */
  appigli?: [number, number][]
  frazione?: boolean
}

export interface Comune {
  id: ComuneId
  nome: string
  sigla: string
  lat: number
  lng: number
  /** raggio indicativo dell'area urbana, km */
  raggioKm: number
  /** città fuori dalla zona demo: chiave della zona generata al momento */
  zona?: string
}

export type TipoAzienda = 'impresa' | 'rivendita' | 'showroom' | 'artigiano'

export interface Azienda {
  id: string
  nome: string
  tipo: TipoAzienda
  comune: ComuneId
  /** nome del comune, per le aziende delle zone generate */
  comuneNome?: string
  indirizzo: string
  telefono: string
  lat: number
  lng: number
}

export type Unita = 'm²' | 'pezzi' | 'bancali'

export type Categoria =
  | 'Gres porcellanato'
  | 'Rivestimenti'
  | 'Parquet'
  | 'Pietra naturale'
  | 'Laterizi'
  | 'Blocchi'
  | 'Isolanti'
  | 'Malte e premiscelati'
  | 'Tubi e raccordi'
  | 'Sanitari'
  | 'Rubinetteria'
  | 'Serramenti'
  | 'Porte interne'

/** Variazione deterministica della foto, per non far sembrare le card copie. */
export interface FotoVar {
  /** object-position / transform-origin, in % */
  posX: number
  posY: number
  flip: boolean
  zoom: number
}

export interface Lotto {
  id: string
  codice: string
  categoria: Categoria
  titolo: string
  descrizione: string
  formato: string
  colore: string
  quantita: number
  unita: Unita
  /** peso totale stimato del lotto */
  pesoKg: number
  /** prezzo per unità, € */
  prezzo: number
  /** prezzo di listino del nuovo per unità, € */
  prezzoListino: number
  foto: string
  fotoAlt: string
  fotoVar: FotoVar
  aziendaId: string
  /** ISO yyyy-mm-dd */
  data: string
  stato: 'disponibile' | 'venduto'
}

/** [lng, lat] */
export type PuntoDecorativo = [number, number]
