/**
 * Delivery Details Page
 * Shows detailed information for a single sales entry
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salesRepository } from '@/lib/db/repositories/salesRepository';
import type { SalesEntry } from '@/types/sales';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function DeliveryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<SalesEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEntry() {
      if (!id) {
        setError('Keine ID angegeben');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await salesRepository.getById(id);
        if (!data) {
          setError('Eintrag nicht gefunden');
        } else {
          setEntry(data as SalesEntry);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    }

    loadEntry();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/sales')}>
            ← Zurück
          </Button>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-gray-600">Lade Daten...</p>
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/sales')}>
            ← Zurück
          </Button>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-red-900">Fehler</h3>
          <p className="mt-2 text-red-700">{error || 'Eintrag nicht gefunden'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/sales')}>
            ← Zurück
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lieferdetails</h1>
            <p className="mt-1 text-sm text-gray-600">
              {entry.deliveryNumber || entry.artikelnummer || 'Unbekannt'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Bestellinformationen</h2>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField label="Bestellnummer" value={entry.deliveryNumber} />
                <DetailField label="Projektnummer" value={entry.projektnummer} />
                <DetailField label="Buchungsdatum" value={entry.importedAt} type="date" />
                <DetailField
                  label="Lieferverzug (Tage)"
                  value={entry.delayDays}
                  className={entry.delayDays && entry.delayDays > 0 ? 'text-red-600 font-semibold' : ''}
                />
              </dl>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Kundeninformationen</h2>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField label="Kundennummer" value={entry.customerNumber} />
                <DetailField label="Kundenname" value={entry.customerName} />
                <DetailField label="Land" value={entry.country} />
              </dl>
            </CardContent>
          </Card>

          {/* Product Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Produktinformationen</h2>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4">
                <DetailField label="Produktnummer" value={entry.artikelnummer} />
                <DetailField label="Produktgruppe" value={entry.productGroup} />
                <DetailField
                  label="Produktbeschreibung"
                  value={entry.productDescription}
                  fullWidth
                />
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Menge" value={entry.quantity} />
                  <DetailField label="Einheit" value={entry.unit} />
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Delivery Dates */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Liefertermine</h2>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <DetailField
                  label="Wunsch-Liefertermin"
                  value={entry.requestedDeliveryDate}
                  type="date"
                />
                <DetailField
                  label="Bestätigter Liefertermin"
                  value={entry.confirmedDeliveryDate}
                  type="date"
                />
                <DetailField
                  label="Tatsächliches Lieferdatum"
                  value={entry.deliveryDate}
                  type="date"
                />
              </dl>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Finanzen</h2>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField
                  label="Offener Umsatz"
                  value={entry.openTurnover}
                  type="currency"
                />
                <DetailField
                  label="Restumsatz"
                  value={entry.remainingTurnover}
                  type="currency"
                />
                <DetailField
                  label="Preis pro Einheit"
                  value={entry.pricePerUnit}
                  type="currency"
                />
                <DetailField
                  label="Gesamtpreis"
                  value={entry.totalPrice}
                  type="currency"
                />
              </dl>
            </CardContent>
          </Card>

          {/* Personnel */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Verantwortliche</h2>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField label="Projektverantwortlicher" value={entry.projectManager} />
                <DetailField label="Bearbeiter" value={entry.processor} />
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Related Data & Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Aktionen</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full" disabled>
                PDF exportieren
              </Button>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Notiz hinzufügen
              </Button>
            </CardContent>
          </Card>

          {/* Related Production Data - Placeholder */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Produktionsstatus</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 italic">
                Wird in Phase 4 implementiert
              </p>
              {entry.artikelnummer && (
                <p className="mt-2 text-xs text-gray-400">
                  Verknüpfung über Artikelnummer: {entry.artikelnummer}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Related Controlling Data - Placeholder */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Controlling</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 italic">
                Wird in Phase 5 implementiert
              </p>
              {entry.projektnummer && (
                <p className="mt-2 text-xs text-gray-400">
                  Verknüpfung über Projektnummer: {entry.projektnummer}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Metadaten</h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-gray-600">ID</dt>
                  <dd className="mt-1 font-mono text-xs text-gray-900">{entry.id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Importiert am</dt>
                  <dd className="mt-1 text-gray-900">
                    {entry.importedAt
                      ? new Intl.DateTimeFormat('de-DE', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(entry.importedAt))
                      : '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper component to display a detail field
 */
interface DetailFieldProps {
  label: string;
  value: unknown;
  type?: 'text' | 'date' | 'currency' | 'number';
  className?: string;
  fullWidth?: boolean;
}

function DetailField({
  label,
  value,
  type = 'text',
  className = '',
  fullWidth = false,
}: DetailFieldProps) {
  let displayValue = '-';

  if (value !== null && value !== undefined && value !== '') {
    if (type === 'date') {
      const date = typeof value === 'string' ? new Date(value) : (value as Date);
      if (!isNaN(date.getTime())) {
        displayValue = new Intl.DateTimeFormat('de-DE').format(date);
      }
    } else if (type === 'currency') {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isNaN(num)) {
        displayValue = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
        }).format(num);
      }
    } else if (type === 'number') {
      displayValue = new Intl.NumberFormat('de-DE').format(Number(value));
    } else {
      displayValue = String(value);
    }
  }

  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <dt className="text-sm font-medium text-gray-600">{label}</dt>
      <dd className={`mt-1 text-sm text-gray-900 ${className}`}>{displayValue}</dd>
    </div>
  );
}
