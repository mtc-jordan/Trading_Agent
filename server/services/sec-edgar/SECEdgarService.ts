/**
 * SEC EDGAR API Service
 * 
 * Provides access to SEC EDGAR filings including 10-K, 10-Q, 8-K reports.
 * Uses the official SEC data.sec.gov API (no authentication required).
 * Also integrates with Yahoo Finance for filing metadata.
 */

import { callDataApi } from '../../_core/dataApi';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
  primaryDocDescription: string;
  fileNumber: string;
  filmNumber: string;
  items: string;
  size: number;
  isXBRL: boolean;
  isInlineXBRL: boolean;
  edgarUrl: string;
}

export interface CompanyInfo {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  description: string;
  website: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  stateOfIncorporationDescription: string;
  addresses: {
    mailing: Address;
    business: Address;
  };
}

export interface Address {
  street1: string;
  street2: string | null;
  city: string;
  stateOrCountry: string;
  zipCode: string;
  stateOrCountryDescription: string;
}

export interface FilingContent {
  accessionNumber: string;
  form: string;
  filingDate: string;
  companyName: string;
  cik: string;
  sections: FilingSection[];
  rawHtml: string;
  rawText: string;
}

export interface FilingSection {
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface XBRLFact {
  taxonomy: string;
  tag: string;
  label: string;
  description: string;
  units: string;
  value: number | string;
  startDate?: string;
  endDate?: string;
  instant?: string;
  form: string;
  filed: string;
  accn: string;
}

export interface CompanyFacts {
  cik: string;
  entityName: string;
  facts: {
    [taxonomy: string]: {
      [concept: string]: {
        label: string;
        description: string;
        units: {
          [unit: string]: XBRLFact[];
        };
      };
    };
  };
}

export interface YahooSECFiling {
  date: string;
  epochDate: number;
  type: string;
  title: string;
  edgarUrl: string;
  maxAge: number;
}

// ============================================================================
// SEC EDGAR Service Class
// ============================================================================

export class SECEdgarService {
  private baseUrl = 'https://data.sec.gov';
  private userAgent = 'TradoVerse/1.0 (contact@tradoverse.com)';
  private cikCache: Map<string, string> = new Map();

  constructor() {
    console.log('[SEC EDGAR] Service initialized');
  }

