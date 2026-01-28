/**
 * SEC Filing RAG (Retrieval-Augmented Generation) System
 * 
 * Processes SEC filings (10-K, 10-Q) and enables semantic search
 * and Q&A over filing content using LLM.
 */

import { invokeLLM } from '../../_core/llm';
import { secEdgarService, SECFiling } from './SECEdgarService';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FilingChunk {
  id: string;
  filingAccession: string;
  sectionTitle: string;
  content: string;
  startIndex: number;
  endIndex: number;
  metadata: {
    ticker: string;
    form: string;
    filingDate: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface ParsedFiling {
  accessionNumber: string;
  form: string;
  filingDate: string;
  companyName: string;
  ticker: string;
  sections: FilingSection[];
  chunks: FilingChunk[];
  rawText: string;
}

export interface FilingSection {
  title: string;
  itemNumber: string;
  content: string;
  summary?: string;
}

export interface RAGSearchResult {
  chunk: FilingChunk;
  relevanceScore: number;
  highlightedContent: string;
}

export interface FilingQAResult {
  question: string;
  answer: string;
  sources: {
    section: string;
    excerpt: string;
    filingDate: string;
  }[];
  confidence: number;
}

export interface FilingSummary {
  ticker: string;
  form: string;
  filingDate: string;
  executiveSummary: string;
  keyHighlights: string[];
  riskFactors: string[];
  financialHighlights: {
    metric: string;
    value: string;
    change?: string;
  }[];
  managementOutlook: string;
}

// ============================================================================
// SEC Filing RAG Class
// ============================================================================

export class SECFilingRAG {
  private chunkSize: number = 2000;
  private chunkOverlap: number = 200;
  private filingCache: Map<string, ParsedFiling> = new Map();

  // Standard 10-K section patterns
  private readonly sectionPatterns = [
    { pattern: /ITEM\s*1[.\s]*BUSINESS/i, title: 'Business', itemNumber: '1' },
    { pattern: /ITEM\s*1A[.\s]*RISK\s*FACTORS/i, title: 'Risk Factors', itemNumber: '1A' },
    { pattern: /ITEM\s*1B[.\s]*UNRESOLVED\s*STAFF\s*COMMENTS/i, title: 'Unresolved Staff Comments', itemNumber: '1B' },
    { pattern: /ITEM\s*1C[.\s]*CYBERSECURITY/i, title: 'Cybersecurity', itemNumber: '1C' },
    { pattern: /ITEM\s*2[.\s]*PROPERTIES/i, title: 'Properties', itemNumber: '2' },
    { pattern: /ITEM\s*3[.\s]*LEGAL\s*PROCEEDINGS/i, title: 'Legal Proceedings', itemNumber: '3' },
    { pattern: /ITEM\s*4[.\s]*MINE\s*SAFETY/i, title: 'Mine Safety Disclosures', itemNumber: '4' },
    { pattern: /ITEM\s*5[.\s]*MARKET/i, title: 'Market for Common Equity', itemNumber: '5' },
    { pattern: /ITEM\s*6[.\s]*SELECTED\s*FINANCIAL/i, title: 'Selected Financial Data', itemNumber: '6' },
    { pattern: /ITEM\s*7[.\s]*MANAGEMENT.*DISCUSSION/i, title: "Management's Discussion and Analysis (MD&A)", itemNumber: '7' },
    { pattern: /ITEM\s*7A[.\s]*QUANTITATIVE.*QUALITATIVE/i, title: 'Market Risk Disclosures', itemNumber: '7A' },
    { pattern: /ITEM\s*8[.\s]*FINANCIAL\s*STATEMENTS/i, title: 'Financial Statements', itemNumber: '8' },
    { pattern: /ITEM\s*9[.\s]*CHANGES.*DISAGREEMENTS/i, title: 'Changes in Accountants', itemNumber: '9' },
    { pattern: /ITEM\s*9A[.\s]*CONTROLS/i, title: 'Controls and Procedures', itemNumber: '9A' },
    { pattern: /ITEM\s*9B[.\s]*OTHER\s*INFORMATION/i, title: 'Other Information', itemNumber: '9B' },
    { pattern: /ITEM\s*10[.\s]*DIRECTORS/i, title: 'Directors and Executive Officers', itemNumber: '10' },
    { pattern: /ITEM\s*11[.\s]*EXECUTIVE\s*COMPENSATION/i, title: 'Executive Compensation', itemNumber: '11' },
    { pattern: /ITEM\s*12[.\s]*SECURITY\s*OWNERSHIP/i, title: 'Security Ownership', itemNumber: '12' },
    { pattern: /ITEM\s*13[.\s]*CERTAIN\s*RELATIONSHIPS/i, title: 'Related Party Transactions', itemNumber: '13' },
    { pattern: /ITEM\s*14[.\s]*PRINCIPAL\s*ACCOUNT/i, title: 'Principal Accountant Fees', itemNumber: '14' },
    { pattern: /ITEM\s*15[.\s]*EXHIBITS/i, title: 'Exhibits and Financial Schedules', itemNumber: '15' }
  ];

  constructor() {
    console.log('[SEC RAG] Filing RAG system initialized');
  }

  /**
   * Parse and process a SEC filing
   */
  async parseFiling(ticker: string, filing: SECFiling): Promise<ParsedFiling | null> {
    const cacheKey = `${ticker}-${filing.accessionNumber}`;
    
    // Check cache
    if (this.filingCache.has(cacheKey)) {
      return this.filingCache.get(cacheKey)!;
    }

    try {
      // Fetch filing content
      const htmlContent = await secEdgarService.getFilingContent(filing);
      if (!htmlContent) return null;

      // Convert HTML to plain text
      const plainText = this.htmlToText(htmlContent);

      // Extract sections
      const sections = this.extractSections(plainText);

      // Create chunks
      const chunks = this.createChunks(plainText, ticker, filing);

      const parsedFiling: ParsedFiling = {
        accessionNumber: filing.accessionNumber,
        form: filing.form,
        filingDate: filing.filingDate,
        companyName: filing.primaryDocDescription || ticker,
        ticker,
        sections,
        chunks,
        rawText: plainText
      };

      // Cache the result
      this.filingCache.set(cacheKey, parsedFiling);

      return parsedFiling;
    } catch (error) {
      console.error('[SEC RAG] Error parsing filing:', error);
      return null;
    }
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Replace common HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    
    // Replace block elements with newlines
    text = text.replace(/<\/?(p|div|br|h[1-6]|tr|li)[^>]*>/gi, '\n');
    
    // Remove remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ');
    text = text.replace(/\n\s+/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text.trim();
  }

  /**
   * Extract sections from filing text
   */
  private extractSections(text: string): FilingSection[] {
    const sections: FilingSection[] = [];
    
    for (let i = 0; i < this.sectionPatterns.length; i++) {
      const { pattern, title, itemNumber } = this.sectionPatterns[i];
      const match = text.match(pattern);
      
      if (match) {
        const startIndex = match.index!;
        
        // Find end of section (start of next section or end of document)
        let endIndex = text.length;
        for (let j = i + 1; j < this.sectionPatterns.length; j++) {
          const nextMatch = text.match(this.sectionPatterns[j].pattern);
          if (nextMatch && nextMatch.index! > startIndex) {
            endIndex = nextMatch.index!;
            break;
          }
        }
        
        const content = text.substring(startIndex, endIndex).trim();
        
        sections.push({
          title,
          itemNumber,
          content: content.substring(0, 50000) // Limit content size
        });
      }
    }
    
    return sections;
  }

  /**
   * Create chunks from filing text
   */
  private createChunks(text: string, ticker: string, filing: SECFiling): FilingChunk[] {
    const chunks: FilingChunk[] = [];
    let currentIndex = 0;
    let chunkIndex = 0;
    
    while (currentIndex < text.length) {
      const endIndex = Math.min(currentIndex + this.chunkSize, text.length);
      let chunkText = text.substring(currentIndex, endIndex);
      
      // Try to end at a sentence boundary
      if (endIndex < text.length) {
        const lastPeriod = chunkText.lastIndexOf('.');
        const lastNewline = chunkText.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > this.chunkSize * 0.5) {
          chunkText = chunkText.substring(0, breakPoint + 1);
        }
      }
      
      // Determine section title for this chunk
      let sectionTitle = 'General';
      for (const { pattern, title } of this.sectionPatterns) {
        const textBefore = text.substring(0, currentIndex + 500);
        if (pattern.test(textBefore)) {
          sectionTitle = title;
        }
      }
      
      chunks.push({
        id: `${filing.accessionNumber}-chunk-${chunkIndex}`,
        filingAccession: filing.accessionNumber,
        sectionTitle,
        content: chunkText.trim(),
        startIndex: currentIndex,
        endIndex: currentIndex + chunkText.length,
        metadata: {
          ticker,
          form: filing.form,
          filingDate: filing.filingDate,
          chunkIndex,
          totalChunks: 0 // Will be updated after all chunks created
        }
      });
      
      currentIndex += chunkText.length - this.chunkOverlap;
      chunkIndex++;
    }
    
    // Update total chunks count
    for (const chunk of chunks) {
      chunk.metadata.totalChunks = chunks.length;
    }
    
    return chunks;
  }

  /**
   * Search filing content using semantic similarity
   */
  async searchFiling(
    parsedFiling: ParsedFiling,
    query: string,
    topK: number = 5
  ): Promise<RAGSearchResult[]> {
    // Simple keyword-based search (in production, use embeddings)
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    const scoredChunks = parsedFiling.chunks.map(chunk => {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;
      
      for (const term of queryTerms) {
        const regex = new RegExp(term, 'gi');
        const matches = contentLower.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      
      // Boost score for section relevance
      if (query.toLowerCase().includes('risk') && chunk.sectionTitle.includes('Risk')) {
        score *= 2;
      }
      if (query.toLowerCase().includes('business') && chunk.sectionTitle.includes('Business')) {
        score *= 2;
      }
      if (query.toLowerCase().includes('financial') && chunk.sectionTitle.includes('Financial')) {
        score *= 2;
      }
      
      return { chunk, score };
    });
    
    // Sort by score and take top K
    const topChunks = scoredChunks
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    
    return topChunks.map(({ chunk, score }) => ({
      chunk,
      relevanceScore: score,
      highlightedContent: this.highlightTerms(chunk.content, queryTerms)
    }));
  }

  /**
   * Highlight search terms in content
   */
  private highlightTerms(content: string, terms: string[]): string {
    let highlighted = content;
    for (const term of terms) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '**$1**');
    }
    return highlighted;
  }

  /**
   * Answer questions about a filing using RAG
   */
  async askQuestion(
    parsedFiling: ParsedFiling,
    question: string
  ): Promise<FilingQAResult> {
    // Search for relevant chunks
    const searchResults = await this.searchFiling(parsedFiling, question, 5);
    
    // Build context from relevant chunks
    const context = searchResults
      .map(r => `[${r.chunk.sectionTitle}]\n${r.chunk.content}`)
      .join('\n\n---\n\n');
    
    // Generate answer using LLM
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a financial analyst expert at analyzing SEC filings. 
Answer questions based ONLY on the provided filing excerpts.
If the information is not in the excerpts, say "This information is not found in the filing."
Be specific and cite the relevant section when possible.
Format numbers clearly and provide context for financial figures.`
        },
        {
          role: 'user',
          content: `Based on the following excerpts from ${parsedFiling.ticker}'s ${parsedFiling.form} filing dated ${parsedFiling.filingDate}:

${context}

Question: ${question}

Please provide a detailed answer based on the filing content.`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'filing_qa_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              answer: { type: 'string', description: 'The answer to the question' },
              confidence: { type: 'number', description: 'Confidence score 0-100' },
              citedSections: {
                type: 'array',
                items: { type: 'string' },
                description: 'Sections cited in the answer'
              }
            },
            required: ['answer', 'confidence', 'citedSections'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    let parsed = { answer: 'Unable to generate answer', confidence: 0, citedSections: [] as string[] };
    
    if (content) {
      try {
        parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
      } catch {
        parsed.answer = typeof content === 'string' ? content : 'Unable to parse response';
      }
    }

    return {
      question,
      answer: parsed.answer,
      sources: searchResults.slice(0, 3).map(r => ({
        section: r.chunk.sectionTitle,
        excerpt: r.chunk.content.substring(0, 300) + '...',
        filingDate: parsedFiling.filingDate
      })),
      confidence: parsed.confidence
    };
  }

  /**
   * Generate a summary of the filing
   */
  async generateSummary(parsedFiling: ParsedFiling): Promise<FilingSummary> {
    // Get key sections
    const businessSection = parsedFiling.sections.find(s => s.itemNumber === '1');
    const riskSection = parsedFiling.sections.find(s => s.itemNumber === '1A');
    const mdaSection = parsedFiling.sections.find(s => s.itemNumber === '7');
    
    const context = [
      businessSection ? `BUSINESS:\n${businessSection.content.substring(0, 5000)}` : '',
      riskSection ? `RISK FACTORS:\n${riskSection.content.substring(0, 5000)}` : '',
      mdaSection ? `MD&A:\n${mdaSection.content.substring(0, 5000)}` : ''
    ].filter(Boolean).join('\n\n---\n\n');

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a senior financial analyst creating executive summaries of SEC filings.
Generate a comprehensive but concise summary highlighting key business information, risks, and financial outlook.
Focus on actionable insights for investors.`
        },
        {
          role: 'user',
          content: `Summarize this ${parsedFiling.form} filing for ${parsedFiling.ticker}:

${context}

Generate a structured summary with:
1. Executive summary (2-3 sentences)
2. Key highlights (3-5 bullet points)
3. Top risk factors (3-5 items)
4. Management outlook`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'filing_summary',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              executiveSummary: { type: 'string' },
              keyHighlights: { type: 'array', items: { type: 'string' } },
              riskFactors: { type: 'array', items: { type: 'string' } },
              managementOutlook: { type: 'string' }
            },
            required: ['executiveSummary', 'keyHighlights', 'riskFactors', 'managementOutlook'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    let parsed = {
      executiveSummary: 'Summary not available',
      keyHighlights: [] as string[],
      riskFactors: [] as string[],
      managementOutlook: 'Outlook not available'
    };

    if (content) {
      try {
        parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
      } catch {
        // Keep defaults
      }
    }

    return {
      ticker: parsedFiling.ticker,
      form: parsedFiling.form,
      filingDate: parsedFiling.filingDate,
      executiveSummary: parsed.executiveSummary,
      keyHighlights: parsed.keyHighlights,
      riskFactors: parsed.riskFactors,
      financialHighlights: [], // Would need XBRL data
      managementOutlook: parsed.managementOutlook
    };
  }

  /**
   * Compare two filings (e.g., YoY comparison)
   */
  async compareFilings(
    filing1: ParsedFiling,
    filing2: ParsedFiling,
    focusArea: string = 'risk factors'
  ): Promise<{
    comparison: string;
    changes: { area: string; change: string; significance: 'high' | 'medium' | 'low' }[];
  }> {
    // Find relevant sections in both filings
    const section1 = filing1.sections.find(s => 
      s.title.toLowerCase().includes(focusArea.toLowerCase())
    );
    const section2 = filing2.sections.find(s => 
      s.title.toLowerCase().includes(focusArea.toLowerCase())
    );

    if (!section1 || !section2) {
      return {
        comparison: `Unable to compare ${focusArea} - section not found in one or both filings`,
        changes: []
      };
    }

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a financial analyst comparing SEC filings year-over-year.
Identify key changes, new disclosures, and removed items.
Focus on material changes that could affect investment decisions.`
        },
        {
          role: 'user',
          content: `Compare the ${focusArea} section between these two filings:

OLDER FILING (${filing1.filingDate}):
${section1.content.substring(0, 8000)}

NEWER FILING (${filing2.filingDate}):
${section2.content.substring(0, 8000)}

Identify:
1. New risks/items added
2. Risks/items removed
3. Significant changes in language or emphasis
4. Overall assessment of changes`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'filing_comparison',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              comparison: { type: 'string', description: 'Overall comparison summary' },
              changes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    area: { type: 'string' },
                    change: { type: 'string' },
                    significance: { type: 'string', enum: ['high', 'medium', 'low'] }
                  },
                  required: ['area', 'change', 'significance'],
                  additionalProperties: false
                }
              }
            },
            required: ['comparison', 'changes'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    let parsed = { comparison: 'Comparison not available', changes: [] as any[] };

    if (content) {
      try {
        parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
      } catch {
        // Keep defaults
      }
    }

    return parsed;
  }

  /**
   * Get specific section from filing
   */
  getSection(parsedFiling: ParsedFiling, sectionName: string): FilingSection | null {
    return parsedFiling.sections.find(s => 
      s.title.toLowerCase().includes(sectionName.toLowerCase()) ||
      s.itemNumber === sectionName
    ) || null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.filingCache.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSECFilingRAG(): SECFilingRAG {
  return new SECFilingRAG();
}

// Export singleton instance
export const secFilingRAG = new SECFilingRAG();
