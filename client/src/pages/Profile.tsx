import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  User, 
  Edit, 
  MapPin, 
  Globe, 
  Twitter, 
  TrendingUp, 
  Award,
  Users,
  BarChart3,
  Shield,
  Eye,
  EyeOff,
  Save,
  Target,
  Trophy
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    displayName: "",
    bio: "",
    location: "",
    website: "",
    twitterHandle: "",
    isPublic: true,
    showTradingStats: true,
    showPortfolio: false,
    allowFollowers: true,
  });

  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.profile.get.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: badges } = trpc.profile.getBadges.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: followers } = trpc.follow.getFollowers.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: following } = trpc.follow.getFollowing.useQuery(undefined, {
    enabled: !!user,
  });

  const updateProfileMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      setEditMode(false);
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = () => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        location: profile.location || "",
        website: profile.website || "",
        twitterHandle: profile.twitterHandle || "",
        isPublic: profile.isPublic ?? true,
        showTradingStats: profile.showTradingStats ?? true,
        showPortfolio: profile.showPortfolio ?? false,
        allowFollowers: profile.allowFollowers ?? true,
      });
    }
    setEditMode(true);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  if (!user) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Sign in to view your profile</h3>
            <p className="text-muted-foreground mb-4">
              Create and customize your trading profile
            </p>
            <Button asChild>
              <a href="/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center md:items-start">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile?.displayName?.[0] || user.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="mt-4 flex items-center gap-2">
                {profile?.isPublic ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    Private
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-2xl font-bold">
                  {profile?.displayName || user.name || "Trader"}
                </h1>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>

              {profile?.bio && (
                <p className="text-muted-foreground mb-4 max-w-xl">
                  {profile.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                {profile?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </span>
                )}
                {profile?.website && (
                  <a 
                    href={profile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
                {profile?.twitterHandle && (
                  <a 
                    href={`https://twitter.com/${profile.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <Twitter className="h-4 w-4" />
                    @{profile.twitterHandle}
                  </a>
                )}
              </div>

              <div className="flex items-center justify-center md:justify-start gap-6 mt-4">
                <div className="text-center">
                  <div className="text-xl font-bold">{followers?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{following?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Following</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{profile?.totalTrades || 0}</div>
                  <div className="text-xs text-muted-foreground">Trades</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats & Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              Number(profile?.totalReturn) >= 0 ? "text-green-500" : "text-red-500"
            }`}>
              {Number(profile?.totalReturn) >= 0 ? "+" : ""}
              {((Number(profile?.totalReturn) || 0) * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Lifetime performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((Number(profile?.winRate) || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {profile?.totalTrades || 0} trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reputation</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.reputationScore || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {badges?.length || 0} badges earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="badges" className="space-y-6">
        <TabsList>
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="badges">
          <Card>
            <CardHeader>
              <CardTitle>Earned Badges</CardTitle>
              <CardDescription>
                Achievements and milestones you've reached
              </CardDescription>
            </CardHeader>
            <CardContent>
              {badges && badges.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="p-4 border rounded-lg text-center hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-4xl mb-2">{badge.badgeIcon || "🏆"}</div>
                      <h4 className="font-medium">{badge.badgeName}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {badge.badgeDescription}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No badges yet</h3>
                  <p className="text-muted-foreground">
                    Keep trading and participating to earn badges!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Trading Statistics</CardTitle>
              <CardDescription>
                Your detailed trading performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{profile?.totalTrades || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {((Number(profile?.winRate) || 0) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {((Number(profile?.avgReturn) || 0) * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Return</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {profile?.strategiesShared || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Strategies Shared</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-500">
                    {((Number(profile?.bestTrade) || 0) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Best Trade</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-500">
                    {((Number(profile?.worstTrade) || 0) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Worst Trade</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {Number(profile?.sharpeRatio)?.toFixed(2) || "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {profile?.followersCount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control what others can see on your profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to view your profile
                  </p>
                </div>
                <Switch
                  checked={profile?.isPublic ?? true}
                  disabled
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Trading Stats</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your trading performance metrics
                  </p>
                </div>
                <Switch
                  checked={profile?.showTradingStats ?? true}
                  disabled
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Portfolio</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others see your current positions
                  </p>
                </div>
                <Switch
                  checked={profile?.showPortfolio ?? false}
                  disabled
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Followers</Label>
                  <p className="text-sm text-muted-foreground">
                    Let other traders follow you
                  </p>
                </div>
                <Switch
                  checked={profile?.allowFollowers ?? true}
                  disabled
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Click "Edit Profile" to change these settings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information and privacy settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={editData.displayName}
                onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                placeholder="Your display name"
              />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={editData.bio}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
              <div className="space-y-2">
                <Label>Twitter Handle</Label>
                <Input
                  value={editData.twitterHandle}
                  onChange={(e) => setEditData({ ...editData, twitterHandle: e.target.value })}
                  placeholder="username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={editData.website}
                onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                placeholder="https://yourwebsite.com"
              />
            </div>
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Privacy Settings</h4>
              <div className="flex items-center justify-between">
                <Label>Public Profile</Label>
                <Switch
                  checked={editData.isPublic}
                  onCheckedChange={(v) => setEditData({ ...editData, isPublic: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Trading Stats</Label>
                <Switch
                  checked={editData.showTradingStats}
                  onCheckedChange={(v) => setEditData({ ...editData, showTradingStats: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Portfolio</Label>
                <Switch
                  checked={editData.showPortfolio}
                  onCheckedChange={(v) => setEditData({ ...editData, showPortfolio: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow Followers</Label>
                <Switch
                  checked={editData.allowFollowers}
                  onCheckedChange={(v) => setEditData({ ...editData, allowFollowers: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
