import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Wallet,
  Lock,
  RefreshCw,
  FileCheck,
  Eye,
  DollarSign,
  Percent,
  Activity,
  Users,
  Zap
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface TokenVettingResult {
  symbol: string;
  contractAddress: string;
  chain: string;
  overallStatus: 'PASS' | 'FAIL' | 'PENDING';
  riskScore: number;
  liquidityCheck: {
    passed: boolean;
    dailyVolume: number;
    bidAskSpread: number;
    liquidityScore: number;
  };
  auditCheck: {
    passed: boolean;
    isVerified: boolean;
    securityRating: string;
    auditor?: string;
    rugPullRisk: string;
  };
  whaleConcentrationCheck: {
    passed: boolean;
    maxSingleWalletPercent: number;
    concentrationScore: number;
  };
  isBlacklisted: boolean;
  blacklistReason?: string;
}

interface MultiSigTransaction {
  id: string;
  type: string;
  status: string;
  action: string;
  token: string;
  amount: number;
  usdValue: number;
  currentSignatures: number;
  requiredSignatures: number;
  createdAt: number;
  aiReasoning: string;
}

interface BasisPosition {
  id: string;
  symbol: string;
  spotValue: number;
  futuresValue: number;
  fundingRate: number;
  estimatedAPR: number;
  accumulatedFunding: number;
  totalPnL: number;
  status: string;
}

interface ProfitTakingConfig {
  enabled: boolean;
  schedule: string;
  dayOfWeek: number;
  percentage: number;
  allocations: { asset: string; percentage: number }[];
  nextExecution: string;
}

// ============================================================================
// Demo Data
// ============================================================================

const generateDemoVettingResults = (): TokenVettingResult[] => [
  {
    symbol: 'ETH',
    contractAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chain: 'ethereum',
    overallStatus: 'PASS',
    riskScore: 12,
    liquidityCheck: {
      passed: true,
      dailyVolume: 850000000,
      bidAskSpread: 0.001,
      liquidityScore: 95,
    },
    auditCheck: {
      passed: true,
      isVerified: true,
      securityRating: 'PASS',
      auditor: 'N/A (Native)',
      rugPullRisk: 'LOW',
    },
    whaleConcentrationCheck: {
      passed: true,
      maxSingleWalletPercent: 0.8,
      concentrationScore: 92,
    },
    isBlacklisted: false,
  },
  {
    symbol: 'SOL',
    contractAddress: 'So11111111111111111111111111111111111111112',
    chain: 'solana',
    overallStatus: 'PASS',
    riskScore: 18,
    liquidityCheck: {
      passed: true,
      dailyVolume: 320000000,
      bidAskSpread: 0.002,
      liquidityScore: 88,
    },
    auditCheck: {
      passed: true,
      isVerified: true,
      securityRating: 'PASS',
      auditor: 'N/A (Native)',
      rugPullRisk: 'LOW',
    },
    whaleConcentrationCheck: {
      passed: true,
      maxSingleWalletPercent: 1.2,
      concentrationScore: 85,
    },
    isBlacklisted: false,
  },
  {
    symbol: 'SHIB',
    contractAddress: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
    chain: 'ethereum',
    overallStatus: 'FAIL',
    riskScore: 72,
    liquidityCheck: {
      passed: true,
      dailyVolume: 45000000,
      bidAskSpread: 0.003,
      liquidityScore: 75,
    },
    auditCheck: {
      passed: false,
      isVerified: true,
      securityRating: 'NOT_AUDITED',
      rugPullRisk: 'MEDIUM',
    },
    whaleConcentrationCheck: {
      passed: false,
      maxSingleWalletPercent: 5.2,
      concentrationScore: 35,
    },
    isBlacklisted: false,
  },
  {
    symbol: 'PEPE',
    contractAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    chain: 'ethereum',
    overallStatus: 'FAIL',
    riskScore: 85,
    liquidityCheck: {
      passed: false,
      dailyVolume: 2500000,
      bidAskSpread: 0.008,
      liquidityScore: 45,
    },
    auditCheck: {
      passed: false,
      isVerified: true,
      securityRating: 'NOT_AUDITED',
      rugPullRisk: 'HIGH',
    },
    whaleConcentrationCheck: {
      passed: false,
      maxSingleWalletPercent: 8.5,
      concentrationScore: 20,
    },
    isBlacklisted: true,
    blacklistReason: 'Wash trading detected',
  },
];

