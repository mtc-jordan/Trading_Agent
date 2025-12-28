/**
 * Backtest Export Service
 * 
 * Generates PDF and CSV exports of backtest comparison reports
 * for sharing with advisors or keeping records.
 */

// Types
export interface BacktestExportData {
  title: string;
  generatedAt: Date;
  userId: string;
  backtests: BacktestSummary[];
  comparison?: ComparisonData;
  metadata: ExportMetadata;
}

export interface BacktestSummary {
  id: string;
  name: string;
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  agentWeights: Record<string, number>;
  trades: TradeRecord[];
}

export interface TradeRecord {
  date: Date;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  value: number;
  pnl?: number;
  pnlPct?: number;
}

export interface ComparisonData {
  metrics: MetricComparison[];
  correlationMatrix: number[][];
  bestPerformer: string;
  recommendation: string;
}

export interface MetricComparison {
  metric: string;
  values: { backtestId: string; value: number }[];
  winner: string;
}

export interface ExportMetadata {
  version: string;
  platform: string;
  disclaimer: string;
}

export interface CSVExportOptions {
  includeTradeDetails: boolean;
  includeAgentWeights: boolean;
  delimiter: ',' | ';' | '\t';
  dateFormat: 'ISO' | 'US' | 'EU';
}

export interface PDFExportOptions {
  includeCharts: boolean;
  includeTradeLog: boolean;
  includeDisclaimer: boolean;
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
}

// Default metadata
const DEFAULT_METADATA: ExportMetadata = {
  version: '1.0.0',
  platform: 'TradoVerse AI Trading Platform',
  disclaimer: 'Past performance is not indicative of future results. This report is for informational purposes only and does not constitute financial advice. Trading involves risk and may result in loss of capital.',
};

/**
 * Generate CSV export of backtest data
 */
export function generateCSVExport(
  data: BacktestExportData,
  options: CSVExportOptions = {
    includeTradeDetails: true,
    includeAgentWeights: true,
    delimiter: ',',
    dateFormat: 'ISO',
  }
): string {
  const d = options.delimiter;
  const lines: string[] = [];
  
  // Header section
  lines.push(`# TradoVerse Backtest Report`);
  lines.push(`# Generated: ${formatDate(data.generatedAt, options.dateFormat)}`);
  lines.push(`# Title: ${data.title}`);
  lines.push('');
  
  // Summary section
  lines.push('## BACKTEST SUMMARY');
  lines.push([
    'Backtest ID',
    'Name',
    'Symbol',
    'Start Date',
    'End Date',
    'Initial Capital',
    'Final Value',
    'Total Return %',
    'Annualized Return %',
    'Sharpe Ratio',
    'Max Drawdown %',
    'Win Rate %',
    'Total Trades',
    'Profit Factor',
  ].join(d));
  
  for (const bt of data.backtests) {
    lines.push([
      bt.id,
      bt.name,
      bt.symbol,
      formatDate(bt.startDate, options.dateFormat),
      formatDate(bt.endDate, options.dateFormat),
      bt.initialCapital.toFixed(2),
      bt.finalValue.toFixed(2),
      (bt.totalReturn * 100).toFixed(2),
      (bt.annualizedReturn * 100).toFixed(2),
      bt.sharpeRatio.toFixed(3),
      (bt.maxDrawdown * 100).toFixed(2),
      (bt.winRate * 100).toFixed(2),
      bt.totalTrades.toString(),
      bt.profitFactor.toFixed(2),
    ].join(d));
  }
  lines.push('');
  
  // Agent weights section
  if (options.includeAgentWeights) {
    lines.push('## AGENT WEIGHTS');
    const agents = ['technical', 'fundamental', 'sentiment', 'risk', 'regime', 'execution', 'coordinator'];
    lines.push(['Backtest ID', ...agents.map(a => `${a} %`)].join(d));
    
    for (const bt of data.backtests) {
      const weights = agents.map(a => ((bt.agentWeights[a] || 0) * 100).toFixed(1));
      lines.push([bt.id, ...weights].join(d));
    }
    lines.push('');
  }
  
  // Comparison section
  if (data.comparison) {
    lines.push('## COMPARISON RESULTS');
    lines.push(`Best Performer: ${data.comparison.bestPerformer}`);
    lines.push(`Recommendation: ${data.comparison.recommendation}`);
    lines.push('');
    
    lines.push('### Metric Comparison');
    lines.push(['Metric', ...data.backtests.map(bt => bt.name), 'Winner'].join(d));
    
    for (const metric of data.comparison.metrics) {
      const values = data.backtests.map(bt => {
        const mv = metric.values.find(v => v.backtestId === bt.id);
        return mv ? mv.value.toFixed(4) : 'N/A';
      });
      lines.push([metric.metric, ...values, metric.winner].join(d));
    }
    lines.push('');
  }
  
  // Trade details section
  if (options.includeTradeDetails) {
    lines.push('## TRADE DETAILS');
    
    for (const bt of data.backtests) {
      lines.push(`### ${bt.name} (${bt.id})`);
      lines.push(['Date', 'Symbol', 'Side', 'Quantity', 'Price', 'Value', 'P&L', 'P&L %'].join(d));
      
      for (const trade of bt.trades) {
        lines.push([
          formatDate(trade.date, options.dateFormat),
          trade.symbol,
          trade.side.toUpperCase(),
          trade.quantity.toString(),
          trade.price.toFixed(2),
          trade.value.toFixed(2),
          trade.pnl !== undefined ? trade.pnl.toFixed(2) : '',
          trade.pnlPct !== undefined ? (trade.pnlPct * 100).toFixed(2) : '',
        ].join(d));
      }
      lines.push('');
    }
  }
  
  // Disclaimer
  lines.push('## DISCLAIMER');
  lines.push(data.metadata.disclaimer);
  
  return lines.join('\n');
}

