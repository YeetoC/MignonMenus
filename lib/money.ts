export function eurosStringToCents(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const normalized = trimmed.replace("€", "").replace(/\s+/g, "").replace(",", ".")
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null
  }

  const [eurosPart, fractionalRaw = ""] = normalized.split(".")
  const euros = Number.parseInt(eurosPart, 10)
  if (!Number.isFinite(euros) || euros < 0) {
    return null
  }

  const fractional = fractionalRaw.padEnd(3, "0")
  const centsTwo = Number.parseInt(fractional.slice(0, 2), 10)
  const roundingDigit = Number.parseInt(fractional.slice(2, 3) || "0", 10)

  let cents = euros * 100 + centsTwo
  if (roundingDigit >= 5) {
    cents += 1
  }

  if (!Number.isSafeInteger(cents)) {
    return null
  }

  return cents
}

export function centsToEurosString(cents: number): string {
  if (!Number.isFinite(cents)) {
    return "0.00"
  }

  const sign = cents < 0 ? "-" : ""
  const abs = Math.round(Math.abs(cents))
  const euros = Math.floor(abs / 100)
  const centsPart = abs % 100

  return `${sign}${euros}.${centsPart.toString().padStart(2, "0")}`
}
