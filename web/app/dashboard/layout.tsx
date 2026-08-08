import { Sidebar } from "@/components/app/sidebar";
import { NetworkBanner } from "@/components/network-banner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <NetworkBanner />
        {children}
      </main>
    </div>
  );
}
