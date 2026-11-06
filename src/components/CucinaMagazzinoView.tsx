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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
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
            <p className="text-xs text-slate-400">
              Giacenze alimentari, ingredienti freschi, farine, condimenti e scorte minime per lo chef.
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          {kitchenAlertsCount > 0 ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>{kitchenAlertsCount} Ingredienti Sotto Scorta!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Dispensa Fornita (Scorte OK)</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca ingrediente (es. Mozzarella, Farina, Olio, Pomodoro)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSubCategory('tutti')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSubCategory === 'tutti'
                ? 'bg-orange-500 text-slate-950'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            Tutti gli Alimenti
          </button>
          <button
            onClick={() => setSelectedSubCategory('materiali')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSubCategory === 'materiali'
                ? 'bg-orange-500 text-slate-950'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            Materie Prime Cucina
          </button>
          <button
            onClick={() => setSelectedSubCategory('allerte')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedSubCategory === 'allerte'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-950 text-amber-300 border border-amber-900/60 hover:border-amber-700'
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
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header item */}
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate">
                    <h3 className="font-extrabold text-white text-base leading-tight truncate">
                      {item.name}
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Fornitore: {item.supplier || 'Produzione interna'}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider flex-shrink-0 ${
                      isOut
                        ? 'bg-rose-500 text-white'
                        : isLow
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isOut ? 'Esaurito' : isLow ? 'Quasi Finito' : 'Disponibile'}
                  </span>
                </div>

                {/* Quantities display */}
                <div className="mt-3 flex items-baseline justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Giacenza Attuale:
                    </div>
                    <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                      <span>{item.currentQuantity}</span>
                      <span className="text-xs font-semibold text-slate-400">{item.unit}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Scorta Minima:
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-400">
                      {item.minThreshold} {item.unit}
                    </div>
                  </div>
                </div>

                {item.expirationDate && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-2">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>Scadenza: {item.expirationDate}</span>
                  </div>
                )}
              </div>

              {/* Fast +/- Quick Actions for Kitchen Staff */}
              <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Consumo Veloce:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleQuickAdjust(item, -1)}
                    title="Ho consumato 1 unità"
                    className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-0.5 active:scale-95"
                  >
                    -1 {item.unit}
                  </button>

                  <button
                    onClick={() => handleQuickAdjust(item, -5)}
                    title="Ho consumato 5 unità"
                    className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-0.5 active:scale-95"
                  >
                    -5 {item.unit}
                  </button>

                  <button
                    onClick={() => handleQuickAdjust(item, 5)}
                    title="Arrivo / Ricarica +5 unità"
                    className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-0.5 active:scale-95"
                  >
                    +5 {item.unit}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
