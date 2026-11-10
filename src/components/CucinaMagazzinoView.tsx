/**
 * 🍳 Magazzino & dispensa cucina — scorte, allerte e consumi veloci.
 *
 * Il markup segue il design system (Card / Btn / Badge / Amount);
 * logica di filtro e handler restano identici a prima.
 */

import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  Boxes,
  Calendar,
  Check,
  ChefHat,
  Clock,
  Filter,
  Flame,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { InventoryItem, ItemCategory } from '../types';
import { Badge, Btn, Card, EmptyState, Input } from './ui';

export const CucinaMagazzinoView: React.FC = () => {
  const { inventory, adjustQuantity, addInventoryItem, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<'tutti' | 'materiali' | 'finiti' | 'allerte'>('tutti');
  const [quickAdjustItem, setQuickAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(-1);
  const [adjustReason, setAdjustReason] = useState<string>('Utilizzo preparazioni cucina');

  // Filter only food/cucina related items
  const kitchenInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Must be food or packaging used in kitchen
      const isKitchenRelevant =
        item.category === 'cibo' || item.category === 'packaging';
      if (!isKitchenRelevant) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.supplier.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (selectedSubCategory === 'materiali') {
        return item.type === 'materiale';
      }
      if (selectedSubCategory === 'finiti') {
        return item.type === 'prodotto';
      }
      if (selectedSubCategory === 'allerte') {
        return item.currentQuantity <= item.minThreshold;
      }

      return true;
    });
  }, [inventory, searchTerm, selectedSubCategory]);

  const kitchenAlertsCount = useMemo(() => {
    return inventory.filter(
      (item) =>
        (item.category === 'cibo' || item.category === 'packaging') &&
        item.currentQuantity <= item.minThreshold
    ).length;
  }, [inventory]);

  const handleQuickAdjust = (item: InventoryItem, delta: number) => {
    adjustQuantity(
      item.id,
      delta,
      delta < 0 ? 'Consumo espresso in cucina' : 'Rifornimento cucina'
    );
  };

  return (
<<<<<<< HEAD
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center font-bold">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>Magazzino &amp; Dispensa Cucina</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-950 text-orange-300 border border-orange-800 font-bold">
                Cucina Live
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Giacenze alimentari, ingredienti freschi, farine, condimenti e scorte minime per lo chef.
            </p>
          </div>
        </div>
=======
    <div className="min-h-screen bg-ink-950 text-mist-100 animate-fadeIn">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 py-5 sm:py-6 space-y-4 sm:space-y-5">
        {/* ── Intestazione ── */}
        <Card className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-brand-500/15 text-brand-300 border border-brand-500/25 flex items-center justify-center">
              <ChefHat className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-mist-100 flex items-center gap-2 flex-wrap">
                <span>Magazzino &amp; Dispensa Cucina</span>
                <Badge tone="brand">Cucina Live</Badge>
              </h1>
              <p className="mt-0.5 text-xs text-mist-500">
                Giacenze alimentari, ingredienti freschi, farine, condimenti e scorte minime per
                lo chef.
              </p>
            </div>
          </div>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29

          {/* Stato dispensa */}
          {kitchenAlertsCount > 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-amber-600/15 border border-amber-400/30 px-3.5 py-2.5 text-xs font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{kitchenAlertsCount} Ingredienti Sotto Scorta!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-mint-600/15 border border-mint-400/30 px-3.5 py-2.5 text-xs font-bold text-mint-400">
              <Check className="w-4 h-4" />
              <span>Dispensa Fornita (Scorte OK)</span>
            </div>
          )}
        </Card>

<<<<<<< HEAD
      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/70 p-4 rounded-2xl border border-neutral-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="Cerca ingrediente (es. Mozzarella, Farina, Olio, Pomodoro)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
=======
        {/* ── Ricerca e filtri rapidi ── */}
        <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cerca ingrediente (es. Mozzarella, Farina, Olio, Pomodoro)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="!pl-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                aria-label="Azzera ricerca"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500 hover:text-mist-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <Filter className="w-4 h-4 text-mist-500 shrink-0 hidden sm:block" />

            <Btn
              variant={selectedSubCategory === 'tutti' ? 'primary' : 'soft'}
              size="sm"
              onClick={() => setSelectedSubCategory('tutti')}
              className="shrink-0 whitespace-nowrap"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Tutti gli Alimenti
            </Btn>

