/**
 * Dynamically updates currency symbols in text content based on the target stock symbol.
 * If the stock is an Indian NSE/BSE stock (.NS or .BO), all dollar signs ($) are replaced with Indian Rupee (₹).
 */
export function formatCurrencySymbols(text: string | undefined | null, symbol?: string): string {
  if (!text) return "";
  if (!symbol) return text;
  
  const isIndian = symbol.toUpperCase().endsWith(".NS") || symbol.toUpperCase().endsWith(".BO");
  if (isIndian) {
    // Replace all literal '$' with '₹'
    return text.replace(/\$/g, "₹");
  }
  return text;
}
