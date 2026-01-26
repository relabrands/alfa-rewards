import { useState } from 'react';
import { SalesRepSidebar } from '@/components/salesrep/SalesRepSidebar';
import { SalesRepStats } from '@/components/salesrep/SalesRepStats';
import { SalesRepTeamSection } from '@/components/salesrep/SalesRepTeamSection';
import { SalesRepPharmacies } from '@/components/salesrep/SalesRepPharmacies';
import { SalesRepFollowUp } from '@/components/salesrep/SalesRepFollowUp';
import { SalesRepPerformance } from '@/components/salesrep/SalesRepPerformance';
import { SalesRepCampaigns } from '@/components/salesrep/SalesRepCampaigns';

export type SalesRepSection = 'dashboard' | 'pharmacies' | 'team' | 'followup' | 'performance' | 'campaigns';

export default function SalesRepDashboard() {
  const [activeSection, setActiveSection] = useState<SalesRepSection>('dashboard');

  return (
    <div className="min-h-screen bg-background flex">
      <SalesRepSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <main className="flex-1 p-6 overflow-auto bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          {activeSection === 'dashboard' && <SalesRepStats />}
          {activeSection === 'pharmacies' && <SalesRepPharmacies />}
          {activeSection === 'team' && <SalesRepTeamSection />}
          {activeSection === 'followup' && <SalesRepFollowUp />}
          {activeSection === 'performance' && <SalesRepPerformance />}
          {activeSection === 'campaigns' && <SalesRepCampaigns />}
        </div>
      </main>
    </div>
  );
}