<<<<<<< HEAD
        {/* Quick Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSubCategory('tutti')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSubCategory === 'tutti'
                ? 'bg-orange-500 text-neutral-950'
                : 'bg-neutral-950 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
            }`}
          >
            Tutti gli Alimenti
          </button>
          <button
            onClick={() => setSelectedSubCategory('materiali')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSubCategory === 'materiali'
                ? 'bg-orange-500 text-neutral-950'
                : 'bg-neutral-950 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
            }`}
          >
            Materie Prime Cucina
          </button>
          <button
            onClick={() => setSelectedSubCategory('allerte')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedSubCategory === 'allerte'
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-950 text-amber-300 border border-amber-900/60 hover:border-amber-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Nawakes ({kitchenAlertsCount})</span>
          </button>
        </div>
      </div>

      {/* Grid of Kitchen Ingredients Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kitchenInventory.map((item) => {
          const isLow = item.currentQuantity <= item.minThreshold;
          const isOut = item.currentQuantity <= 0;

          return (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between min-h-[190px] shadow-lg ${
                isOut
                  ? 'bg-rose-950/30 border-rose-500/60 shadow-rose-950/20'
                  : isLow
                  ? 'bg-amber-950/30 border-amber-500/60 shadow-amber-950/20'
                  : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                {/* Header item */}
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate">
                    <h3 className="font-extrabold text-white text-base leading-tight truncate">
                      {item.name}
                    </h3>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Fornitore: {item.supplier || 'Produzione interna'}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider flex-shrink-0 ${
                      isOut
                        ? 'bg-rose-500 text-white'
                        : isLow
                        ? 'bg-amber-500 text-neutral-950 animate-pulse'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {isOut ? 'Esaurito' : isLow ? 'Quasi Finito' : 'Disponibile'}
                  </span>
                </div>

                {/* Quantities display */}
                <div className="mt-3 flex items-baseline justify-between p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800/80">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                      Giacenza Attuale:
                    </div>
                    <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                      <span>{item.currentQuantity}</span>
                      <span className="text-xs font-semibold text-neutral-400">{item.unit}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                      Scorta Minima:
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-400">
                      {item.minThreshold} {item.unit}
                    </div>
                  </div>
                </div>

                {item.expirationDate && (
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-2">
                    <Calendar className="w-3 h-3 text-neutral-500" />
                    <span>Scadenza: {item.expirationDate}</span>
                  </div>
                )}
              </div>

              {/* Fast +/- Quick Actions for Kitchen Staff */}
              <div className="pt-3 mt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-neutral-400 font-semibold">Consumo Veloce:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleQuickAdjust(item, -1)}
                    title="Ho consumato 1 unità"
                    className="h-8 px-2.5 rounded-xl bg-neutral-800 hover:bg-rose-950 hover:text-rose-300 text-neutral-200 font-bold text-xs border border-neutral-700 flex items-center gap-0.5 active:scale-95"
                  >
                    -1 {item.unit}
                  </button>

                  <button
                    onClick={() => handleQuickAdjust(item, -5)}
                    title="Ho consumato 5 unità"
                    className="h-8 px-2.5 rounded-xl bg-neutral-800 hover:bg-rose-950 hover:text-rose-300 text-neutral-200 font-bold text-xs border border-neutral-700 flex items-center gap-0.5 active:scale-95"
                  >
                    -5 {item.unit}
                  </button>

                  <button
                    onClick={() => handleQuickAdjust(item, 5)}
                    title="Arrivo / Ricarica +5 unità"
                    className="h-8 px-2.5 rounded-xl bg-neutral-800 hover:bg-emerald-950 hover:text-emerald-300 text-neutral-200 font-bold text-xs border border-neutral-700 flex items-center gap-0.5 active:scale-95"
                  >
                    +5 {item.unit}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
