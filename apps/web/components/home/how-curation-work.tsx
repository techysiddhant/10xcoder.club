import { Send, Search, CheckCircle, Sparkles } from 'lucide-react'

const steps = [
  {
    icon: Send,
    title: 'Community Submits',
    description: "Developers submit resources or templates they've found valuable."
  },
  {
    icon: Search,
    title: 'Quality Review',
    description: 'Submissions are reviewed for quality, accuracy, and usefulness.'
  },
  {
    icon: CheckCircle,
    title: 'Selective Publishing',
    description: 'Only high-value, practical entries are published to the library.'
  },
  {
    icon: Sparkles,
    title: 'Continuous Evolution',
    description: 'The library grows and improves with community contributions.'
  }
]

const HowCurationWorks = () => {
  return (
    <section className="py-24">
      <div className="container px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
            How curation works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every resource is reviewed and selected to ensure you only get the best.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-px bg-border" />
                )}

                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 relative z-10">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowCurationWorks
