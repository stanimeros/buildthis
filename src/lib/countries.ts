// ISO 3166-1 alpha-2 codes. Names come from Intl.DisplayNames in the UI language.
const codes =
  'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FO FR GA GB GD GE GH GI GL GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW'.split(' ')

/** Shown first in pickers. */
const pinned = ['GR', 'CY']

export function isCountry(code: string) {
  return codes.includes(code)
}

export function flag(code: string) {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}

export function countryName(code: string, lang: string) {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

/** Codes sorted by name in `lang`, with the pinned ones first. */
export function countryOptions(lang: string) {
  const collator = new Intl.Collator(lang)
  const rest = codes
    .filter((c) => !pinned.includes(c))
    .sort((a, b) => collator.compare(countryName(a, lang), countryName(b, lang)))
  return [...pinned, ...rest]
}

/** Best guess from the browser locale (e.g. el-GR → GR, el → GR). */
export function guessCountry() {
  if (typeof navigator === 'undefined') return ''
  for (const tag of navigator.languages ?? [navigator.language]) {
    const region = tag.split('-')[1]?.toUpperCase()
    if (region && isCountry(region)) return region
    if (tag.toLowerCase().startsWith('el')) return 'GR'
  }
  return ''
}
