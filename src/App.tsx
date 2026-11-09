/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginScreen } from './components/LoginScreen';
import { SetupScreen } from './components/SetupScreen';
import { Navbar } from './components/Navbar';
import { HomeDashboard } from './components/HomeDashboard';
import { CassaView } from './components/CassaView';
import { MagazzinoView } from './components/MagazzinoView';
import { TavoliView } from './components/TavoliView';
import { CucinaMagazzinoView } from './components/CucinaMagazzinoView';
import { ReportView } from './components/ReportView';
import { GestioneUtentiView } from './components/GestioneUtentiView';
import { ImpostazioniView } from './components/ImpostazioniView';
import { UpdateNotification } from './components/UpdateNotification';
import { Waves } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, activeView, needsSetup, bootstrapDone, skipBootstrap } = useApp();
  const [showUpdateNotification, setShowUpdateNotification] = useState(true);
  const [canSkip, setCanSkip] = useState(false);

  // dopo 2,5 secondi offersi di proseguire anche senza cloud
  useEffect(() => {
    if (bootstrapDone) return;
    const t = setTimeout(() => setCanSkip(true), 2500);
    return () => clearTimeout(t);
  }, [bootstrapDone]);

  // 🔄 Avvio: l'app si collega da sola al ristorante e adotta i dati
  //    (utenti, tavoli, magazzino, scontrini) senza nessuna operazione.
  if (!bootstrapDone) {
    return (
      <div className="min-h-screen bg-ink-950 text-mist-100 flex flex-col items-center justify-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-300 flex items-center justify-center animate-pulse">
          <Waves className="w-7 h-7" />
        </div>
        <p className="text-xs text-mist-500 tracking-wide">
          Connessione al ristorante…
        </p>
        {canSkip && (
          <button
            onClick={skipBootstrap}
            className="text-[11px] font-semibold text-mist-500 underline underline-offset-4 hover:text-mist-300 transition-colors"
          >
            Continua senza sincronizzazione
          </button>
        )}
      </div>
    );
  }

  // ── Primo avvio (o dopo ripristino di fabbrica): configurazione ──
  if (needsSetup) {
    return <SetupScreen />;
  }

  // ── Non loggati: schermata di login + notifica aggiornamenti ──
  // (nessun accesso automatico: ogni utente inserisce le sue credenziali)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-ink-950 text-mist-100">
        <LoginScreen />
        {showUpdateNotification && (
          <UpdateNotification onClose={() => setShowUpdateNotification(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 text-mist-100 flex flex-col font-sans selection:bg-brand-500 selection:text-ink-950 antialiased">
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
        {activeView === 'impostazioni' && <ImpostazioniView />}
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
