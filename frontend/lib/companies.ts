import { SearchSuggestion } from "./types";

// Seed list of popular companies on load
export const SEED_COMPANIES: SearchSuggestion[] = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "META", name: "Meta Platforms, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "BRK-B", name: "Berkshire Hathaway Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "LLY", name: "Eli Lilly and Company", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "NVO", name: "Novo Nordisk A/S", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "TSM", name: "Taiwan Semiconductor Manufacturing Company Limited", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "MA", name: "Mastercard Incorporated", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "ASML", name: "ASML Holding N.V.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "ORCL", name: "Oracle Corporation", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "NFLX", name: "Netflix, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "COST", name: "Costco Wholesale Corporation", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "AMD", name: "Advanced Micro Devices, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "CRM", name: "Salesforce, Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "INTC", name: "Intel Corporation", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "ADBE", name: "Adobe Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "DIS", name: "The Walt Disney Company", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "NKE", name: "NIKE, Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "CSCO", name: "Cisco Systems, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "MCD", name: "McDonald's Corporation", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "PEP", name: "PepsiCo, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "KO", name: "The Coca-Cola Company", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "WMT", name: "Walmart Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "XOM", name: "Exxon Mobil Corporation", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "CVX", name: "Chevron Corporation", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "PFE", name: "Pfizer Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "JNJ", name: "Johnson & Johnson", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "ABBV", name: "AbbVie Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "MRK", name: "Merck & Co., Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "NOW", name: "ServiceNow, Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "ACN", name: "Accenture plc", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "IBM", name: "International Business Machines Corporation", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "GE", name: "General Electric Company", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "HON", name: "Honeywell International Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "BA", name: "The Boeing Company", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "CAT", name: "Caterpillar Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "UNP", name: "Union Pacific Corporation", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "UPS", name: "United Parcel Service, Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "FDX", name: "FedEx Corporation", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "GS", name: "The Goldman Sachs Group, Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "MS", name: "Morgan Stanley", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "BLK", name: "BlackRock, Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "C", name: "Citigroup Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "WFC", name: "Wells Fargo & Company", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "AXP", name: "American Express Company", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "PYPL", name: "PayPal Holdings, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "SQ", name: "Block, Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "UBER", name: "Uber Technologies, Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "ABNB", name: "Airbnb, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "BKNG", name: "Booking Holdings Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "SNOW", name: "Snowflake Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "PLTR", name: "Palantir Technologies Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "DDOG", name: "Datadog, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "CRWD", name: "CrowdStrike Holdings, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "NET", name: "Cloudflare, Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "ZM", name: "Zoom Video Communications, Inc.", exchange: "NASDAQ", quoteType: "EQUITY" },
  { symbol: "SHOP", name: "Shopify Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "SPOT", name: "Spotify Technology S.A.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "U", name: "Unity Software Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "RBLX", name: "Roblox Corporation", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "SNAP", name: "Snap Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  { symbol: "PINS", name: "Pinterest, Inc.", exchange: "NYSE", quoteType: "EQUITY" },
  
  // Indian Listings
  { symbol: "BSE.NS", name: "BSE Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "RELIANCE.NS", name: "Reliance Industries Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "INFY.NS", name: "Infosys Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "BHARTIALRT.NS", name: "Bharti Airtel Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "SBIN.NS", name: "State Bank of India", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "LICI.NS", name: "Life Insurance Corporation of India", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "ITC.NS", name: "ITC Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "LT.NS", name: "Larsen & Toubro Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "AXISBANK.NS", name: "Axis Bank Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "ADANIENT.NS", name: "Adani Enterprises Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "SUZLON.NS", name: "Suzlon Energy Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "CIANAGRO.BO", name: "Cian Agro Industries & Infrastructure Ltd", exchange: "BSE", quoteType: "EQUITY" },
  { symbol: "WIPRO.NS", name: "Wipro Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "HCLTECH.NS", name: "HCL Technologies Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical Industries Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "NTPC.NS", name: "NTPC Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "TATASTEEL.NS", name: "Tata Steel Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "POWERGRID.NS", name: "Power Grid Corporation of India Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki India Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "TITAN.NS", name: "Titan Company Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "ULTRACEMCO.NS", name: "UltraTech Cement Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "COALINDIA.NS", name: "Coal India Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "BPCL.NS", name: "Bharat Petroleum Corporation Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "ONGC.NS", name: "Oil and Natural Gas Corporation Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "JSWSTEEL.NS", name: "JSW Steel Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "HINDALCO.NS", name: "Hindalco Industries Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "TATACONSUM.NS", name: "Tata Consumer Products Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "M&M.NS", name: "Mahindra & Mahindra Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "CIPLA.NS", name: "Cipla Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "DRREDDY.NS", name: "Dr. Reddy's Laboratories Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "APOLLOHOSP.NS", name: "Apollo Hospitals Enterprise Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "BAJAJ-AUTO.NS", name: "Bajaj Auto Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "HEROMOTOCO.NS", name: "Hero MotoCorp Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "EICHERMOT.NS", name: "Eicher Motors Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "BAJAJFINSV.NS", name: "Bajaj Finserv Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "INDUSINDBK.NS", name: "IndusInd Bank Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "TECHM.NS", name: "Tech Mahindra Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "GRASIM.NS", name: "Grasim Industries Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "HDFCLIFE.NS", name: "HDFC Life Insurance Company Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "SBILIFE.NS", name: "SBI Life Insurance Company Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "ADANIPORTS.NS", name: "Adani Ports and Special Economic Zone Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "DIVISLAB.NS", name: "Divi's Laboratories Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "LTIM.NS", name: "LTIMindtree Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "NESTLEIND.NS", name: "Nestle India Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "SHRIRAMFIN.NS", name: "Shriram Finance Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "BRITANNIA.NS", name: "Britannia Industries Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "BEL.NS", name: "Bharat Electronics Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "HAL.NS", name: "Hindustan Aeronautics Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "TRENT.NS", name: "Trent Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "TATAPOWER.NS", name: "Tata Power Company Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "IOC.NS", name: "Indian Oil Corporation Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "GAIL.NS", name: "GAIL (India) Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "JSWENERGY.NS", name: "JSW Energy Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "ZOMATO.NS", name: "Zomato Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "PAYTM.NS", name: "One 97 Communications Limited (Paytm)", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "NYKAA.NS", name: "FSN E-Commerce Ventures Limited (Nykaa)", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "YESBANK.NS", name: "Yes Bank Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "FEDERALBNK.NS", name: "The Federal Bank Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "IDFCFIRSTB.NS", name: "IDFC First Bank Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "BANDHANBNK.NS", name: "Bandhan Bank Limited", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "PNB.NS", name: "Punjab National Bank", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "BANKBARODA.NS", name: "Bank of Baroda", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "CANBK.NS", name: "Canara Bank", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "UNIONBANK.NS", name: "Union Bank of India", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "INDIANB.NS", name: "Indian Bank", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "CENTRALBK.NS", name: "Central Bank of India", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "UCOBANK.NS", name: "UCO Bank", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "BANKINDIA.NS", name: "Bank of India", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "MAHABANK.NS", name: "Bank of Maharashtra", exchange: "NSE", quoteType: "EQUITY" },
  { symbol: "IOB.NS", name: "Indian Overseas Bank", exchange: "NSE", quoteType: "EQUITY" }
];

export interface SearchIndexedCompany {
  company: SearchSuggestion;
  nameLower: string;
  symbolLower: string;
  nameWords: string[];
}

// Global in-memory pool of all known companies
const companyPool = new Map<string, SearchSuggestion>();

// Initialize pool with seed companies
SEED_COMPANIES.forEach((c) => companyPool.set(c.symbol, c));

// Our local index of prepared companies
let indexedCompanies: SearchIndexedCompany[] = [];

// Rebuild index function
export function rebuildSearchIndex() {
  indexedCompanies = Array.from(companyPool.values()).map((company) => ({
    company,
    nameLower: company.name.toLowerCase(),
    symbolLower: company.symbol.toLowerCase(),
    nameWords: company.name.toLowerCase().split(/\s+/),
  })).sort((a, b) => a.nameLower.localeCompare(b.nameLower));
}

// Initialize on module load
rebuildSearchIndex();

// Add new companies to pool and rebuild index if needed
export function addCompaniesToPool(companies: SearchSuggestion[]) {
  let added = false;
  companies.forEach((company) => {
    if (!companyPool.has(company.symbol)) {
      companyPool.set(company.symbol, company);
      added = true;
    }
  });
  if (added) {
    rebuildSearchIndex();
  }
}

// Fuzzy match helper
function fuzzyMatch(str: string, query: string): boolean {
  let queryIdx = 0;
  for (let i = 0; i < str.length && queryIdx < query.length; i++) {
    if (str[i] === query[queryIdx]) {
      queryIdx++;
    }
  }
  return queryIdx === query.length;
}

// Local filtering function (instant execution)
export function filterCompaniesLocal(q: string): SearchSuggestion[] {
  const query = q.trim().toLowerCase();
  if (query.length === 0) return [];

  const matches: { company: SearchSuggestion; score: number }[] = [];

  for (let i = 0; i < indexedCompanies.length; i++) {
    const entry = indexedCompanies[i];
    const { nameLower, symbolLower, nameWords } = entry;

    let score = 0;

    // 1. Symbol exact or starts-with
    if (symbolLower === query) {
      score = 100;
    } else if (symbolLower.startsWith(query)) {
      score = 95;
    }
    // 2. Name starts-with
    else if (nameLower.startsWith(query)) {
      score = 90;
    }
    // 3. Word starts-with
    else {
      let wordStartMatch = false;
      for (let j = 0; j < nameWords.length; j++) {
        if (nameWords[j].startsWith(query)) {
          wordStartMatch = true;
          break;
        }
      }
      if (wordStartMatch) {
        score = 80;
      }
      // 4. Symbol substring
      else if (symbolLower.includes(query)) {
        score = 70;
      }
      // 5. Name substring
      else if (nameLower.includes(query)) {
        score = 60;
      }
      // 6. Fuzzy match
      else if (fuzzyMatch(nameLower, query)) {
        score = 40;
      } else if (fuzzyMatch(symbolLower, query)) {
        score = 35;
      }
    }

    if (score > 0) {
      matches.push({ company: entry.company, score });
    }
  }

  // Sort by score descending, then by name alphabetically
  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.company.name.localeCompare(b.company.name);
  });

  return matches.slice(0, 10).map((m) => m.company);
}