import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RegisteredClerk } from '@/lib/types';
import { getTeamMembers } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { Users, Search, MessageCircle, TrendingUp, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SalesRepTeamSection() {
  const { toast } = useToast();
  const { currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [team, setTeam] = useState<RegisteredClerk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      if (currentUser?.id) {
        try {
          // Fix: use repId, not zone array
          const clerks = await getTeamMembers(currentUser.id);
          setTeam(clerks as RegisteredClerk[]);
        } catch (err) {
          console.error('Error loading team:', err);
        }
      }
      setLoading(false);
    };
    loadTeam();
  }, [currentUser?.id]);

  const filteredClerks = team.filter(clerk =>
    clerk.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clerk.pharmacyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPoints = team.reduce((sum, c) => sum + (c.pointsGenerated || 0), 0);
  const activeClerks = team.filter(c => c.status === 'active').length;

  const handleWhatsAppReminder = (clerk: RegisteredClerk) => {
    const message = encodeURIComponent(`¡Hola ${clerk.name}! 👋 Te recordamos que puedes ganar puntos escaneando facturas en el programa Alfa Rewards. ¡No pierdas tus premios! 🎁`);
    const phone = clerk.phone.replace(/\D/g, '');
    window.open(`https://wa.me/1${phone}?text=${message}`, '_blank');
    toast({
      title: '📱 Abriendo WhatsApp',
      description: `Enviando recordatorio a ${clerk.name}`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Mi Equipo</h1>
        <p className="text-muted-foreground">Dependientes registrados bajo tu supervisión</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Users,
            value: loading ? '—' : team.length,
            label: 'Total Registrados',
            gradient: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            glow: 'rgba(99,102,241,0.2)',
          },
          {
            icon: CheckCircle2,
            value: loading ? '—' : activeClerks,
            label: 'Activos',
            gradient: 'linear-gradient(135deg,#10b981,#059669)',
            glow: 'rgba(16,185,129,0.2)',
          },
          {
            icon: TrendingUp,
            value: loading ? '—' : totalPoints.toLocaleString(),
            label: 'Puntos Generados',
            gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
            glow: 'rgba(245,158,11,0.2)',
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="rounded-2xl p-5 border bg-white flex items-center gap-4 transition-all"
              style={{ borderColor: 'hsl(210 20% 92%)', boxShadow: `0 4px 20px ${s.glow}` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow"
                style={{ background: s.gradient }}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o farmacia..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
        />
      </div>

      {/* Team Table */}
      <Card className="rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'hsl(210 20% 92%)' }}>
        <CardHeader className="pb-3 border-b" style={{ borderColor: 'hsl(210 20% 92%)' }}>
          <CardTitle className="text-base font-semibold">Lista de Dependientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando equipo...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ background: 'hsl(210 20% 97%)', borderColor: 'hsl(210 20% 92%)' }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Farmacia</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Puntos</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClerks.map((clerk, i) => (
                    <tr
                      key={clerk.id}
                      className="border-b transition-colors hover:bg-slate-50"
                      style={{ borderColor: 'hsl(210 20% 94%)' }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                            style={{ background: `linear-gradient(135deg, hsl(${(i * 47) % 360} 70% 55%), hsl(${(i * 47 + 30) % 360} 70% 45%))` }}
                          >
                            {clerk.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{clerk.name}</p>
                            <p className="text-xs text-muted-foreground">{clerk.cedula || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm">{clerk.pharmacyName || 'N/A'}</p>
                      </td>
                      <td className="px-5 py-4">
                        {clerk.status === 'active' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" /> Pendiente
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-amber-600">{(clerk.pointsGenerated || 0).toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-1">pts</span>
                      </td>
                      <td className="px-5 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsAppReminder(clerk)}
                          className="rounded-lg text-xs gap-1.5 text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredClerks.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-slate-400" />
              </div>
              <p className="font-medium text-foreground">No se encontraron dependientes</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? 'Prueba con otro término de búsqueda.' : 'Aún no tienes dependientes registrados.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
