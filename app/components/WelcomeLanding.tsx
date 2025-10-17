'use client';

import { SignIn } from '@clerk/nextjs';
import { Shield, Sparkles, Leaf } from 'lucide-react';

export default function WelcomeLanding() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-emerald-50" />

      <div className="relative mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: copy + value props (calm, not competing) */}
          <section>
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-800">
              A gentle space for your thoughts 💭
            </h1>

            <p className="mt-4 text-slate-700 leading-relaxed max-w-xl hidden md:block">
              AI Therapist uses professional techniques—like thought records and gentle reframing—to help you notice patterns,
              feel understood, and take small steps forward.
            </p>

            <ul className="mt-8 space-y-4">
              <FeatureRow
                icon={<Shield className="w-5 h-5" />}
                title="Warm & private"
                text="Chats stay between you and AI therapist."
              />
              <FeatureRow
                icon={<Sparkles className="w-5 h-5" />}
                title="Professional tools"
                text="Thought records, gentle prompts, tiny goals."
              />
              <FeatureRow
                icon={<Leaf className="w-5 h-5" />}
                title="Come as you are"
                text="No pressure. One small step at a time."
              />
            </ul>

            <p className="mt-6 text-[12px] text-slate-500">
              AI Therapist is not a substitute for professional mental health care.
            </p>
          </section>

          {/* Right: embedded sign-in (primary action) */}
          <section className="lg:justify-self-end w-full max-w-md">
              <SignIn
                // Keep users on this page; Clerk renders tabs for Sign up / Sign in
                routing="hash"
                // Optional: if you have custom URLs set in env, skip these props
                // path="/sign-in"
                // appearance tweaks to make it feel native to your UI
                appearance={{
                  elements: {
                    formButtonPrimary: "bg-slate-900 hover:bg-slate-800 text-white",
                    headerTitle: "text-slate-800",
                    headerSubtitle: "text-slate-600",
                    card: "shadow-none",
                  },
                }}
              />
          </section>
        </div>
      </div>
    </main>
  );
}

function FeatureRow({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-1 shrink-0 rounded-lg bg-white/70 border border-slate-200 p-2">
        <span className="text-slate-600">{icon}</span>
      </div>
      <div>
        <div className="text-sm font-medium text-slate-800">{title}</div>
        <div className="text-[13px] text-slate-600">{text}</div>
      </div>
    </li>
  );
}
