import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonList } from '@/components/ui/skeleton-card';
import type { Resource } from '@shared/schema';
import {
  BookOpen,
  Video,
  FileText,
  ExternalLink,
  Search,
  Monitor,
  Cpu,
  Wifi,
  Shield,
  Settings,
  Award,
  Wrench,
  Play,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: BookOpen },
  { id: 'hardware', label: 'Hardware', icon: Cpu },
  { id: 'software', label: 'Software', icon: Monitor },
  { id: 'network', label: 'Network', icon: Wifi },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: Wrench },
  { id: 'best_practices', label: 'Best Practices', icon: Settings },
  { id: 'certifications', label: 'Certifications', icon: Award },
];

const CONTENT_TYPES = [
  { id: 'all', label: 'All Types' },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'article', label: 'Articles', icon: BookOpen },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'interactive', label: 'Interactive', icon: Play },
];

export function Resources() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch resources from the database
  const { data: resourcesData = [], isLoading, error } = useQuery<Resource[]>({
    queryKey: ['/api/resources'],
    enabled: !!user,
  });

  // Filter resources
  const filteredResources = useMemo(() => {
    let resources = resourcesData;

    // Filter by category
    if (activeCategory !== 'all') {
      resources = resources.filter((r) => r.category === activeCategory);
    }

    // Filter by content type
    if (contentTypeFilter !== 'all') {
      resources = resources.filter((r) => r.contentType === contentTypeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      resources = resources.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          (r.description && r.description.toLowerCase().includes(query))
      );
    }

    return resources;
  }, [resourcesData, activeCategory, contentTypeFilter, searchQuery]);

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'article':
        return <BookOpen className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'interactive':
        return <Play className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Resources</h2>
        <p className="text-muted-foreground">
          Browse learning materials organized by topic
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-resources"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CONTENT_TYPES.map((type) => (
            <Button
              key={type.id}
              variant={contentTypeFilter === type.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setContentTypeFilter(type.id)}
              data-testid={`filter-${type.id}`}
            >
              {type.icon && <type.icon className="w-4 h-4 mr-1" />}
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          {CATEGORIES.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="flex items-center gap-1"
              data-testid={`tab-${category.id}`}
            >
              <category.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{category.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-6">
            {isLoading ? (
              <SkeletonList count={6} />
            ) : error ? (
              <Card className="p-8 text-center">
                <p className="text-destructive mb-2">Error loading resources</p>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'Please try again later'}
                </p>
              </Card>
            ) : filteredResources.length === 0 ? (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No resources found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'Check back later for new content'}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredResources.map((resource) => (
                  <Card
                    key={resource.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    data-testid={`resource-card-${resource.id}`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                      {resource.thumbnailUrl ? (
                        <img
                          src={resource.thumbnailUrl}
                          alt={resource.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {getContentTypeIcon(resource.contentType || 'article')}
                          <span className="sr-only">{resource.contentType}</span>
                        </div>
                      )}
                      {resource.contentType === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/90 dark:bg-black/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 text-primary ml-0.5" />
                          </div>
                        </div>
                      )}
                      {resource.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {resource.duration}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-sm line-clamp-2">
                          {resource.title}
                        </h3>
                        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {resource.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {getContentTypeIcon(resource.contentType || 'article')}
                          <span className="ml-1">{resource.contentType}</span>
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {resource.description || 'No description available'}
                      </p>

                      {resource.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto mt-2 text-primary hover:text-primary/80"
                          onClick={() => window.open(resource.url ?? undefined, '_blank')}
                        >
                          View Resource
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Resource Count */}
      <div className="text-center text-sm text-muted-foreground">
        Showing {filteredResources.length} of {resourcesData.length} resources
      </div>
    </div>
  );
}