const generateDemoMultiSigTxs = (): MultiSigTransaction[] => [
  {
    id: 'tx_001',
    type: 'TRADE',
    status: 'PENDING',
    action: 'BUY 10 ETH',
    token: 'ETH',
    amount: 10,
    usdValue: 32500,
    currentSignatures: 1,
    requiredSignatures: 2,
    createdAt: Date.now() - 3600000,
    aiReasoning: 'Smart money accumulation detected. Technical indicators bullish.',
  },
  {
    id: 'tx_002',
    type: 'PROFIT_TAKING',
    status: 'READY',
    action: 'Convert 50% profits to PAXG',
    token: 'MIXED',
    amount: 25000,
    usdValue: 25000,
    currentSignatures: 2,
    requiredSignatures: 2,
    createdAt: Date.now() - 7200000,
    aiReasoning: 'Weekly profit-taking per institutional policy.',
  },
  {
    id: 'tx_003',
    type: 'REBALANCE',
    status: 'PARTIALLY_SIGNED',
    action: 'Rebalance delta-neutral position',
    token: 'BTC',
    amount: 0.5,
    usdValue: 48750,
    currentSignatures: 1,
    requiredSignatures: 2,
    createdAt: Date.now() - 1800000,
    aiReasoning: 'Delta exposure exceeded 1% threshold. Rebalancing required.',
  },
];

const generateDemoBasisPositions = (): BasisPosition[] => [
  {
    id: 'basis_001',
    symbol: 'BTC',
    spotValue: 500000,
    futuresValue: 500000,
    fundingRate: 0.00012,
    estimatedAPR: 13.14,
    accumulatedFunding: 1250,
    totalPnL: 1180,
    status: 'OPEN',
  },
  {
    id: 'basis_002',
    symbol: 'ETH',
    spotValue: 200000,
    futuresValue: 200000,
    fundingRate: 0.00018,
    estimatedAPR: 19.71,
    accumulatedFunding: 720,
    totalPnL: 695,
    status: 'OPEN',
  },
  {
    id: 'basis_003',
    symbol: 'SOL',
    spotValue: 100000,
    futuresValue: 100000,
    fundingRate: 0.00028,
    estimatedAPR: 30.66,
    accumulatedFunding: 560,
    totalPnL: 540,
    status: 'OPEN',
  },
];

const demoProfitTakingConfig: ProfitTakingConfig = {
  enabled: true,
  schedule: 'WEEKLY',
  dayOfWeek: 5,
  percentage: 50,
  allocations: [
    { asset: 'PAXG', percentage: 50 },
    { asset: 'TREASURY_TOKEN', percentage: 50 },
  ],
  nextExecution: 'Friday, Jan 31, 2026 5:00 PM',
};

// ============================================================================
// Components
// ============================================================================

