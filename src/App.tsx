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
import { AlertTriangle, Waves } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    currentUser,
    activeView,
    needsSetup,
    bootstrapDone,
    skipBootstrap,
    syncError,
  } = useApp();
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
      <div className="min-h-screen bg-ink-950 text-mist-100 flex flex-col items-center justify-center gap-4 px-6 safe-t safe-b">
        <div className="h-14 w-14 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-300 flex items-center justify-center animate-pulse">
          <Waves className="w-7 h-7" />
        </div>
        <p className="text-xs text-mist-500 tracking-wide text-center">
          {canSkip
            ? 'Connessione al ristorante…'
            : 'Connessione al ristorante…'}
        </p>

        {/* ⚠️ Se il cloud rifiuta l'accesso, spiego subito come sbloccarlo */}
        {canSkip && syncError && (
          <div className="w-full max-w-md rounded-2xl bg-rose-600/10 border border-rose-400/30 p-4 space-y-2">
            <div className="flex items-start gap-2 text-xs font-bold text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
              <span>Accesso al database bloccato</span>
            </div>
            <p className="text-[11px] text-mist-300 leading-relaxed break-words">
              {syncError}
            </p>
            <p className="text-[11px] text-mist-300 leading-relaxed">
              Apri{' '}
              <span className="text-brand-300">
                console.firebase.google.com → sea-restaurant → Realtime
                Database → Rules
              </span>{' '}
              e pubblica{' '}
              <code className="text-brand-300">
                {'{ "rules": { ".read": true, ".write": true } }'}
              </code>
              . Poi riapri l&apos;app.
            </p>
          </div>
        )}

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
      <main className="flex-1 content-bottom-space lg:pl-60">
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
