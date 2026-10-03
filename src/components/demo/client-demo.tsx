"use client";

import dynamic from "next/dynamic";

export const ClientDemo = dynamic(() => import("./demo-app").then((m) => m.DemoApp), {
  ssr: false,
  loading: () => <div className="min-h-dvh bg-slate-950" />,
});
