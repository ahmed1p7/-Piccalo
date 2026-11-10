/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { UpdateNotification } from './components/UpdateNotification';

const MainAppContent: React.FC = () => {
  const { currentUser, activeView } = useApp();
  const [showUpdateNotification, setShowUpdateNotification] = useState(true);

  // Se non si è loggati: schermata di login + notifica aggiornamenti
  // (l'avviso di aggiornamento deve comparire anche senza login)
  if (!currentUser) {
    return (
      <>
        <LoginScreen />
        {showUpdateNotification && (
          <UpdateNotification onClose={() => setShowUpdateNotification(false)} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-neutral-200 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950 antialiased">
      {/* 🔄 إشعار التحديث التلقائي */}
      {showUpdateNotification && (
        <UpdateNotification onClose={() => setShowUpdateNotification(false)} />
      )}

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
