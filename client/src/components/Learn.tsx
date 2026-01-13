import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Challenge, Resource, User } from '@shared/schema';
import {
  Trophy,
  Star,
  Target,
  Users,
  BookOpen,
  Video,
  ExternalLink,
  Play,
  Calendar as CalendarIcon,
  Award,
  TrendingUp,
  Lightbulb,
  Zap,
  Rocket,
  Sparkles,
  Flame,
  FileText
} from 'lucide-react';

export function Learn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('challenges');
  const [showLogWork, setShowLogWork] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedChallenge, setSelectedChallenge] = useState<{
    id: string;
    title: string;
    description: string;
    participants: number;
    daysLeft: number;
    progress: number;
    category: string | null;
    difficulty: string;
    reward: string;
    isCompleted?: boolean;
  } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [resourceFilter, setResourceFilter] = useState('all');

  // Fetch challenges from the database
  const { data: challengesData = [], isLoading: challengesLoading, error: challengesError } = useQuery<Challenge[]>({
    queryKey: ['/api/student/challenges'],
    enabled: !!user,
  });

  // Fetch rankings from the database
  const { data: rankingsData = [], isLoading: rankingsLoading, error: rankingsError } = useQuery<Array<User & { rank: number }>>({
    queryKey: ['/api/student/rankings'],
    enabled: !!user,
  });

  // Fetch resources from the database
  const { data: resourcesData = [], isLoading: resourcesLoading, error: resourcesError } = useQuery<Resource[]>({
    queryKey: ['/api/resources'],
    enabled: !!user,
  });

  // Transform challenges data
  const challenges = challengesData.map((challenge: any) => ({
    id: challenge.id,
    title: challenge.title,
    description: challenge.description ?? '',
    participants: challenge.participants ?? 0,
    daysLeft: challenge.daysToComplete ?? 0,
    progress: challenge.isCompleted ? 100 : 0,
    category: challenge.category,
    difficulty: challenge.difficulty,
    reward: `${challenge.points} pts`,
    isCompleted: challenge.isCompleted ?? false,
  }));

  // Icon components for rankings
  const rankingIcons = [Target, Zap, Rocket, Sparkles, Flame];

  // Transform rankings data
  const rankings = rankingsData.map((ranking, index: number) => {
    const IconComponent = rankingIcons[index % rankingIcons.length];
    return {
      rank: ranking.rank,
      name: ranking.isCurrentUser ? `You (${ranking.name})` : ranking.name,
      points: ranking.points,
      icon: IconComponent,
      streak: ranking.streak,
      isCurrentUser: ranking.isCurrentUser,
    };
  });

  // Transform resources data - use all fields from the API
  const resources = resourcesData;

  // Static recommended resources - curated docs and videos
  const recommendedResources = [
    {
      id: 'doc-1',
      title: 'NL72 Self-service Manual w/LTE section',
      url: 'https://docs.google.com/document/d/11OyhymvihbQsrWVTvJrab8670k96mTGPO3jkzU-VQdA/edit?tab=t.0#heading=h.1m95omm6or9l',
      contentType: 'document' as const,
    },
    {
      id: 'video-1',
      title: 'Hinge Repair for J5 CTL Chromebook',
      url: 'https://www.youtube.com/watch?v=9cjx0r2cijY',
      contentType: 'video' as const,
    },
    {
      id: 'video-2',
      title: 'How To Fix Replace Keyboard Key - HP Chromebook 11 Letter Number Arrow',
      url: 'https://www.youtube.com/watch?v=FplP-E_kUeE',
      contentType: 'video' as const,
    },
    {
      id: 'video-3',
      title: 'Laptop screen replacement How to replace laptop screen CTL NL7',
      url: 'https://www.youtube.com/watch?v=nNtjMfHaniE',
      contentType: 'video' as const,
    },
    {
      id: 'video-4',
      title: 'iPad Pro: How to Find IMEI Number (2 Ways)',
      url: 'https://www.youtube.com/watch?v=ncLRG2K12AA',
      contentType: 'video' as const,
    },
    {
      id: 'video-5',
      title: 'How to Fix iPad Black Screen of Death',
      url: 'https://www.youtube.com/watch?v=PxNKgsBmCIw&t=70s',
      contentType: 'video' as const,
      duration: '9:14',
    },
  ];

  // Filter resources by content type
  const filteredResources = useMemo(() => {
    if (resourceFilter === 'all') return resources;
    return resources.filter(r => r.contentType === resourceFilter);
  }, [resources, resourceFilter]);

  // Handle challenge completion
  const handleCompleteChallenge = async () => {
    if (!selectedChallenge) return;
    setIsCompleting(true);
    try {
      await apiRequest('POST', `/api/student/challenges/${selectedChallenge.id}/complete`, {});
      queryClient.invalidateQueries({ queryKey: ['/api/student/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/rankings'] });
      toast({
        title: 'Challenge Completed!',
        description: `You earned ${selectedChallenge.reward}!`,
      });
      setSelectedChallenge(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete challenge',
        variant: 'destructive',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2>Learn & Grow</h2>
        <p className="text-slate-600">Build skills and track progress</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="log">Log Work</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* CHALLENGES TAB */}
        <TabsContent value="challenges" className="space-y-4 mt-4">
          {/* Active Challenges */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3>Active Challenges</h3>
              <Badge className="bg-blue-100 text-blue-700">
                {challengesLoading ? 'Loading...' : `${challenges.length} Available`}
              </Badge>
            </div>
            <div className="space-y-2">
              {challengesLoading ? (
                <div className="text-center py-8 text-slate-500">
                  Loading challenges...
                </div>
              ) : challengesError ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-2">Error loading challenges</p>
                  <p className="text-sm text-slate-400">
                    {challengesError instanceof Error ? challengesError.message : 'Failed to load challenges. Please try again.'}
                  </p>
                </div>
              ) : challenges.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-2">No active challenges</p>
                  <p className="text-sm text-slate-400">
                    Check back later for new learning opportunities
                  </p>
                </div>
              ) : (
                challenges.map((challenge) => (
                  <Card
                    key={challenge.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    data-testid={`card-challenge-${challenge.id}`}
                    onClick={() => setSelectedChallenge(challenge)}
                  >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Target className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h4 className="text-sm">{challenge.title}</h4>
                          <p className="text-xs text-slate-600">{challenge.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {challenge.reward}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                        <Users className="w-3 h-3" />
                        <span>{challenge.participants} joined</span>
                        <span>•</span>
                        <span>{challenge.daysLeft} days left</span>
                      </div>
                      <div className="mt-2">
                        <Progress value={challenge.progress} className="h-2" />
                        <p className="text-xs text-slate-600 mt-1">{challenge.progress}% complete</p>
                      </div>
                    </div>
                  </div>
                </Card>
                ))
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="mb-3">Recommended for You</h3>
            <div className="space-y-2">
              {recommendedResources.map((rec) => (
                <Card key={rec.id} className="p-3">
                  <a
                    href={rec.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${rec.contentType === 'video' ? 'bg-red-50' : 'bg-blue-50'}`}>
                        {rec.contentType === 'video' ? (
                          <Video className="w-4 h-4 text-red-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm">{rec.title}</h4>
                          <Badge variant="secondary" className="text-xs">{rec.contentType}</Badge>
                        </div>
                        {rec.duration && <p className="text-xs text-slate-400 mt-1">{rec.duration}</p>}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* LOG WORK TAB */}
        <TabsContent value="log" className="space-y-4 mt-4">
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-green-600" />
              <h3>Challenge-Based Tracking</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Self-device reporting/battery test—reporting format
            </p>
            <Button onClick={() => setShowLogWork(true)} className="w-full">
              Log Today's Work
            </Button>
          </Card>

          {/* Calendar View */}
          <Card className="p-4">
            <h3 className="mb-3">Activity Calendar</h3>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md"
            />
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Work logged</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Challenge day</span>
              </div>
            </div>
          </Card>

          {/* Recent Logs */}
          <div>
            <h3 className="mb-3">Recent Work Logs</h3>
            <div className="space-y-2">
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Device Checks</span>
                  <Badge className="bg-green-100 text-green-700">Today</Badge>
                </div>
                <p className="text-xs text-slate-600">Completed 5 device diagnostics</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Repair Work</span>
                  <Badge className="bg-blue-100 text-blue-700">Yesterday</Badge>
                </div>
                <p className="text-xs text-slate-600">Fixed 2 Chromebook screens</p>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* RANKINGS TAB */}
        <TabsContent value="rankings" className="space-y-4 mt-4">
          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-600" />
                <div>
                  <div className="text-yellow-900">Your Rank: #3</div>
                  <p className="text-sm text-yellow-700">2,420 points</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-1">
                <div className="text-sm text-yellow-700">8 day streak</div>
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
            </div>
          </Card>

          <div>
            <h3 className="mb-3">Leaderboard</h3>
            <div className="space-y-2">
              {rankingsLoading ? (
                <div className="text-center py-8 text-slate-500">
                  Loading rankings...
                </div>
              ) : rankingsError ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-2">Error loading rankings</p>
                  <p className="text-sm text-slate-400">
                    {rankingsError instanceof Error ? rankingsError.message : 'Failed to load rankings. Please try again.'}
                  </p>
                </div>
              ) : rankings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-2">No rankings available</p>
                  <p className="text-sm text-slate-400">
                    Complete challenges to earn points and rank up
                  </p>
                </div>
              ) : (
                rankings.map((user) => (
                  <Card
                    key={user.rank}
                    className={`p-3 ${user.isCurrentUser ? 'bg-blue-50 border-blue-200' : ''}`}
                    data-testid={`card-ranking-${user.rank}`}
                  >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        user.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        user.rank === 2 ? 'bg-slate-100 text-slate-700' :
                        user.rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-50 text-slate-700'
                      }`}>
                        {user.rank <= 3 ? (
                          <Trophy className="w-4 h-4" />
                        ) : (
                          user.rank
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <user.icon className="w-3 h-3 text-slate-600" />
                          <span className="text-sm">{user.name}</span>
                          {user.isCurrentUser && (
                            <Badge className="bg-blue-600 text-white text-xs">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <span>{user.streak} day streak</span>
                          <Flame className="w-3 h-3 text-orange-500" />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{user.points.toLocaleString()}</div>
                      <p className="text-xs text-slate-600">points</p>
                    </div>
                  </div>
                </Card>
                ))
              )}
            </div>
          </div>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-purple-600" />
              <h3>Get Certified</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Complete challenges to earn certifications and upskill
            </p>
            <Button className="w-full" variant="outline">
              View Available Certifications
            </Button>
          </Card>
        </TabsContent>

        {/* RESOURCES TAB */}
        <TabsContent value="resources" className="space-y-4 mt-4">
          <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h3>Curated Resources</h3>
            </div>
            <p className="text-sm text-slate-600">
              Searchable resources organized by topic and scenario
            </p>
          </Card>

          {/* Content Type Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={resourceFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setResourceFilter('all')}
            >
              All
            </Button>
            <Button
              variant={resourceFilter === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setResourceFilter('video')}
            >
              <Video className="w-4 h-4 mr-1" /> Videos
            </Button>
            <Button
              variant={resourceFilter === 'article' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setResourceFilter('article')}
            >
              <BookOpen className="w-4 h-4 mr-1" /> Articles
            </Button>
            <Button
              variant={resourceFilter === 'document' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setResourceFilter('document')}
            >
              <ExternalLink className="w-4 h-4 mr-1" /> Documents
            </Button>
            <Button
              variant={resourceFilter === 'interactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setResourceFilter('interactive')}
            >
              <Star className="w-4 h-4 mr-1" /> Interactive
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="mb-3">
              {resourceFilter === 'all' ? 'All Resources' : `${resourceFilter.charAt(0).toUpperCase() + resourceFilter.slice(1)}s`}
              <span className="text-sm text-slate-500 font-normal ml-2">({filteredResources.length})</span>
            </h3>
            {filteredResources.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-2">No {resourceFilter} resources found</p>
                <p className="text-sm text-slate-400">Try selecting a different content type</p>
              </div>
            ) : (
              filteredResources.map((resource, index) => (
                <Card key={index} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm">{resource.title}</h4>
                        <Badge variant="secondary" className="text-xs">{resource.category}</Badge>
                        <Badge className="text-xs bg-slate-100 text-slate-600">{resource.contentType}</Badge>
                      </div>
                      <p className="text-xs text-slate-600">{resource.description}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 ml-2" />
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Topics/Scenarios */}
          <div>
            <h3 className="mb-3">Browse by Topic</h3>
            <div className="grid grid-cols-2 gap-2">
              {['Hardware', 'Software', 'Network', 'Security', 'Troubleshooting', 'Best Practices'].map((topic) => (
                <Button key={topic} variant="outline" className="justify-start">
                  {topic}
                </Button>
              ))}
            </div>
          </div>

          {/* Try Now / Required Materials Box */}
          <Card className="p-4 border-2 border-dashed border-blue-300 bg-blue-50">
            <h3 className="mb-2">Get Started</h3>
            <p className="text-sm text-slate-600 mb-3">
              Resources are organized with "Try Now" scenarios and required materials boxes to support hands-on learning
            </p>
            <Button className="w-full">Explore Interactive Scenarios</Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Work Dialog */}
      <Dialog open={showLogWork} onOpenChange={setShowLogWork}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Your Work</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm">What did you work on today?</label>
              <Textarea
                placeholder="e.g., Completed device checks, fixed screen issues..."
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm">Hours worked</label>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
                placeholder="0.5"
                step="0.5"
              />
            </div>

            <div>
              <label className="text-sm">Category</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {['Device Checks', 'Repairs', 'Learning', 'Other'].map((cat) => (
                  <Button key={cat} variant="outline" size="sm">
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogWork(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowLogWork(false)}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Challenge Detail Dialog */}
      <Dialog open={!!selectedChallenge} onOpenChange={() => setSelectedChallenge(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedChallenge?.title}</DialogTitle>
            <div className="flex gap-2 mt-2">
              <Badge className={
                selectedChallenge?.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                selectedChallenge?.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }>
                {selectedChallenge?.difficulty}
              </Badge>
              <Badge variant="secondary">{selectedChallenge?.reward}</Badge>
              {selectedChallenge?.isCompleted && (
                <Badge className="bg-green-600 text-white">Completed</Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-1">Description</h3>
              <p className="text-sm text-slate-600">{selectedChallenge?.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Category</p>
                <p className="font-medium capitalize">{selectedChallenge?.category}</p>
              </div>
              <div>
                <p className="text-slate-500">Points</p>
                <p className="font-medium">{selectedChallenge?.reward}</p>
              </div>
              <div>
                <p className="text-slate-500">Participants</p>
                <p className="font-medium">{selectedChallenge?.participants} joined</p>
              </div>
              <div>
                <p className="text-slate-500">Time Remaining</p>
                <p className="font-medium">{selectedChallenge?.daysLeft} days left</p>
              </div>
            </div>

            {selectedChallenge?.isCompleted && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium">
                  You've already completed this challenge!
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedChallenge(null)}>
              Close
            </Button>
            {!selectedChallenge?.isCompleted && (
              <Button onClick={handleCompleteChallenge} disabled={isCompleting}>
                {isCompleting ? 'Completing...' : 'Mark Complete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
