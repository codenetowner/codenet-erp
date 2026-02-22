/**
 * Number formatting utilities for consistent precision across the app
 * 
 * Backend/DB: Store with 5 decimal places for accuracy
 * Frontend: Display with 3 decimal places for readability
 */

// Display format: Round to 3 decimal places for UI
export const formatNumber = (value: number | string | null | undefined, decimals: number = 3): string => {
  if (value === null || value === undefined || value === '') return '0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0'
  return num.toFixed(decimals)
}

// Format currency with 3 decimal places
export const formatCurrency = (value: number | string | null | undefined, symbol: string = '$'): string => {
  if (value === null || value === undefined || value === '') return `${symbol}0.000`
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return `${symbol}0.000`
  return `${symbol}${num.toFixed(3)}`
}

// Format price for display (3 decimals)
export const formatPrice = (value: number | string | null | undefined): string => {
  return formatNumber(value, 3)
}

// Format quantity for display (3 decimals for fractional, 0 for whole)
export const formatQuantity = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0'
  // If it's a whole number, show without decimals
  if (Number.isInteger(num)) return num.toString()
  // Otherwise show 3 decimals
  return num.toFixed(3)
}

// Round for calculations (5 decimal places for storage/backend)
export const roundForStorage = (value: number): number => {
  return Math.round(value * 100000) / 100000
}

// Round for display (3 decimal places)
export const roundForDisplay = (value: number): number => {
  return Math.round(value * 1000) / 1000
}

// Parse input value and ensure precision
export const parsePrice = (value: string): number => {
  const num = parseFloat(value)
  if (isNaN(num)) return 0
  return roundForStorage(num)
}

// Calculate piece price from box price with 5 decimal precision
export const calculatePiecePrice = (boxPrice: number, unitsPerBox: number): number => {
  if (unitsPerBox <= 0) return boxPrice
  return roundForStorage(boxPrice / unitsPerBox)
}

// Calculate box price from piece price with 5 decimal precision
export const calculateBoxPrice = (piecePrice: number, unitsPerBox: number): number => {
  if (unitsPerBox <= 0) return piecePrice
  return roundForStorage(piecePrice * unitsPerBox)
}
