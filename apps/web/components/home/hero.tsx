import { Button } from "@workspace/ui/components/button";
import { ArrowRight, Plus } from "lucide-react";
import ResourcePreviewCard from "./resource-preview-card";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-dot-pattern opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto relative z-10 px-6 py-20">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="opacity-0 animate-fade-up">
            <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
              Free & Community-Driven
            </p>
          </div>

          <h1 className="opacity-0 animate-fade-up delay-1 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-foreground">
            Learn. Build. <span className="text-gradient">Ship Faster.</span>
          </h1>

          <p className="opacity-0 animate-fade-up delay-2 text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl">
            A free, community-curated hub of high-quality learning resources and
            production-ready GitHub templates — reviewed, selected, and trusted
            by developers.
          </p>

          <div className="opacity-0 animate-fade-up delay-3 flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="h-12 px-6 font-semibold gap-2">
              Explore Resources
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 font-semibold gap-2 group"
            >
              <Plus className="w-4 h-4" />
              Contribute
            </Button>
          </div>

          <div className="opacity-0 animate-fade-up delay-4 mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              100% Free
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Community Curated
            </div>
          </div>
        </div>

        {/* Preview Cards - Below Hero */}
        <div className="opacity-0 animate-fade-up delay-4 mt-16 lg:mt-20">
          <ResourcePreviewCard />
        </div>
      </div>
    </section>
  );
};

export default Hero;