  /**
   * Look up CIK by ticker symbol
   */
  async getCIKByTicker(ticker: string): Promise<string | null> {
    // Check cache first
    const cached = this.cikCache.get(ticker.toUpperCase());
    if (cached) return cached;

    try {
      // Use SEC's company tickers JSON
      const response = await fetch(
        'https://www.sec.gov/files/company_tickers.json',
        {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error(`[SEC EDGAR] Failed to fetch company tickers: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      // Search for ticker
      for (const key of Object.keys(data)) {
        const company = data[key];
        if (company.ticker?.toUpperCase() === ticker.toUpperCase()) {
          const cik = String(company.cik_str).padStart(10, '0');
          this.cikCache.set(ticker.toUpperCase(), cik);
          return cik;
        }
      }

      return null;
    } catch (error) {
      console.error('[SEC EDGAR] Error looking up CIK:', error);
      return null;
    }
  }

  /**
   * Get company submissions (filing history)
   */
  async getCompanySubmissions(cik: string): Promise<{
    companyInfo: CompanyInfo;
    filings: SECFiling[];
  } | null> {
    try {
      const paddedCik = cik.padStart(10, '0');
      const url = `${this.baseUrl}/submissions/CIK${paddedCik}.json`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[SEC EDGAR] Failed to fetch submissions: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Extract company info
      const companyInfo: CompanyInfo = {
        cik: data.cik,
        entityType: data.entityType,
        sic: data.sic,
        sicDescription: data.sicDescription,
        name: data.name,
        tickers: data.tickers || [],
        exchanges: data.exchanges || [],
        ein: data.ein,
        description: data.description || '',
        website: data.website || '',
        fiscalYearEnd: data.fiscalYearEnd,
        stateOfIncorporation: data.stateOfIncorporation,
        stateOfIncorporationDescription: data.stateOfIncorporationDescription,
        addresses: data.addresses
      };

      // Extract filings
      const recentFilings = data.filings?.recent || {};
      const filings: SECFiling[] = [];

      const accessionNumbers = recentFilings.accessionNumber || [];
      const filingDates = recentFilings.filingDate || [];
      const reportDates = recentFilings.reportDate || [];
      const forms = recentFilings.form || [];
      const primaryDocuments = recentFilings.primaryDocument || [];
      const primaryDocDescriptions = recentFilings.primaryDocDescription || [];
      const fileNumbers = recentFilings.fileNumber || [];
      const filmNumbers = recentFilings.filmNumber || [];
      const items = recentFilings.items || [];
      const sizes = recentFilings.size || [];
      const isXBRLs = recentFilings.isXBRL || [];
      const isInlineXBRLs = recentFilings.isInlineXBRL || [];

      for (let i = 0; i < accessionNumbers.length; i++) {
        const accessionNumber = accessionNumbers[i];
        const accessionFormatted = accessionNumber.replace(/-/g, '');
        
        filings.push({
          accessionNumber,
          filingDate: filingDates[i] || '',
          reportDate: reportDates[i] || '',
          form: forms[i] || '',
          primaryDocument: primaryDocuments[i] || '',
          primaryDocDescription: primaryDocDescriptions[i] || '',
          fileNumber: fileNumbers[i] || '',
          filmNumber: filmNumbers[i] || '',
          items: items[i] || '',
          size: sizes[i] || 0,
          isXBRL: isXBRLs[i] || false,
          isInlineXBRL: isInlineXBRLs[i] || false,
          edgarUrl: `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${accessionFormatted}/${primaryDocuments[i]}`
        });
      }

      return { companyInfo, filings };
    } catch (error) {
      console.error('[SEC EDGAR] Error fetching submissions:', error);
      return null;
    }
  }

  /**
   * Get company XBRL facts (financial data)
   */
  async getCompanyFacts(cik: string): Promise<CompanyFacts | null> {
    try {
      const paddedCik = cik.padStart(10, '0');
      const url = `${this.baseUrl}/api/xbrl/companyfacts/CIK${paddedCik}.json`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[SEC EDGAR] Failed to fetch company facts: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data as CompanyFacts;
    } catch (error) {
      console.error('[SEC EDGAR] Error fetching company facts:', error);
      return null;
    }
  }

  /**
   * Get specific XBRL concept for a company
   */
  async getCompanyConcept(
    cik: string,
    taxonomy: string,
    concept: string
  ): Promise<XBRLFact[] | null> {
    try {
      const paddedCik = cik.padStart(10, '0');
      const url = `${this.baseUrl}/api/xbrl/companyconcept/CIK${paddedCik}/${taxonomy}/${concept}.json`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[SEC EDGAR] Failed to fetch concept: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      // Flatten units into a single array
      const facts: XBRLFact[] = [];
      for (const unit of Object.keys(data.units || {})) {
        for (const fact of data.units[unit]) {
          facts.push({
            taxonomy,
            tag: concept,
            label: data.label,
            description: data.description,
            units: unit,
            value: fact.val,
            startDate: fact.start,
            endDate: fact.end,
            instant: fact.instant,
            form: fact.form,
            filed: fact.filed,
            accn: fact.accn
          });
        }
      }

      return facts;
    } catch (error) {
      console.error('[SEC EDGAR] Error fetching concept:', error);
      return null;
    }
  }

  /**
   * Get 10-K filings for a company
   */
  async get10KFilings(ticker: string, limit: number = 5): Promise<SECFiling[]> {
    const cik = await this.getCIKByTicker(ticker);
    if (!cik) return [];

    const submissions = await this.getCompanySubmissions(cik);
    if (!submissions) return [];

    return submissions.filings
      .filter(f => f.form === '10-K' || f.form === '10-K/A')
      .slice(0, limit);
  }

  /**
   * Get 10-Q filings for a company
   */
  async get10QFilings(ticker: string, limit: number = 10): Promise<SECFiling[]> {
    const cik = await this.getCIKByTicker(ticker);
    if (!cik) return [];

    const submissions = await this.getCompanySubmissions(cik);
    if (!submissions) return [];

    return submissions.filings
      .filter(f => f.form === '10-Q' || f.form === '10-Q/A')
      .slice(0, limit);
  }

  /**
   * Get 8-K filings for a company
   */
  async get8KFilings(ticker: string, limit: number = 20): Promise<SECFiling[]> {
    const cik = await this.getCIKByTicker(ticker);
    if (!cik) return [];

    const submissions = await this.getCompanySubmissions(cik);
    if (!submissions) return [];

    return submissions.filings
      .filter(f => f.form === '8-K' || f.form === '8-K/A')
      .slice(0, limit);
  }

  /**
   * Get filing content (HTML)
   */
  async getFilingContent(filing: SECFiling): Promise<string | null> {
    try {
      const response = await fetch(filing.edgarUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html'
        }
      });

      if (!response.ok) {
        console.error(`[SEC EDGAR] Failed to fetch filing content: ${response.status}`);
        return null;
      }

      return await response.text();
    } catch (error) {
      console.error('[SEC EDGAR] Error fetching filing content:', error);
      return null;
    }
  }

  /**
   * Get SEC filings via Yahoo Finance API (for metadata)
   */
  async getYahooSECFilings(ticker: string): Promise<YahooSECFiling[]> {
    try {
      const result = await callDataApi('YahooFinance/get_stock_sec_filing', {
        query: {
          symbol: ticker,
          region: 'US',
          lang: 'en-US'
        }
      }) as any;

      if (!result || !result.quoteSummary?.result?.[0]?.secFilings?.filings) {
        return [];
      }

      return result.quoteSummary.result[0].secFilings.filings.map((f: any) => ({
        date: f.date,
        epochDate: f.epochDate,
        type: f.type,
        title: f.title,
        edgarUrl: f.edgarUrl,
        maxAge: f.maxAge
      }));
    } catch (error) {
      console.error('[SEC EDGAR] Error fetching Yahoo SEC filings:', error);
      return [];
    }
  }

  /**
   * Extract key financial metrics from XBRL data
   */
  async extractKeyMetrics(ticker: string): Promise<Record<string, any> | null> {
    const cik = await this.getCIKByTicker(ticker);
    if (!cik) return null;

    const facts = await this.getCompanyFacts(cik);
    if (!facts) return null;

    const metrics: Record<string, any> = {};

    // Key US-GAAP concepts to extract
    const keyConcepts = [
      'Revenues',
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'NetIncomeLoss',
      'EarningsPerShareBasic',
      'EarningsPerShareDiluted',
      'Assets',
      'Liabilities',
      'StockholdersEquity',
      'CashAndCashEquivalentsAtCarryingValue',
      'LongTermDebt',
      'OperatingIncomeLoss',
      'GrossProfit',
      'ResearchAndDevelopmentExpense',
      'CommonStockSharesOutstanding'
    ];

    const usGaap = facts.facts?.['us-gaap'];
    if (usGaap) {
      for (const concept of keyConcepts) {
        if (usGaap[concept]) {
          const units = usGaap[concept].units;
          const unitKey = Object.keys(units)[0];
          if (unitKey && units[unitKey].length > 0) {
            // Get most recent value
            const sortedFacts = units[unitKey]
              .filter((f: any) => f.form === '10-K' || f.form === '10-Q')
              .sort((a: any, b: any) => new Date(b.filed).getTime() - new Date(a.filed).getTime());
            
            if (sortedFacts.length > 0) {
              metrics[concept] = {
                value: (sortedFacts[0] as any).val,
                unit: unitKey,
                filed: sortedFacts[0].filed,
                form: sortedFacts[0].form,
                period: (sortedFacts[0] as any).end || (sortedFacts[0] as any).instant
              };
            }
          }
        }
      }
    }

    return metrics;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSECEdgarService(): SECEdgarService {
  return new SECEdgarService();
}

// Export singleton instance
export const secEdgarService = new SECEdgarService();