=======
            <Btn
              variant={selectedSubCategory === 'materiali' ? 'primary' : 'soft'}
              size="sm"
              onClick={() => setSelectedSubCategory('materiali')}
              className="shrink-0 whitespace-nowrap"
            >
              <Boxes className="w-3.5 h-3.5" />
              Materie Prime Cucina
            </Btn>

            <Btn
              variant={selectedSubCategory === 'finiti' ? 'primary' : 'soft'}
              size="sm"
              onClick={() => setSelectedSubCategory('finiti')}
              className="shrink-0 whitespace-nowrap"
            >
              <Package className="w-3.5 h-3.5" />
              Prodotti Finiti
            </Btn>

            <Btn
              variant={selectedSubCategory === 'allerte' ? 'primary' : 'soft'}
              size="sm"
              onClick={() => setSelectedSubCategory('allerte')}
              className="shrink-0 whitespace-nowrap"
            >
              <Flame className="w-3.5 h-3.5" />
              Allerte ({kitchenAlertsCount})
            </Btn>
          </div>
        </Card>

        {/* ── Griglia ingredienti ── */}
        {kitchenInventory.length === 0 ? (
          <Card className="p-4 sm:p-5">
            <EmptyState
              icon={<ChefHat className="w-6 h-6" />}
              title="Nessun ingrediente in dispensa."
              description="Modifica la ricerca o il filtro: gli ingredienti di cucina (cibo e packaging) compariranno qui."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {kitchenInventory.map((item) => {
              const isLow = item.currentQuantity <= item.minThreshold;
              const isOut = item.currentQuantity <= 0;

              return (
                <div
                  key={item.id}
                  className={`surface border-l-4 p-4 flex flex-col gap-3 transition-colors ${
                    isOut
                      ? 'border-l-rose-400'
                      : isLow
                      ? 'border-l-amber-400'
                      : 'border-l-mint-600/60'
                  }`}
                >
                  {/* Intestazione scheda */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-mist-100 truncate">{item.name}</h3>
                      <div className="mt-0.5 text-[11px] text-mist-500 truncate">
                        Fornitore: {item.supplier || 'Produzione interna'}
                      </div>
                    </div>

                    <Badge
                      tone={isOut ? 'rose' : isLow ? 'amber' : 'mint'}
                      className="shrink-0"
                    >
                      {isOut ? 'Esaurito' : isLow ? 'Quasi Finito' : 'Disponibile'}
                    </Badge>
                  </div>

                  {/* Giacenze */}
                  <div className="rounded-xl bg-ink-900 border border-ink-700 p-3 flex items-end justify-between gap-3">
                    <div>
                      <div className="section-title">Giacenza attuale</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold tnum text-mist-100">
                          {item.currentQuantity}
                        </span>
                        <span className="text-xs text-mist-500">{item.unit}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="section-title">Scorta minima</div>
                      <div className="mt-1 text-sm font-bold tnum text-amber-400">
                        {item.minThreshold} {item.unit}
                      </div>
                    </div>
                  </div>

                  {item.expirationDate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-mist-500">
                      <Calendar className="w-3 h-3" />
                      <span>Scadenza: {item.expirationDate}</span>
                    </div>
                  )}

                  {/* Consumi veloci */}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1 border-t border-ink-700">
                    <span className="text-[11px] font-semibold text-mist-500">Consumo veloce</span>
                    <div className="flex items-center gap-1.5">
                      <Btn
                        variant="soft"
                        size="sm"
                        title="Ho consumato 1 unità"
                        onClick={() => handleQuickAdjust(item, -1)}
                        className="!px-2.5 hover:!text-rose-400"
                      >
                        <Minus className="w-3 h-3" />
                        1
                      </Btn>

                      <Btn
                        variant="soft"
                        size="sm"
                        title="Ho consumato 5 unità"
                        onClick={() => handleQuickAdjust(item, -5)}
                        className="!px-2.5 hover:!text-rose-400"
                      >
                        <Minus className="w-3 h-3" />
                        5
                      </Btn>

                      <Btn
                        variant="soft"
                        size="sm"
                        title="Arrivo / Ricarica +5 unità"
                        onClick={() => handleQuickAdjust(item, 5)}
                        className="!px-2.5 hover:!text-mint-400"
                      >
                        <Plus className="w-3 h-3" />
                        5
                      </Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
      </div>
    </div>
  );
};
