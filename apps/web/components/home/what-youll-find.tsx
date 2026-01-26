import { Card, CardContent } from '@workspace/ui/components/card'
import { BookOpen, GitFork, CheckCircle2 } from 'lucide-react'

const sections = [
  {
    icon: BookOpen,
    title: 'Curated Learning Resources',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    items: [
      'Frontend, backend, system design, tooling',
      'Articles, videos, docs',
      'Only high-quality, practical content',
      'No duplicates, no noise'
    ]
  },
  {
    icon: GitFork,
    title: 'Production-Ready Templates',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    items: [
      'Starter kits for real products',
      'Clean structure, best practices',
      'Ready to fork and ship',
      'Maintained by the community'
    ]
  }
]

const WhatYoullFind = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
            What you'll find on <span className="text-gradient">10xcoder.club</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to learn faster and build better — curated, organized, and free.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {sections.map((section) => (
            <Card
              key={section.title}
              className="ring-border/50 bg-card/50 backdrop-blur-sm hover:ring-primary/30 transition-all duration-300 group"
            >
              <CardContent className="p-8">
                <div
                  className={`w-12 h-12 rounded-xl ${section.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                >
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-4 text-foreground">{section.title}</h3>
                <ul className="space-y-3">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default WhatYoullFind
