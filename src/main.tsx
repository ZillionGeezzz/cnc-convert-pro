import "@vly-ai/integrations";
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Converter = lazy(() => import("./pages/Converter.tsx"));
const Tools = lazy(() => import("./pages/Tools.tsx"));
const Machines = lazy(() => import("./pages/Machines.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

const CONVEX_URL_ENV_VAR = "VITE_CONVEX_URL";
const LOCAL_CONVEX_URL = "http://127.0.0.1:3210";

function normalizeConvexUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

const configuredConvexUrl = import.meta.env.VITE_CONVEX_URL?.trim();
const normalizedConvexUrl = normalizeConvexUrl(configuredConvexUrl);
const useLocalConvexFallback = !configuredConvexUrl && import.meta.env.DEV;
const activeConvexUrl =
  normalizedConvexUrl ?? (useLocalConvexFallback ? LOCAL_CONVEX_URL : null);

if (useLocalConvexFallback) {
  console.warn(
    `[config] ${CONVEX_URL_ENV_VAR} is not set; using a local Convex fallback in development. Auth and saved tools require a configured Convex deployment.`,
  );
} else if (!activeConvexUrl) {
  console.error(
    `[config] ${CONVEX_URL_ENV_VAR} is missing or invalid. Set it to an http(s) Convex deployment URL.`,
  );
}

const convex = activeConvexUrl
  ? new ConvexReactClient(
      activeConvexUrl,
      useLocalConvexFallback ? { logger: false } : undefined,
    )
  : null;

const configurationError = (
  <div className="min-h-screen flex items-center justify-center bg-background p-6 text-foreground">
    <div className="max-w-md space-y-3 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Configuration required
      </h1>
      <p className="text-sm text-muted-foreground">
        {CONVEX_URL_ENV_VAR} is missing or invalid. Set it to an http(s) Convex
        deployment URL and restart the app.
      </p>
    </div>
  </div>
);

const app = convex ? (
  <ConvexAuthProvider client={convex}>
    <BrowserRouter>
      <RouteSyncer />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/auth"
            element={<AuthPage redirectAfterAuth="/converter" />}
          />
          <Route path="/converter" element={<Converter />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/machines" element={<Machines />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    <Toaster />
  </ConvexAuthProvider>
) : (
  configurationError
);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>{app}</InstrumentationProvider>
  </StrictMode>,
);
