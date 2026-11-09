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
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Tutti gli Alimenti
            </Btn>

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
      </div>
    </div>
  );
};
