import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useApp } from '@/context/AppContext';
import { pharmacies } from '@/lib/constants';
import { ScanRecord } from '@/lib/types';
import { getScanHistory } from '@/lib/db';
import { User, Phone, MapPin, History, LogOut, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ClerkProfileTab() {
  const { currentUser, points, logout } = useApp();
  const navigate = useNavigate();
  const [history, setHistory] = useState<ScanRecord[]>([]);

  const pharmacy = pharmacies.find(p => p.id === currentUser?.pharmacyId);

  useEffect(() => {
    const loadHistory = async () => {
      if (currentUser?.id) {
        const scans = await getScanHistory(currentUser.id);
        setHistory(scans);
      }
    };
    loadHistory();
  }, [currentUser?.id]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  if (!currentUser) return <div>Cargando...</div>;

  return (
    <div className="min-h-screen bg-background pb-24 pt-4">
      <div className="px-4 space-y-6 max-w-md mx-auto">
        {/* Profile Header */}
        <div className="text-center py-6">
          <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-primary/20">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">{currentUser.name}</h1>
          <p className="text-muted-foreground">Dependiente</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 text-gold-dark mt-3">
            <span className="font-bold">{points.toLocaleString()}</span>
            <span className="text-sm">puntos acumulados</span>
          </div>
        </div>

        {/* User Info */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{currentUser.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{currentUser.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Farmacia</p>
                <p className="font-medium">{pharmacy?.name || 'No Asignada'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scan History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Mi Historial
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {history.length > 0 ? (
                history.map((scan) => (
                  <div key={scan.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(scan.status)}
                      <div>
                        <p className="text-sm font-medium">Factura #{scan.invoiceAmount}</p> {/* Using amount as fake ID if ID missing */}
                        <p className="text-xs text-muted-foreground">
                          {format(scan.timestamp, "d 'de' MMMM", { locale: es })} • RD${scan.invoiceAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-success">+{scan.pointsEarned}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">No hay actividad reciente</div>
              )}
            </div>
            {history.length > 5 && (
              <Button variant="ghost" className="w-full rounded-none border-t text-primary">
                Ver historial completo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
