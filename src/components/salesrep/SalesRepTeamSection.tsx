import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RegisteredClerk } from '@/lib/types';
import { getTeamMembers } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { Users, Search, MessageCircle, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function SalesRepTeamSection() {
  const { toast } = useToast();
  const { currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [team, setTeam] = useState<RegisteredClerk[]>([]);

  useEffect(() => {
    const loadTeam = async () => {
      if (currentUser?.zone && currentUser.zone.length > 0) {
        const clerks = await getTeamMembers(currentUser.zone);
        setTeam(clerks as RegisteredClerk[]);
      } else {
        setTeam([]);
      }
    };
    loadTeam();
  }, [currentUser?.zone]);

  const filteredClerks = team.filter(clerk =>
    clerk.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clerk.pharmacyName.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Equipo</h1>
        <p className="text-muted-foreground mt-1">Dependientes registrados por ti</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{team.length}</p>
              <p className="text-sm text-muted-foreground">Total Registrados</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeClerks}</p>
              <p className="text-sm text-muted-foreground">Activos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-gold-dark" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Puntos Generados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o farmacia..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Team Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Lista de Dependientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Farmacia</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Puntos</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredClerks.map((clerk) => (
                  <tr key={clerk.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{clerk.name}</p>
                        <p className="text-xs text-muted-foreground">{clerk.cedula}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{clerk.pharmacyName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={clerk.status === 'active' ? 'default' : 'secondary'}>
                        {clerk.status === 'active' ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Activo</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" /> Pendiente</>
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gold-dark">{clerk.pointsGenerated.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWhatsAppReminder(clerk)}
                        className="text-green-600 border-green-600/30 hover:bg-green-600/10"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClerks.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No se encontraron dependientes
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
