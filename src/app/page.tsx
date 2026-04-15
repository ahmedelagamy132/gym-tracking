import { DashboardClient } from './dashboard-client';

export const metadata = {
  title: 'OS / Control Panel',
  description: 'Complete Fitness & Nutrition OS',
};

export default function Page() {
  return (
    <main className="min-h-[100dvh] bg-[#f9fafb] text-zinc-950 font-sans antialiased">
      <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 pb-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium tracking-tight text-zinc-500 uppercase">System Status / Active</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter leading-none text-zinc-900">
              Operations Center.
            </h1>
          </div>
        </header>

        <DashboardClient />
      </div>
    </main>
  );
}
