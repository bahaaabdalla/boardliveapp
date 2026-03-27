import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Mic,
  PenTool,
  Presentation,
  Share2,
  ArrowRight,
  Zap,
  Shield,
  Smartphone,
} from "lucide-react";

import { createSession } from "./actions";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            LiveBoard
          </Link>
          <div className="flex items-center gap-3">
            <form action={createSession}>
              <Button size="sm" type="submit">
                Create Session
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
          </div>
        </div>
      </header>


      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

          <div className="container relative mx-auto px-4 py-24 md:py-32 lg:py-40">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Live teaching, reimagined
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Teach, Present &{" "}
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  Collaborate
                </span>{" "}
                in Real Time
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Create live sessions with a professional whiteboard, slide
                presentations, and crystal-clear audio. Share a link and start
                teaching instantly.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <form action={createSession}>
                  <Button size="lg" className="text-base px-8" type="submit">
                    Start Free Session
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30">
          <div className="container mx-auto px-4 py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Everything you need to teach live
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                A focused, distraction-free platform designed for educators,
                trainers, and presenters.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <FeatureCard
                icon={<PenTool className="h-5 w-5" />}
                title="Live Whiteboard"
                description="Draw, annotate, and explain with a powerful real-time collaborative whiteboard."
              />
              <FeatureCard
                icon={<Presentation className="h-5 w-5" />}
                title="Presentations"
                description="Upload PDFs or create slides. Navigate and annotate live with your audience."
              />
              <FeatureCard
                icon={<Mic className="h-5 w-5" />}
                title="Live Audio"
                description="Crystal-clear voice narration. Speak to your audience in real time."
              />
              <FeatureCard
                icon={<Share2 className="h-5 w-5" />}
                title="One-Click Share"
                description="Share a session link. Attendees join instantly in their browser."
              />
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-t">
          <div className="container mx-auto px-4 py-24">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <BenefitCard
                icon={<Smartphone className="h-5 w-5" />}
                title="Works Everywhere"
                description="Fully responsive. Attendees can join from any device with a browser."
              />
              <BenefitCard
                icon={<Shield className="h-5 w-5" />}
                title="Secure & Private"
                description="Host-controlled sessions with viewer-only permissions for attendees."
              />
              <BenefitCard
                icon={<Zap className="h-5 w-5" />}
                title="Instant Setup"
                description="Create a session in seconds. No installs, no plugins, no complexity."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                <Zap className="h-3 w-3 text-primary-foreground" />
              </div>
              LiveBoard — Live Teaching Platform
            </div>
            <p className="text-sm text-muted-foreground">
              Built for educators, by educators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative rounded-xl border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center space-y-3">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
