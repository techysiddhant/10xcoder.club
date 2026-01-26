import { Button } from '@workspace/ui/components/button'
import { ArrowRight, Plus } from 'lucide-react'

const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[400px] bg-primary/10 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="container relative z-10 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6 text-foreground">
            Stop searching. <span className="text-gradient">Start building.</span>
          </h2>

          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            Access curated resources and production-ready templates — all in one place, completely
            free.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 px-8 text-base font-semibold gap-2 glow">
              Explore the Library
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-8 text-base font-semibold gap-2">
              <Plus className="w-4 h-4" />
              Submit a Resource
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Free forever · Community-driven · No sign-up required to browse
          </p>
        </div>
      </div>
    </section>
  )
}

export default CTA
