// Datas sempre no fuso local, no formato AAAA-MM-DD.

const doisDigitos = (n: number) => String(n).padStart(2, '0')

export const paraIso = (d: Date) => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`

export const deIso = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export const somarDias = (iso: string, n: number) => {
  const d = deIso(iso)
  d.setDate(d.getDate() + n)
  return paraIso(d)
}

export const hoje = () => paraIso(new Date())

/** 1 = segunda ... 7 = domingo */
export const diaDaSemana = (iso: string) => ((deIso(iso).getDay() + 6) % 7) + 1

export const segundaDe = (iso: string) => somarDias(iso, 1 - diaDaSemana(iso))

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const diaMes = (iso: string) => {
  const d = deIso(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}

export const rotuloSemana = (segunda: string) => {
  const a = deIso(segunda)
  const b = deIso(somarDias(segunda, 6))
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} ${MESES[b.getMonth()]}`
    : `${diaMes(segunda)} a ${diaMes(somarDias(segunda, 6))}`
}
