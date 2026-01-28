import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  BookOpen,
  Video,
  GitFork,
  Star,
  Clock,
  ExternalLink,
} from "lucide-react";

const resources = [
  {
    type: "video",
    icon: Video,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    title: "Building a Design System from Scratch",
    description:
      "Learn how to create scalable, reusable component libraries with proper theming.",
    tags: ["React", "CSS", "Architecture"],
    level: "Intermediate",
  },
  {
    type: "article",
    icon: BookOpen,
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
    title: "Database Indexing Explained",
    description:
      "Deep dive into B-trees, hash indexes, and query optimization strategies.",
    tags: ["Database", "Performance"],
    level: "Advanced",
  },
];

const templates = [
  {
    title: "Next.js SaaS Boilerplate",
    description:
      "Auth, payments, dashboard, emails — everything you need to launch.",
    stack: ["Next.js 14", "Prisma", "Stripe", "Tailwind"],
    stars: "3.2k",
    updated: "2 days ago",
  },
  {
    title: "Express API Starter",
    description:
      "REST API with auth, validation, rate limiting, and testing setup.",
    stack: ["Node.js", "Express", "PostgreSQL", "Jest"],
    stars: "1.8k",
    updated: "1 week ago",
  },
];

const ExamplePreview = () => {
  return (
    <section className="py-24">
      <div className="container px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
            See what's inside
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Real examples from our curated collection.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Resources Column */}
          <div>
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
              <BookOpen className="w-5 h-5 text-primary" />
              Learning Resources
            </h3>
            <div className="space-y-4">
              {resources.map((resource) => (
                <Card
                  key={resource.title}
                  className="border-border/50 hover:border-primary/30 transition-all duration-300 group cursor-pointer"
                >
                  <CardContent className="">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg ${resource.iconBg} flex items-center justify-center shrink-0`}
                      >
                        <resource.icon
                          className={`w-5 h-5 ${resource.iconColor}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {resource.title}
                          </h4>
                          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {resource.description}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {resource.level}
                          </Badge>
                          {resource.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Templates Column */}
          <div>
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
              <GitFork className="w-5 h-5 text-primary" />
              GitHub Templates
            </h3>
            <div className="space-y-4">
              {templates.map((template) => (
                <Card
                  key={template.title}
                  className="border-border/50 hover:border-primary/30 transition-all duration-300 group cursor-pointer"
                >
                  <CardContent className="">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {template.title}
                      </h4>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs shrink-0">
                        <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                        <span>{template.stars}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {template.stack.map((tech) => (
                          <Badge
                            key={tech}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {template.updated}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="font-semibold">
            Browse All Resources
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ExamplePreview;
