import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { useApp } from '@/context/AppContext';
import { getRegisteredClerks } from '@/lib/db';
import { RegisteredClerk } from '@/lib/types';
import { User, Phone, Briefcase, Users, TrendingUp, Award, Calendar } from 'lucide-react';

export function SalesRepProfileSection() {
  const { currentUser } = useApp();
  const [team, setTeam] = useState<RegisteredClerk[]>([]);

  useEffect(() => {
    const loadTeam = async () => {
      if (currentUser?.id) {
        const clerks = await getRegisteredClerks(currentUser.id);
        setTeam(clerks as unknown as RegisteredClerk[]);
      }
    };
    loadTeam();
  }, [currentUser?.id]);

  const totalClerks = team.length;
  const activeClerks = team.filter(c => c.status === 'active').length;
  const totalPoints = team.reduce((sum, c) => sum + (c.pointsGenerated || 0), 0);

  const stats = [
    { label: 'Dependientes Activados', value: totalClerks, icon: Users, color: 'text-primary' },
    { label: 'Activos este Mes', value: activeClerks, icon: TrendingUp, color: 'text-success' },
    { label: 'Puntos Generados', value: totalPoints.toLocaleString(), icon: Award, color: 'text-gold-dark' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground mt-1">Información y estadísticas del visitador</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20 ring-4 ring-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{currentUser.name}</h2>
              <p className="text-muted-foreground">Visitador Médico</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Desde Enero 2024</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Nombre Completo</Label>
          <Input value={`${currentUser.name} ${currentUser.lastName || ''}`} disabled />
        </div>

        <div className="space-y-2">
          <Label>Correo Electrónico</Label>
          <Input value={currentUser.email || ''} disabled />
        </div>

        <div className="space-y-2">
          <Label>Rol</Label>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              Visitador Médico
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Zonas Asignadas</Label>
          <Input
            value={currentUser.zone && currentUser.zone.length > 0 ? currentUser.zone.join(', ') : 'Sin zonas asignadas'}
            disabled
          />
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3">
        <div className="mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
        </div>
        <p className="text-sm text-muted-foreground">
          Para actualizar tu información personal o zonas asignadas, por favor contacta a tu gerente directo.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nombre Completo</p>
              <p className="font-medium">{currentUser.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{currentUser.phone || '809-555-5678'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Código de Empleado</p>
              <p className="font-medium">{currentUser.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-gold" />
            Logros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gold/10 text-center">
              <div className="text-3xl mb-2">🏆</div>
              <p className="font-medium text-gold-dark">Top Visitador</p>
              <p className="text-xs text-muted-foreground">Enero 2024</p>
            </div>
            <div className="p-4 rounded-xl bg-primary/10 text-center">
              <div className="text-3xl mb-2">⭐</div>
              <p className="font-medium text-primary">50 Activaciones</p>
              <p className="text-xs text-muted-foreground">Milestone</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
