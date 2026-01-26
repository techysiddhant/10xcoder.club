import { BookOpen, Video, GitFork, Star, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
const ResourcePreviewCard = () => {
  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-primary/10 rounded-2xl blur-2xl opacity-50" />

      <div className="relative space-y-4">
        {/* Resource Card */}
        <Card className="bg-card ring-1 ring-border/50 overflow-hidden hover:ring-primary/30 transition-all duration-300">
          <CardContent className="">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Video className="w-4 h-4 text-blue-500" />
                </div>
                <Badge variant="outline" className="text-xs">
                  Video
                </Badge>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">
              React Server Components Deep Dive
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Complete guide to RSC architecture, streaming, and data fetching patterns.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                React
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Advanced
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Template Card */}
        <Card className="bg-card ring-1 ring-border/50 overflow-hidden hover:ring-primary/30 transition-all duration-300">
          <CardContent className="">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <GitFork className="w-4 h-4 text-purple-500" />
                </div>
                <Badge variant="outline" className="text-xs">
                  Template
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                <span>2.4k</span>
              </div>
            </div>
            <h3 className="font-semibold mb-2 text-foreground">SaaS Starter Kit</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Next.js 14, Auth, Stripe, Prisma — ready to fork and ship.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Next.js
              </Badge>
              <Badge variant="secondary" className="text-xs">
                TypeScript
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Stripe
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Article Card (smaller) */}
        <Card className="bg-card ring-1 ring-border/50 overflow-hidden hover:ring-primary/30 transition-all duration-300">
          <CardContent className="">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate text-foreground">
                  System Design: Rate Limiting
                </h3>
                <p className="text-xs text-muted-foreground">Article · Intermediate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ResourcePreviewCard
