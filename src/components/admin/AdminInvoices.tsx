import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllScans, getAllPharmacies, getAllUsers, rejectInvoice, approveInvoice } from '@/lib/db';
import { ScanRecord, Pharmacy, User } from '@/lib/types';
import {
  FileText, Search, Filter, Eye, Ban, CheckCircle2, XCircle,
  Clock, Package, Building2, User as UserIcon, Hash, Calendar,
  DollarSign, Sparkles, AlertTriangle, Loader2, ImageOff, ExternalLink
} from 'lucide-react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  processed: { label: 'Aprobada', color: '#059669', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2 },
  rejected:  { label: 'Rechazada', color: '#dc2626', bg: 'rgba(220,38,38,0.1)',  icon: XCircle },
  flagged:   { label: 'Revisión',  color: '#d97706', bg: 'rgba(217,119,6,0.1)',  icon: AlertTriangle },
  pending:   { label: 'Pendiente', color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: Clock },
};

export default function AdminInvoices() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pharmacyFilter, setPharmacyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<ScanRecord | null>(null);
  const [invoiceImageUrl, setInvoiceImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [scanToReject, setScanToReject] = useState<ScanRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [s, p, u] = await Promise.all([getAllScans(), getAllPharmacies(), getAllUsers()]);
        setScans(s); setPharmacies(p); setUsers(u);
      } finally { setIsLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedInvoice) { setInvoiceImageUrl(null); return; }
    setImageLoading(true);
    (async () => {
      try {
        if (selectedInvoice.imageUrl) {
          setInvoiceImageUrl(selectedInvoice.imageUrl);
        } else if ((selectedInvoice as any).storagePath) {
          const url = await getDownloadURL(ref(getStorage(), (selectedInvoice as any).storagePath));
          setInvoiceImageUrl(url);
        } else { setInvoiceImageUrl(null); }
      } catch { setInvoiceImageUrl(null); }
      finally { setImageLoading(false); }
    })();
  }, [selectedInvoice]);

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const pharmacyMap = useMemo(() => new Map(pharmacies.map(p => [p.id, p])), [pharmacies]);

  const filtered = useMemo(() => scans.filter(s => {
    const u = userMap.get(s.userId);
    const ph = s.pharmacyId ? pharmacyMap.get(s.pharmacyId)?.name ?? '' : '';
    const name = u?.name ?? '';
    const term = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || s.id.toLowerCase().includes(term) || name.toLowerCase().includes(term) || ph.toLowerCase().includes(term) || (s.ncf ?? '').toLowerCase().includes(term);
    const matchPh = pharmacyFilter === 'all' || s.pharmacyId === pharmacyFilter;
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchPh && matchStatus;
  }), [scans, searchTerm, pharmacyFilter, statusFilter, userMap, pharmacyMap]);

  const handleRejectConfirm = async () => {
    if (!scanToReject || !rejectionReason.trim()) return;
    setIsRejecting(true);
    try {
      await rejectInvoice(scanToReject.id, rejectionReason);
      setScans(prev => prev.map(s => s.id === scanToReject.id ? { ...s, status: 'rejected', rejectionReason } : s));
      toast({ title: 'Factura Rechazada', description: 'Los puntos han sido revertidos/cancelados.' });
      setIsRejectOpen(false);
    } catch {
      toast({ title: 'Error', description: 'No se pudo rechazar.', variant: 'destructive' });
    } finally { setIsRejecting(false); }
  };

  const handleApprove = async (scan: ScanRecord) => {
    setIsApproving(true);
    try {
      await approveInvoice(scan.id);
      setScans(prev => prev.map(s => s.id === scan.id ? { ...s, status: 'processed', rejectionReason: undefined } : s));
      toast({ title: 'Factura Aprobada', description: 'Los puntos han sido acreditados correctamente.' });
      setSelectedInvoice(null);
    } catch {
      toast({ title: 'Error', description: 'No se pudo aprobar la factura.', variant: 'destructive' });
    } finally { setIsApproving(false); }
  };

  const counts = useMemo(() => ({
    total: scans.length,
    pending: scans.filter(s => s.status === 'pending' || s.status === 'flagged').length,
    approved: scans.filter(s => s.status === 'processed').length,
    rejected: scans.filter(s => s.status === 'rejected').length,
  }), [scans]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6" /> Facturas Escaneadas
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Historial completo de escaneos y validaciones</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.total, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
          { label: 'Pendientes', value: counts.pending, color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
          { label: 'Aprobadas', value: counts.approved, color: '#059669', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Rechazadas', value: counts.rejected, color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 border bg-white" style={{ borderColor: 'hsl(210 20% 92%)', boxShadow: `0 2px 12px ${k.bg}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: k.color }}>{isLoading ? '—' : k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border shadow-sm" style={{ borderColor: 'hsl(210 20% 92%)' }}>
        <CardHeader className="pb-3 border-b" style={{ borderColor: 'hsl(210 20% 92%)' }}>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar NCF, dependiente, farmacia..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={pharmacyFilter} onValueChange={setPharmacyFilter}>
              <SelectTrigger className="w-[200px]"><Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Farmacia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Farmacias</SelectItem>
                {pharmacies.map(ph => <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="processed">Aprobadas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="flagged">En Revisión</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow style={{ background: 'hsl(210 20% 98%)' }}>
                <TableHead className="pl-5">Fecha</TableHead>
                <TableHead>NCF / ID</TableHead>
                <TableHead>Dependiente</TableHead>
                <TableHead>Farmacia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead className="text-right">Puntos</TableHead>
                <TableHead className="text-right pr-5">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Cargando facturas...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-16 text-muted-foreground">No se encontraron facturas.</TableCell></TableRow>
              ) : filtered.map(scan => {
                const user = userMap.get(scan.userId);
                const pharmacy = scan.pharmacyId ? pharmacyMap.get(scan.pharmacyId) : null;
                const cfg = STATUS_CONFIG[scan.status] ?? STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                return (
                  <TableRow key={scan.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="pl-5">
                      <p className="text-sm font-medium">{scan.timestamp?.toLocaleDateString('es-DO')}</p>
                      <p className="text-xs text-muted-foreground">{scan.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-sm font-semibold">{scan.ncf || <span className="text-muted-foreground italic text-xs">Sin NCF</span>}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{scan.id.slice(0, 8)}…</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{initials}</div>
                        <div>
                          <p className="text-sm font-medium">{user?.name ?? 'Desconocido'}</p>
                          <p className="text-xs text-muted-foreground">{user?.email ?? user?.phone ?? ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{pharmacy?.name ?? <span className="text-muted-foreground italic text-xs">No detectada</span>}</p>
                      {pharmacy?.sector && <p className="text-xs text-muted-foreground">{pharmacy.sector}</p>}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                        <StatusIcon className="h-3 w-3" />{cfg.label}
                      </span>
                      {scan.rejectionReason && <p className="text-[10px] text-red-500 mt-1 max-w-[140px] leading-tight">{scan.rejectionReason}</p>}
                    </TableCell>
                    <TableCell>
                      {scan.productsFound && scan.productsFound.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                          <Package className="h-3 w-3" />{scan.productsFound.length} producto{scan.productsFound.length !== 1 ? 's' : ''}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-bold" style={{ color: scan.pointsEarned > 0 ? '#059669' : '#94a3b8' }}>
                      {scan.pointsEarned > 0 ? `+${scan.pointsEarned.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedInvoice(scan)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {['processed', 'pending', 'flagged'].includes(scan.status) && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => { setScanToReject(scan); setRejectionReason(''); setIsRejectOpen(true); }} title="Rechazar">
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── Detail Modal ─────────────────────────────────────────────────── */}
      <Dialog open={!!selectedInvoice} onOpenChange={o => !o && setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
          {selectedInvoice && (() => {
            const user = userMap.get(selectedInvoice.userId);
            const pharmacy = selectedInvoice.pharmacyId ? pharmacyMap.get(selectedInvoice.pharmacyId) : null;
            const cfg = STATUS_CONFIG[selectedInvoice.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            return (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-indigo-500" />
                      Detalle de Factura
                    </DialogTitle>
                  </DialogHeader>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                    <StatusIcon className="h-3.5 w-3.5" />{cfg.label}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-0 border-b" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                  {[
                    { icon: Hash, label: 'NCF', value: selectedInvoice.ncf || 'Sin NCF', mono: true },
                    { icon: Calendar, label: 'Fecha', value: selectedInvoice.timestamp?.toLocaleString('es-DO') ?? 'N/A' },
                    { icon: DollarSign, label: 'Puntos Acreditados', value: selectedInvoice.pointsEarned > 0 ? `+${selectedInvoice.pointsEarned.toLocaleString()} pts` : '0 pts', highlight: true },
                    { icon: UserIcon, label: 'Dependiente', value: user ? `${user.name} ${user.lastName ?? ''}`.trim() : 'Desconocido' },
                    { icon: Building2, label: 'Farmacia', value: pharmacy?.name ?? 'No detectada' },
                    { icon: DollarSign, label: 'Monto Factura', value: selectedInvoice.productsFound && selectedInvoice.productsFound.length > 0 ? `RD$${selectedInvoice.productsFound.reduce((sum, p) => sum + ((p.unitPrice || 0) * p.quantity), 0).toLocaleString()}` : 'N/A' },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="px-4 py-3 border-r last:border-r-0 border-b md:border-b-0" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                        </div>
                        <p className={`text-sm font-semibold ${item.mono ? 'font-mono' : ''}`} style={item.highlight ? { color: '#059669' } : undefined}>{item.value}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {/* Invoice Image */}
                  <div className="border-r" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-muted-foreground" />Imagen de Factura</p>
                      {invoiceImageUrl && (
                        <a href={invoiceImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />Abrir
                        </a>
                      )}
                    </div>
                    <div className="mx-4 mb-4 rounded-xl overflow-hidden flex items-center justify-center bg-slate-900 min-h-[220px]">
                      {imageLoading ? (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="text-xs">Cargando imagen...</span>
                        </div>
                      ) : invoiceImageUrl ? (
                        <img src={invoiceImageUrl} alt="Factura" className="max-w-full max-h-[300px] object-contain" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <ImageOff className="h-10 w-10" />
                          <span className="text-xs">Imagen no disponible</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Products Found */}
                  <div>
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                        Productos Identificados por IA
                      </p>
                    </div>
                    {selectedInvoice.productsFound && selectedInvoice.productsFound.length > 0 ? (
                      <div className="mx-4 mb-4 space-y-2">
                        {selectedInvoice.productsFound.map((p, i) => (
                          <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 border" style={{ borderColor: 'hsl(210 20% 92%)', background: 'hsl(210 20% 98%)' }}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                {i + 1}
                              </div>
                              <div>
                                <p className="text-sm font-semibold leading-tight">{p.product}</p>
                                <p className="text-xs text-muted-foreground">
                                  Cantidad: {p.quantity} | {p.saleType?.toLowerCase() === 'unit' ? (p.quantity === 1 ? 'Pastilla' : 'Pastillas') : p.saleType?.toLowerCase() === 'box' ? (p.quantity === 1 ? 'Caja' : 'Cajas') : (p.saleType || (p.quantity === 1 ? 'Caja' : 'Cajas'))} (RD${p.unitPrice || 0})
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-indigo-600">+{p.points} pts</p>
                              <p className="text-[10px] text-muted-foreground">total</p>
                            </div>
                          </div>
                        ))}
                        {/* Points Summary */}
                        <div className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <span className="text-sm font-semibold text-emerald-700">Total de Puntos</span>
                          <span className="text-base font-bold text-emerald-600">+{selectedInvoice.productsFound.reduce((sum, p) => sum + (p.points || 0), 0).toLocaleString()} pts</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mx-4 mb-4 flex flex-col items-center justify-center min-h-[180px] rounded-xl border border-dashed text-center p-6" style={{ borderColor: 'hsl(210 20% 88%)' }}>
                        <Package className="h-10 w-10 mb-2 text-slate-300" />
                        <p className="text-sm text-muted-foreground font-medium">Sin productos identificados</p>
                        <p className="text-xs text-muted-foreground mt-1">La IA no detectó productos en esta factura</p>
                      </div>
                    )}

                    {/* Rejection Reason if any */}
                    {selectedInvoice.rejectionReason && (
                      <div className="mx-4 mb-4 rounded-xl px-3 py-2.5" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                        <p className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1"><Ban className="h-3 w-3" />Motivo de Rechazo</p>
                        <p className="text-sm text-red-700">{selectedInvoice.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                {['processed', 'pending', 'flagged', 'pending_review'].includes(selectedInvoice.status) && (
                  <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                    <Button variant="destructive" size="sm" onClick={() => { setScanToReject(selectedInvoice); setRejectionReason(''); setIsRejectOpen(true); setSelectedInvoice(null); }}>
                      <Ban className="h-4 w-4 mr-2" />Rechazar Factura
                    </Button>
                    {selectedInvoice.status === 'pending_review' && (
                       <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" disabled={isApproving} onClick={() => handleApprove(selectedInvoice)}>
                         {isApproving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} Aprobar Factura
                       </Button>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Reject Dialog ────────────────────────────────────────────────── */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" />Rechazar Factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Esta acción revertirá los puntos acreditados. Debes indicar el motivo del rechazo.</p>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo del Rechazo</Label>
              <Textarea id="reason" placeholder="Ej: NCF inválido, factura duplicada, productos no elegibles..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="min-h-[100px]" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={!rejectionReason.trim() || isRejecting} onClick={handleRejectConfirm}>
              {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Rechazo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
