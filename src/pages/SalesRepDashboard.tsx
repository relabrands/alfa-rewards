import { useState } from 'react';
import { SalesRepSidebar } from '@/components/salesrep/SalesRepSidebar';
import { SalesRepStats } from '@/components/salesrep/SalesRepStats';
import { SalesRepTeamSection } from '@/components/salesrep/SalesRepTeamSection';
import { SalesRepPharmacies } from '@/components/salesrep/SalesRepPharmacies';
import { SalesRepFollowUp } from '@/components/salesrep/SalesRepFollowUp';
import { SalesRepPerformance } from '@/components/salesrep/SalesRepPerformance';
import { SalesRepCampaigns } from '@/components/salesrep/SalesRepCampaigns';
import { SalesRepApprovals } from '@/components/salesrep/SalesRepApprovals';

export type SalesRepSection = 'dashboard' | 'pharmacies' | 'team' | 'followup' | 'performance' | 'campaigns' | 'approvals';

export default function SalesRepDashboard() {
  const [activeSection, setActiveSection] = useState<SalesRepSection>('dashboard');

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(210 20% 97%)' }}>
      <SalesRepSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {activeSection === 'dashboard' && <SalesRepStats />}
          {activeSection === 'approvals' && <SalesRepApprovals />}
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
