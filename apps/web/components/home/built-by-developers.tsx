import { Button } from "@workspace/ui/components/button";
import { Users, Heart } from "lucide-react";

const BuiltByDevelopers = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Heart className="w-7 h-7 text-primary" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-foreground">
            Built by developers,{" "}
            <span className="text-gradient">for developers.</span>
          </h2>

          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            This platform is shaped by developers who build real products — and
            want better starting points. No paywalls, no fluff, just quality
            resources.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-12 px-6 font-semibold gap-2">
              <Users className="w-4 h-4" />
              Join the Community
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 font-semibold"
            >
              Start Contributing
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BuiltByDevelopers;
