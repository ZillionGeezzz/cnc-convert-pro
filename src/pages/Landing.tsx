import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeftRight,
  Wrench,
  Code,
  ChevronRight,
  Shield,
  Cpu,
  Gauge,
  ArrowRight,
  Monitor,
  FileCode,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CONTROLLERS } from "@/lib/cnc/types";
import { useRef } from "react";

const FEATURES = [
  {
    icon: ArrowLeftRight,
    title: "Real-time Conversion",
    desc: "Paste or type CNC code on one side, see the converted output instantly. Supports all 15 major controller formats from Fanuc to Heidenhain.",
    gradient: "from-blue-500/10 to-cyan-500/10",
  },
  {
    icon: Wrench,
    title: "Tool Library",
    desc: "Browse 64+ predefined tools across 26 tool types. Click any tool to generate a complete program with optimal feeds, speeds, and depths.",
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  {
    icon: Code,
    title: "Smart Cycle Translation",
    desc: "Siemens cycles (CYCLE81-CYCLE89), Heidenhain CYCL DEF, and Fanuc fixed cycles (G81-G89) automatically map between formats.",
    gradient: "from-violet-500/10 to-purple-500/10",
  },
  {
    icon: Monitor,
    title: "Syntax Highlighting",
    desc: "Real-time G-code syntax highlighting with color-coded tokens for G-codes, M-codes, axes, feeds, speeds, parameters, and cycles.",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
  {
    icon: Shield,
    title: "Insert Database",
    desc: "ISO 1832 insert database with 30+ common turning, milling, threading, and grooving inserts from Sandvik, Iscar, Kennametal, and more.",
    gradient: "from-rose-500/10 to-pink-500/10",
  },
  {
    icon: Gauge,
    title: "Cutting Data Calculator",
    desc: "Built-in SFM-to-RPM calculator, feed rate optimizer, and material-specific cutting data for aluminum, steel, titanium, inconel, and more.",
    gradient: "from-sky-500/10 to-indigo-500/10",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const totalControllers = CONTROLLERS.length;
  const activeConversions = CONTROLLERS.length * (CONTROLLERS.length - 1);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Nav */}
      <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5 text-sm font-medium text-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                className="text-emerald-400"
              >
                <rect
                  x="1"
                  y="1"
                  width="18"
                  height="18"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M5 10h10M10 5v10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="10" cy="10" r="2" fill="currentColor" />
              </svg>
            </div>
            <span>CNC Transpiler</span>
            <Badge
              variant="outline"
              className="ml-1.5 text-[10px] border-zinc-700 text-zinc-500 font-mono"
            >
              v2.0
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-xs text-zinc-400 hover:text-zinc-100"
            >
              Sign in
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(isAuthenticated ? "/converter" : "/auth")}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Get Started
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <Separator className="relative z-20 bg-zinc-800" />

      {/* Hero */}
      <main className="flex-1 relative z-10">
        <motion.section
          ref={targetRef}
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative pt-24 pb-16 overflow-hidden"
        >
          {/* Glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-4xl mx-auto text-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-zinc-700/50 bg-zinc-800/30 text-[11px] text-zinc-400 mb-8 tracking-wider uppercase backdrop-blur-sm"
              >
                <Cpu className="w-3 h-3 text-emerald-400" />
                CNC Program Transpiler Engine
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="text-4xl sm:text-5xl lg:text-7xl font-light text-zinc-100 leading-[1.1] tracking-tight"
              >
                Convert CNC programs
                <br />{" "}
                <span className="font-semibold bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 text-transparent bg-clip-text">
                  across all controllers
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="mt-6 text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed"
              >
                A real-time converter supporting{" "}
                <span className="text-zinc-200 font-medium">
                  {totalControllers} controller formats
                </span>{" "}
                from Fanuc, Siemens, Heidenhain, Mazak, Okuma, Mitsubishi, Haas,
                Brother, Fagor, and Bosch. Paste your code, choose your target,
                get instant results.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="mt-10 flex items-center justify-center gap-4 flex-wrap"
              >
                <Button
                  onClick={() => navigate("/converter")}
                  className="h-11 px-6 text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                >
                  Open Converter
                  <ArrowLeftRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/tools")}
                  className="h-11 px-6 text-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  Browse Tool Library
                  <Wrench className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="mt-16 flex items-center justify-center gap-8 sm:gap-16"
              >
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-semibold text-zinc-100">
                    {totalControllers}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Controllers</div>
                </div>
                <div className="w-px h-10 bg-zinc-800" />
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-semibold text-zinc-100">
                    {activeConversions.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Conversion Paths
                  </div>
                </div>
                <div className="w-px h-10 bg-zinc-800" />
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-semibold text-zinc-100">
                    64
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Tools</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* Controller grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-10">
              <h2 className="text-lg font-medium text-zinc-100">
                Supported Controllers
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                All {totalControllers} formats across 10 manufacturer families
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {CONTROLLERS.map((c, index) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.03 * index }}
                  className="group relative border border-zinc-800 rounded-lg p-4 hover:bg-zinc-900/50 transition-all cursor-default"
                >
                  <div
                    className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(600px circle at 50% 50%, ${c.color}08, transparent 60%)`,
                    }}
                  />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                        {c.manufacturer}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-zinc-200">
                      {c.name}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-zinc-700/50 text-zinc-500 font-mono"
                      >
                        {c.format}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="border-t border-zinc-800/50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-lg font-medium text-zinc-100">
                Everything you need for CNC programming
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                From conversion to tool selection to cutting data
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.05 * index }}
                    className="group relative border border-zinc-800 rounded-xl p-6 hover:bg-zinc-900/50 transition-all"
                  >
                    <div
                      className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    <div className="relative z-10">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center mb-4 group-hover:border-zinc-600/50 transition-colors">
                        <Icon className="w-5 h-5 text-zinc-300 group-hover:text-zinc-100 transition-colors" />
                      </div>
                      <h3 className="text-sm font-medium text-zinc-200 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="relative border border-zinc-800 rounded-2xl p-10 sm:p-14 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px]" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-light text-zinc-100">
                Ready to streamline your workflows?
              </h2>
              <p className="mt-4 text-sm text-zinc-500 max-w-lg mx-auto">
                Start converting CNC programs between any of the{" "}
                {totalControllers} supported controller formats. No signup
                required to try the converter.
              </p>
              <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
                <Button
                  onClick={() => navigate("/converter")}
                  className="h-11 px-6 text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                >
                  Launch Converter
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/tools")}
                  className="h-11 px-6 text-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  Explore Tools
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <FileCode className="w-3.5 h-3.5" />
            CNC Transpiler
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <span className="hidden sm:inline">
              {totalControllers} controllers /{" "}
              {activeConversions.toLocaleString()} paths
            </span>
            <span>v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