function RiskScoreBadge({ score }: { score: number }) {
  let color = 'bg-green-500/20 text-green-400 border-green-500/30';
  let label = 'Low Risk';
  
  if (score >= 70) {
    color = 'bg-red-500/20 text-red-400 border-red-500/30';
    label = 'High Risk';
  } else if (score >= 40) {
    color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    label = 'Medium Risk';
  }
  
  return (
    <Badge variant="outline" className={color}>
      {label} ({score})
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'PASS': 'bg-green-500/20 text-green-400 border-green-500/30',
    'FAIL': 'bg-red-500/20 text-red-400 border-red-500/30',
    'PENDING': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'READY': 'bg-green-500/20 text-green-400 border-green-500/30',
    'PARTIALLY_SIGNED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'OPEN': 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  
  return (
    <Badge variant="outline" className={colors[status] || 'bg-gray-500/20 text-gray-400'}>
      {status}
    </Badge>
  );
}

function TokenVettingCard({ result }: { result: TokenVettingResult }) {
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="text-sm font-bold">{result.symbol}</span>
            </div>
            <div>
              <CardTitle className="text-lg">{result.symbol}</CardTitle>
              <CardDescription className="text-xs font-mono">
                {result.contractAddress.slice(0, 10)}...{result.contractAddress.slice(-8)}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={result.overallStatus} />
            <RiskScoreBadge score={result.riskScore} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {result.isBlacklisted && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">Blacklisted: {result.blacklistReason}</span>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4">
          {/* Liquidity Check */}
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {result.liquidityCheck.passed ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span className="text-sm font-medium">Liquidity</span>
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Volume (24h)</span>
                <span className="text-white">${(result.liquidityCheck.dailyVolume / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span>Spread</span>
                <span className="text-white">{(result.liquidityCheck.bidAskSpread * 100).toFixed(2)}%</span>
              </div>
              <Progress value={result.liquidityCheck.liquidityScore} className="h-1 mt-2" />
            </div>
          </div>
          
          {/* Audit Check */}
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {result.auditCheck.passed ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span className="text-sm font-medium">Audit</span>
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Verified</span>
                <span className={result.auditCheck.isVerified ? 'text-green-400' : 'text-red-400'}>
                  {result.auditCheck.isVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rating</span>
                <span className="text-white">{result.auditCheck.securityRating}</span>
              </div>
              <div className="flex justify-between">
                <span>Rug Risk</span>
                <span className={
                  result.auditCheck.rugPullRisk === 'LOW' ? 'text-green-400' :
                  result.auditCheck.rugPullRisk === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
                }>
                  {result.auditCheck.rugPullRisk}
                </span>
              </div>
            </div>
          </div>
          
          {/* Whale Check */}
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {result.whaleConcentrationCheck.passed ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span className="text-sm font-medium">Whale Conc.</span>
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Max Wallet</span>
                <span className={
                  result.whaleConcentrationCheck.maxSingleWalletPercent <= 3 ? 'text-green-400' : 'text-red-400'
                }>
                  {result.whaleConcentrationCheck.maxSingleWalletPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Limit</span>
                <span className="text-white">3%</span>
              </div>
              <Progress value={result.whaleConcentrationCheck.concentrationScore} className="h-1 mt-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MultiSigApprovalCard({ tx }: { tx: MultiSigTransaction }) {
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                {tx.type}
              </Badge>
              <StatusBadge status={tx.status} />
            </div>
            <h4 className="font-medium">{tx.action}</h4>
            <p className="text-sm text-gray-400">${tx.usdValue.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm">
              <Users className="h-4 w-4" />
              <span>{tx.currentSignatures}/{tx.requiredSignatures}</span>
            </div>
            <p className="text-xs text-gray-500">
              {new Date(tx.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="p-3 bg-gray-800/50 rounded-lg mb-3">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-yellow-400 mt-0.5" />
            <p className="text-sm text-gray-300">{tx.aiReasoning}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Eye className="h-4 w-4 mr-1" />
            Review
          </Button>
          {tx.status === 'READY' ? (
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-1" />
              Execute
            </Button>
          ) : (
            <Button size="sm" className="flex-1">
              <Lock className="h-4 w-4 mr-1" />
              Sign
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BasisPositionCard({ position }: { position: BasisPosition }) {
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
              <span className="text-sm font-bold">{position.symbol}</span>
            </div>
            <div>
              <h4 className="font-medium">{position.symbol}/USDT Basis</h4>
              <p className="text-sm text-gray-400">Delta-Neutral Position</p>
            </div>
          </div>
          <StatusBadge status={position.status} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Spot Position</p>
            <p className="text-lg font-semibold text-green-400">
              ${position.spotValue.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Short Position</p>
            <p className="text-lg font-semibold text-red-400">
              ${position.futuresValue.toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-gray-800/30 rounded">
            <p className="text-xs text-gray-400">Funding Rate</p>
            <p className="text-sm font-medium text-green-400">
              +{(position.fundingRate * 100).toFixed(4)}%
            </p>
          </div>
          <div className="p-2 bg-gray-800/30 rounded">
            <p className="text-xs text-gray-400">Est. APR</p>
            <p className="text-sm font-medium text-green-400">
              {position.estimatedAPR.toFixed(2)}%
            </p>
          </div>
          <div className="p-2 bg-gray-800/30 rounded">
            <p className="text-xs text-gray-400">Total P&L</p>
            <p className={`text-sm font-medium ${position.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${position.totalPnL.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Dashboard
// ============================================================================

export default function InstitutionalRiskDashboard() {
  const [vettingResults, setVettingResults] = useState<TokenVettingResult[]>([]);
  const [multiSigTxs, setMultiSigTxs] = useState<MultiSigTransaction[]>([]);
  const [basisPositions, setBasisPositions] = useState<BasisPosition[]>([]);
  const [profitConfig, setProfitConfig] = useState<ProfitTakingConfig>(demoProfitTakingConfig);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load demo data
    setTimeout(() => {
      setVettingResults(generateDemoVettingResults());
      setMultiSigTxs(generateDemoMultiSigTxs());
      setBasisPositions(generateDemoBasisPositions());
      setIsLoading(false);
    }, 500);
  }, []);

  const passedTokens = vettingResults.filter(r => r.overallStatus === 'PASS').length;
  const failedTokens = vettingResults.filter(r => r.overallStatus === 'FAIL').length;
  const pendingApprovals = multiSigTxs.filter(tx => tx.status !== 'EXECUTED').length;
  const totalBasisValue = basisPositions.reduce((sum, p) => sum + p.spotValue, 0);
  const totalYield = basisPositions.reduce((sum, p) => sum + p.accumulatedFunding, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-400" />
              Institutional Risk Policy
            </h1>
            <p className="text-gray-400 mt-1">
              2026 Big Investor Compliance Framework
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Approved Tokens</p>
                  <p className="text-2xl font-bold text-green-400">{passedTokens}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Rejected Tokens</p>
                  <p className="text-2xl font-bold text-red-400">{failedTokens}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Lock className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Pending Approvals</p>
                  <p className="text-2xl font-bold text-purple-400">{pendingApprovals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Yield Captured</p>
                  <p className="text-2xl font-bold text-blue-400">${totalYield.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="vetting" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-800">
            <TabsTrigger value="vetting" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Token Vetting
            </TabsTrigger>
            <TabsTrigger value="multisig" className="gap-2">
              <Lock className="h-4 w-4" />
              Multi-Sig Queue
            </TabsTrigger>
            <TabsTrigger value="basis" className="gap-2">
              <Activity className="h-4 w-4" />
              Basis Trading
            </TabsTrigger>
            <TabsTrigger value="profit" className="gap-2">
              <Wallet className="h-4 w-4" />
              Profit Taking
            </TabsTrigger>
          </TabsList>

          {/* Token Vetting Tab */}
          <TabsContent value="vetting" className="space-y-4">
            <Card className="bg-gray-900/30 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-400" />
                  Institutional Filter Results
                </CardTitle>
                <CardDescription>
                  Hard rules: $5M+ daily volume, &lt;0.5% spread, verified audit, &lt;3% whale concentration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {vettingResults.map((result) => (
                  <TokenVettingCard key={result.contractAddress} result={result} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Multi-Sig Tab */}
          <TabsContent value="multisig" className="space-y-4">
            <Card className="bg-gray-900/30 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-purple-400" />
                  Multi-Sig Approval Queue
                </CardTitle>
                <CardDescription>
                  2-of-3 signature required. AI prepares transactions, humans approve.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {multiSigTxs.map((tx) => (
                    <MultiSigApprovalCard key={tx.id} tx={tx} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Basis Trading Tab */}
          <TabsContent value="basis" className="space-y-4">
            <Card className="bg-gray-900/30 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Delta-Neutral Positions
                </CardTitle>
                <CardDescription>
                  Risk-free yield from funding rates. Buy spot + Short futures = Zero price risk.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-400">Total Position Value</p>
                      <p className="text-2xl font-bold">${totalBasisValue.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-400">Accumulated Yield</p>
                      <p className="text-2xl font-bold text-green-400">${totalYield.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-400">Avg APR</p>
                      <p className="text-2xl font-bold text-green-400">
                        {(basisPositions.reduce((sum, p) => sum + p.estimatedAPR, 0) / basisPositions.length).toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {basisPositions.map((position) => (
                    <BasisPositionCard key={position.id} position={position} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profit Taking Tab */}
          <TabsContent value="profit" className="space-y-4">
            <Card className="bg-gray-900/30 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-yellow-400" />
                  Automated Profit Taking
                </CardTitle>
                <CardDescription>
                  2026 Policy: Move 50% of crypto profits to PAXG/Treasury Tokens every Friday.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Configuration */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Schedule Configuration
                    </h3>
                    
                    <div className="p-4 bg-gray-800/50 rounded-lg space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status</span>
                        <Badge className={profitConfig.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {profitConfig.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Schedule</span>
                        <span>{profitConfig.schedule}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Day</span>
                        <span>Friday</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Percentage</span>
                        <span>{profitConfig.percentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Next Execution</span>
                        <span className="text-green-400">{profitConfig.nextExecution}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Allocations */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Asset Allocations
                    </h3>
                    
                    <div className="space-y-3">
                      {profitConfig.allocations.map((alloc) => (
                        <div key={alloc.asset} className="p-4 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {alloc.asset === 'PAXG' ? (
                                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                  <span className="text-yellow-400 text-xs font-bold">Au</span>
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <span className="text-blue-400 text-xs font-bold">T</span>
                                </div>
                              )}
                              <span className="font-medium">
                                {alloc.asset === 'PAXG' ? 'Tokenized Gold (PAXG)' : 'US Treasury Tokens'}
                              </span>
                            </div>
                            <span className="text-lg font-bold">{alloc.percentage}%</span>
                          </div>
                          <Progress value={alloc.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
