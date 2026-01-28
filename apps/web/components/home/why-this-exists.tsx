import { XCircle, CheckCircle2 } from "lucide-react";

const problems = [
  "Developers waste hours finding good resources",
  "GitHub is full of unfinished or outdated templates",
  "Tutorials are scattered and inconsistent",
  "Quality varies wildly across sources",
];

const solutions = [
  "Centralized, trusted learning material",
  "Vetted, production-ready starter templates",
  "Consistent quality across all resources",
  "100% free and community-driven",
];

const WhyThisExists = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Why this platform exists
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We built what we wished existed when we started.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Problems */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground mb-6 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              The Problem
            </h3>
            {problems.map((problem, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/10"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                <span className="text-muted-foreground text-sm">{problem}</span>
              </div>
            ))}
          </div>

          {/* Solutions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Our Solution
            </h3>
            {solutions.map((solution, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span className="text-sm text-foreground">{solution}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyThisExists;
