import '@/styles/glass.css';
import {
  TopNav,
  HeroStats,
  QuickActions,
  TodayProtocol,
  HealthSnapshot,
  AIInsightCard,
  DailyResearch,
  BottomTabBar,
} from '@/components/dashboard';

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-[#0d1225] to-[#141c35] text-white overflow-x-hidden pb-24">
      {/* Purple atmosphere glow — decorative only */}
      <div className="atmosphere-purple" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col">
        <TopNav />
        <HeroStats />
        <QuickActions />
        <TodayProtocol />
        <HealthSnapshot />
        <AIInsightCard />
        <DailyResearch />
      </div>

      <BottomTabBar />
    </div>
  );
}
