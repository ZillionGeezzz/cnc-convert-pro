import { motion } from "framer-motion";
import { ArrowLeftRight, Wrench, Code, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";

const FEATURES = [
  {
    icon: ArrowLeftRight,
    title: "Real-time Conversion",
    desc: "Paste or type CNC code on one side, see the converted output instantly on the other. Supports Siemens 840D and Mitsubishi M80.",
  },
  {
    icon: Wrench,
    title: "Tool Library",
    desc: "Browse 20+ predefined tools with optimal parameters. Click any tool to generate a complete program with your chosen feeds, speeds, and depths.",
  },
  {
    icon: Code,
    title: "Cycle Translation",
    desc: "Siemens cycles (CYCLE81–CYCLE89) automatically map to Mitsubishi fixed cycles (G81–G89) and vice versa.",
  },
];

const CONTROLLER_PAIRS = [
  { from: "Siemens 840D", to: "Mitsubishi M80" },
  { from: "Mitsubishi M80", to: "Siemens 840D" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      {/* Minimal nav */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="text-foreground"
            >
              <rect x="1" y="1" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 10h10M10 5v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="10" r="2" fill="currentColor" />
            </svg>
            CNC Transpiler
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(isAuthenticated ? "/converter" : "/auth")}
              className="text-xs h-8"
            >
              Get Started
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-[11px] text-muted-foreground mb-6 tracking-wider uppercase">
              CNC Program Transpiler
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground leading-tight tracking-tight">
              Convert CNC programs
              <br />
              <span className="font-medium">between controllers</span>
            </h1>
            <p className="mt-5 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              A real-time converter for Siemens SINUMERIK 840D and Mitsubishi M80
              formats. Paste your code, choose your target, and get instant results.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                onClick={() => navigate("/converter")}
                className="h-9 px-5 text-sm"
              >
                Open Converter
                <ArrowLeftRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/tools")}
                className="h-9 px-5 text-sm"
              >
                Browse Tools
                <Wrench className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Format pairs */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground"
          >
            {CONTROLLER_PAIRS.map((pair, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 border border-border rounded-md">
                <span className="font-mono text-foreground/80">{pair.from}</span>
                <ArrowLeftRight className="w-3 h-3" />
                <span className="font-mono text-foreground/80">{pair.to}</span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="border border-border rounded-lg p-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                    <Icon className="w-4 h-4 text-foreground/70" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-2">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            CNC Transpiler
          </span>
          <span className="text-[11px] text-muted-foreground">
            Siemens SINUMERIK &amp; Mitsubishi M80
          </span>
        </div>
      </footer>
    </div>
  );
}
