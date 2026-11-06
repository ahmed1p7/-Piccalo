/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { HomeDashboard } from './components/HomeDashboard';
import { CassaView } from './components/CassaView';
import { MagazzinoView } from './components/MagazzinoView';
import { TavoliView } from './components/TavoliView';
import { CucinaMagazzinoView } from './components/CucinaMagazzinoView';
import { ReportView } from './components/ReportView';
import { GestioneUtentiView } from './components/GestioneUtentiView';

const MainAppContent: React.FC = () => {
  const { currentUser, activeView } = useApp();

  // If not logged in, show initial login screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 antialiased">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeView === 'home' && <HomeDashboard />}
        {activeView === 'cassa' && <CassaView />}
        {activeView === 'magazzino' && <MagazzinoView />}
        {activeView === 'tavoli' && <TavoliView />}
        {activeView === 'cucina' && <CucinaMagazzinoView />}
        {activeView === 'report' && <ReportView />}
        {activeView === 'utenti' && <GestioneUtentiView />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
