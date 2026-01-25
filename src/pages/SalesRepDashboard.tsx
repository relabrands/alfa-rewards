import { useState } from 'react';
import { SalesRepSidebar } from '@/components/salesrep/SalesRepSidebar';
import { SalesRepRegisterSection } from '@/components/salesrep/SalesRepRegisterSection';
import { SalesRepTeamSection } from '@/components/salesrep/SalesRepTeamSection';
import { SalesRepProfileSection } from '@/components/salesrep/SalesRepProfileSection';
import { SalesRepApprovals } from '@/components/salesrep/SalesRepApprovals';
import { SalesRepPharmacies } from '@/components/salesrep/SalesRepPharmacies';

export default function SalesRepDashboard() {
  const [activeSection, setActiveSection] = useState<'register' | 'team' | 'profile' | 'approvals' | 'pharmacies'>('approvals');

  return (
    <div className="min-h-screen bg-background flex">
      <SalesRepSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <main className="flex-1 p-6 overflow-auto">
        {activeSection === 'register' && <SalesRepRegisterSection />}
        {activeSection === 'team' && <SalesRepTeamSection />}
        {activeSection === 'pharmacies' && <SalesRepPharmacies />}
        {activeSection === 'profile' && <SalesRepProfileSection />}
        {activeSection === 'approvals' && <SalesRepApprovals />}
      </main>
    </div>
  );
}
