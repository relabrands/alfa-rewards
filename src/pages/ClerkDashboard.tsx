import { useState } from 'react';
import { ClerkBottomNav } from '@/components/clerk/ClerkBottomNav';
import { ClerkHomeTab } from '@/components/clerk/ClerkHomeTab';
import { ClerkRewardsTab } from '@/components/clerk/ClerkRewardsTab';
import { ClerkProfileTab } from '@/components/clerk/ClerkProfileTab';

export default function ClerkDashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'rewards' | 'profile'>('home');

  return (
    <div className="min-h-screen bg-background">
      {activeTab === 'home' && <ClerkHomeTab />}
      {activeTab === 'rewards' && <ClerkRewardsTab />}
      {activeTab === 'profile' && <ClerkProfileTab />}
      
      <ClerkBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
