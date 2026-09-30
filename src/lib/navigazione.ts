// Ricorda l'ultima ricerca della Home (es. "/?q=gres...") per il link "Torna ai risultati".
// In sessionStorage: vale per la scheda del browser e sopravvive al ricaricamento della pagina.
// Se non è disponibile (o si arriva da un link diretto) si torna alla Home.

const CHIAVE = 'avanzi:ultimaRicerca'
let inMemoria = '/'

export function ricordaRicerca(url: string) {
  inMemoria = url
  try {
    window.sessionStorage.setItem(CHIAVE, url)
  } catch {
    /* storage non disponibile: resta la copia in memoria */
  }
}

export function tornaAiRisultati(): string {
  try {
    const u = window.sessionStorage.getItem(CHIAVE)
    if (u && u.startsWith('/')) return u
  } catch {
    /* storage non disponibile */
  }
  return inMemoria
}

export const urlLotto = (codice: string) => `/lotto/${encodeURIComponent(codice)}`

// Lotto aperto dai risultati: tornando indietro la lista si riapre su quella card.
const CHIAVE_LOTTO = 'avanzi:lottoAperto'

export function ricordaLottoAperto(id: string) {
  try {
    window.sessionStorage.setItem(CHIAVE_LOTTO, id)
  } catch {
    /* storage non disponibile: si torna in cima alla lista */
  }
}

/** Legge senza cancellare: si cancella con lottoRipristinato() solo a ripristino avvenuto. */
export function lottoDaRipristinare(): string | null {
  try {
    return window.sessionStorage.getItem(CHIAVE_LOTTO)
  } catch {
    return null
  }
}

export function lottoRipristinato() {
  try {
    window.sessionStorage.removeItem(CHIAVE_LOTTO)
  } catch {
    /* niente da fare */
  }
}
