import { useState } from 'react';
import { SalesRepSidebar } from '@/components/salesrep/SalesRepSidebar';
import { SalesRepRegisterSection } from '@/components/salesrep/SalesRepRegisterSection';
import { SalesRepTeamSection } from '@/components/salesrep/SalesRepTeamSection';
import { SalesRepProfileSection } from '@/components/salesrep/SalesRepProfileSection';

export default function SalesRepDashboard() {
  const [activeSection, setActiveSection] = useState<'register' | 'team' | 'profile'>('register');

  return (
    <div className="min-h-screen bg-background flex">
      <SalesRepSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="flex-1 p-6 overflow-auto">
        {activeSection === 'register' && <SalesRepRegisterSection />}
        {activeSection === 'team' && <SalesRepTeamSection />}
        {activeSection === 'profile' && <SalesRepProfileSection />}
      </main>
    </div>
  );
}