/**
 * Generate PDF-ready HTML content
 */
export function generatePDFContent(
  data: BacktestExportData,
  options: PDFExportOptions = {
    includeCharts: true,
    includeTradeLog: true,
    includeDisclaimer: true,
    paperSize: 'A4',
    orientation: 'portrait',
  }
): string {
  const html: string[] = [];
  
  // HTML header
  html.push(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    @page {
      size: ${options.paperSize} ${options.orientation};
      margin: 1cm;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
      max-width: 100%;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #22c55e;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #22c55e;
      margin: 0;
      font-size: 24pt;
    }
    .header .subtitle {
      color: #666;
      font-size: 10pt;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section h2 {
      color: #22c55e;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
      font-size: 14pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 9pt;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .metric-positive {
      color: #22c55e;
      font-weight: 600;
    }
    .metric-negative {
      color: #ef4444;
      font-weight: 600;
    }
    .winner-badge {
      background-color: #22c55e;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8pt;
    }
    .disclaimer {
      background-color: #f8f9fa;
      border: 1px solid #ddd;
      padding: 10px;
      font-size: 8pt;
      color: #666;
      margin-top: 20px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 15px 0;
    }
    .summary-card {
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .summary-card .value {
      font-size: 18pt;
      font-weight: 700;
      color: #22c55e;
    }
    .summary-card .label {
      font-size: 8pt;
      color: #666;
    }
    .chart-placeholder {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 1px dashed #ddd;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      color: #999;
    }
  </style>
</head>
<body>`);
  
  // Header
  html.push(`
  <div class="header">
    <h1>📊 ${data.title}</h1>
    <div class="subtitle">
      Generated by ${data.metadata.platform}<br>
      ${formatDate(data.generatedAt, 'US')}
    </div>
  </div>`);
  
  // Executive Summary
  if (data.backtests.length > 0) {
    const best = data.backtests.reduce((a, b) => 
      a.totalReturn > b.totalReturn ? a : b
    );
    
    html.push(`
  <div class="section">
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${data.backtests.length}</div>
        <div class="label">Backtests Compared</div>
      </div>
      <div class="summary-card">
        <div class="value">${(best.totalReturn * 100).toFixed(1)}%</div>
        <div class="label">Best Return</div>
      </div>
      <div class="summary-card">
        <div class="value">${best.sharpeRatio.toFixed(2)}</div>
        <div class="label">Best Sharpe Ratio</div>
      </div>
      <div class="summary-card">
        <div class="value">${best.name}</div>
        <div class="label">Top Performer</div>
      </div>
    </div>
  </div>`);
  }
  
  // Backtest Details
  html.push(`
  <div class="section">
    <h2>Backtest Performance</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Symbol</th>
          <th>Period</th>
          <th>Return</th>
          <th>Sharpe</th>
          <th>Max DD</th>
          <th>Win Rate</th>
          <th>Trades</th>
        </tr>
      </thead>
      <tbody>`);
  
  for (const bt of data.backtests) {
    const returnClass = bt.totalReturn >= 0 ? 'metric-positive' : 'metric-negative';
    html.push(`
        <tr>
          <td><strong>${bt.name}</strong></td>
          <td>${bt.symbol}</td>
          <td>${formatDate(bt.startDate, 'US')} - ${formatDate(bt.endDate, 'US')}</td>
          <td class="${returnClass}">${(bt.totalReturn * 100).toFixed(2)}%</td>
          <td>${bt.sharpeRatio.toFixed(2)}</td>
          <td class="metric-negative">${(bt.maxDrawdown * 100).toFixed(2)}%</td>
          <td>${(bt.winRate * 100).toFixed(1)}%</td>
          <td>${bt.totalTrades}</td>
        </tr>`);
  }
  
  html.push(`
      </tbody>
    </table>
  </div>`);
  
  // Agent Weights
  html.push(`
  <div class="section">
    <h2>Agent Weight Configuration</h2>
    <table>
      <thead>
        <tr>
          <th>Backtest</th>
          <th>Technical</th>
          <th>Fundamental</th>
          <th>Sentiment</th>
          <th>Risk</th>
          <th>Regime</th>
          <th>Execution</th>
          <th>Coordinator</th>
        </tr>
      </thead>
      <tbody>`);
  
  for (const bt of data.backtests) {
    const w = bt.agentWeights;
    html.push(`
        <tr>
          <td><strong>${bt.name}</strong></td>
          <td>${((w.technical || 0) * 100).toFixed(1)}%</td>
          <td>${((w.fundamental || 0) * 100).toFixed(1)}%</td>
          <td>${((w.sentiment || 0) * 100).toFixed(1)}%</td>
          <td>${((w.risk || 0) * 100).toFixed(1)}%</td>
          <td>${((w.regime || 0) * 100).toFixed(1)}%</td>
          <td>${((w.execution || 0) * 100).toFixed(1)}%</td>
          <td>${((w.coordinator || 0) * 100).toFixed(1)}%</td>
        </tr>`);
  }
  
  html.push(`
      </tbody>
    </table>
  </div>`);
  
  // Comparison Results
  if (data.comparison) {
    html.push(`
  <div class="section">
    <h2>Comparison Analysis</h2>
    <p><strong>Best Overall Performer:</strong> ${data.comparison.bestPerformer}</p>
    <p><strong>Recommendation:</strong> ${data.comparison.recommendation}</p>
    
    <h3>Metric-by-Metric Comparison</h3>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          ${data.backtests.map(bt => `<th>${bt.name}</th>`).join('')}
          <th>Winner</th>
        </tr>
      </thead>
      <tbody>`);
    
    for (const metric of data.comparison.metrics) {
      html.push(`
        <tr>
          <td><strong>${metric.metric}</strong></td>`);
      
      for (const bt of data.backtests) {
        const mv = metric.values.find(v => v.backtestId === bt.id);
        const isWinner = metric.winner === bt.id;
        html.push(`
          <td${isWinner ? ' class="metric-positive"' : ''}>${mv ? mv.value.toFixed(4) : 'N/A'}</td>`);
      }
      
      const winnerBt = data.backtests.find(bt => bt.id === metric.winner);
      html.push(`
          <td><span class="winner-badge">${winnerBt?.name || metric.winner}</span></td>
        </tr>`);
    }
    
    html.push(`
      </tbody>
    </table>
  </div>`);
  }
  
  // Trade Log
  if (options.includeTradeLog && data.backtests.some(bt => bt.trades.length > 0)) {
    html.push(`
  <div class="section">
    <h2>Trade Log</h2>`);
    
    for (const bt of data.backtests) {
      if (bt.trades.length === 0) continue;
      
      html.push(`
    <h3>${bt.name}</h3>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Symbol</th>
          <th>Side</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Value</th>
          <th>P&L</th>
        </tr>
      </thead>
      <tbody>`);
      
      for (const trade of bt.trades.slice(0, 20)) { // Limit to 20 trades per backtest
        const pnlClass = (trade.pnl || 0) >= 0 ? 'metric-positive' : 'metric-negative';
        html.push(`
        <tr>
          <td>${formatDate(trade.date, 'US')}</td>
          <td>${trade.symbol}</td>
          <td>${trade.side.toUpperCase()}</td>
          <td>${trade.quantity}</td>
          <td>$${trade.price.toFixed(2)}</td>
          <td>$${trade.value.toFixed(2)}</td>
          <td class="${pnlClass}">${trade.pnl !== undefined ? `$${trade.pnl.toFixed(2)}` : '-'}</td>
        </tr>`);
      }
      
      if (bt.trades.length > 20) {
        html.push(`
        <tr>
          <td colspan="7" style="text-align: center; font-style: italic;">
            ... and ${bt.trades.length - 20} more trades
          </td>
        </tr>`);
      }
      
      html.push(`
      </tbody>
    </table>`);
    }
    
    html.push(`
  </div>`);
  }
  
  // Disclaimer
  if (options.includeDisclaimer) {
    html.push(`
  <div class="disclaimer">
    <strong>Disclaimer:</strong> ${data.metadata.disclaimer}
  </div>`);
  }
  
  // Close HTML
  html.push(`
</body>
</html>`);
  
  return html.join('');
}

/**
 * Format date based on format preference
 */
function formatDate(date: Date, format: 'ISO' | 'US' | 'EU'): string {
  if (format === 'ISO') {
    return date.toISOString().split('T')[0];
  } else if (format === 'US') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } else {
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Create export data from backtest results
 */
export function createExportData(
  title: string,
  userId: string,
  backtests: BacktestSummary[],
  comparison?: ComparisonData
): BacktestExportData {
  return {
    title,
    generatedAt: new Date(),
    userId,
    backtests,
    comparison,
    metadata: DEFAULT_METADATA,
  };
}

/**
 * Generate sample export data for testing
 */
export function generateSampleExportData(userId: string): BacktestExportData {
  const backtests: BacktestSummary[] = [
    {
      id: 'bt_001',
      name: 'Conservative Strategy',
      symbol: 'AAPL',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-01'),
      initialCapital: 100000,
      finalValue: 112500,
      totalReturn: 0.125,
      annualizedReturn: 0.136,
      sharpeRatio: 1.45,
      maxDrawdown: 0.08,
      winRate: 0.62,
      totalTrades: 45,
      profitFactor: 1.8,
      agentWeights: {
        technical: 0.15,
        fundamental: 0.25,
        sentiment: 0.10,
        risk: 0.20,
        regime: 0.15,
        execution: 0.05,
        coordinator: 0.10,
      },
      trades: [
        { date: new Date('2024-01-15'), symbol: 'AAPL', side: 'buy', quantity: 50, price: 185.50, value: 9275, pnl: undefined, pnlPct: undefined },
        { date: new Date('2024-02-20'), symbol: 'AAPL', side: 'sell', quantity: 50, price: 192.30, value: 9615, pnl: 340, pnlPct: 0.0367 },
        { date: new Date('2024-03-10'), symbol: 'AAPL', side: 'buy', quantity: 60, price: 188.20, value: 11292, pnl: undefined, pnlPct: undefined },
        { date: new Date('2024-04-15'), symbol: 'AAPL', side: 'sell', quantity: 60, price: 195.80, value: 11748, pnl: 456, pnlPct: 0.0404 },
      ],
    },
    {
      id: 'bt_002',
      name: 'Aggressive Strategy',
      symbol: 'AAPL',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-01'),
      initialCapital: 100000,
      finalValue: 128000,
      totalReturn: 0.28,
      annualizedReturn: 0.305,
      sharpeRatio: 1.12,
      maxDrawdown: 0.18,
      winRate: 0.55,
      totalTrades: 120,
      profitFactor: 1.5,
      agentWeights: {
        technical: 0.25,
        fundamental: 0.10,
        sentiment: 0.25,
        risk: 0.10,
        regime: 0.10,
        execution: 0.12,
        coordinator: 0.08,
      },
      trades: [
        { date: new Date('2024-01-05'), symbol: 'AAPL', side: 'buy', quantity: 100, price: 182.50, value: 18250, pnl: undefined, pnlPct: undefined },
        { date: new Date('2024-01-12'), symbol: 'AAPL', side: 'sell', quantity: 100, price: 188.90, value: 18890, pnl: 640, pnlPct: 0.0351 },
        { date: new Date('2024-01-20'), symbol: 'AAPL', side: 'buy', quantity: 120, price: 185.30, value: 22236, pnl: undefined, pnlPct: undefined },
        { date: new Date('2024-01-28'), symbol: 'AAPL', side: 'sell', quantity: 120, price: 191.50, value: 22980, pnl: 744, pnlPct: 0.0335 },
      ],
    },
  ];
  
  const comparison: ComparisonData = {
    metrics: [
      {
        metric: 'Total Return',
        values: [
          { backtestId: 'bt_001', value: 0.125 },
          { backtestId: 'bt_002', value: 0.28 },
        ],
        winner: 'bt_002',
      },
      {
        metric: 'Sharpe Ratio',
        values: [
          { backtestId: 'bt_001', value: 1.45 },
          { backtestId: 'bt_002', value: 1.12 },
        ],
        winner: 'bt_001',
      },
      {
        metric: 'Max Drawdown',
        values: [
          { backtestId: 'bt_001', value: 0.08 },
          { backtestId: 'bt_002', value: 0.18 },
        ],
        winner: 'bt_001',
      },
      {
        metric: 'Win Rate',
        values: [
          { backtestId: 'bt_001', value: 0.62 },
          { backtestId: 'bt_002', value: 0.55 },
        ],
        winner: 'bt_001',
      },
    ],
    correlationMatrix: [
      [1.0, 0.72],
      [0.72, 1.0],
    ],
    bestPerformer: 'Conservative Strategy',
    recommendation: 'The Conservative Strategy offers better risk-adjusted returns with a higher Sharpe ratio and lower drawdown, making it suitable for most investors.',
  };
  
  return createExportData(
    'Backtest Comparison Report',
    userId,
    backtests,
    comparison
  );
}

/**
 * Get export file name
 */
export function getExportFileName(title: string, format: 'csv' | 'pdf'): string {
  const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  return `${sanitizedTitle}_${timestamp}.${format}`;
}
