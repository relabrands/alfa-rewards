import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/context/AppContext';
import { Pill, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'Por favor ingresa tu cédula o código de empleado',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const id = identifier.trim().toUpperCase();
    
    if (id.startsWith('001') || id.startsWith('002')) {
      login('clerk', id);
      toast({
        title: '¡Bienvenido/a!',
        description: 'Accediendo como Dependiente...',
      });
      navigate('/clerk');
    } else if (id.startsWith('REP')) {
      login('salesRep', id);
      toast({
        title: '¡Bienvenido/a!',
        description: 'Accediendo como Visitador...',
      });
      navigate('/sales-rep');
    } else if (id === 'ADMIN' || id === 'DIRECTOR') {
      login('director', id);
      toast({
        title: '¡Bienvenido/a!',
        description: 'Accediendo como Director...',
      });
      navigate('/admin');
    } else {
      toast({
        title: 'Credencial no válida',
        description: 'Verifica tu cédula o código de empleado',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Pill className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Alfa Rewards</h1>
            <p className="text-xs text-muted-foreground">Programa de Lealtad Farmacéutico</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
              <CardDescription className="mt-2">
                Ingresa tu cédula o código de empleado para acceder
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium">
                  Cédula o Código de Empleado
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="001-1234567-8 o REP001"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-14 text-lg px-4"
                  autoComplete="off"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-lg font-semibold btn-primary-gradient"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Ingresar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo hints */}
            <div className="mt-8 p-4 rounded-xl bg-muted/50 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Demo: Prueba estas credenciales
              </p>
              <div className="space-y-2 text-sm">
                <button 
                  type="button"
                  onClick={() => setIdentifier('001-1234567-8')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-background hover:bg-accent transition-colors"
                >
                  <span className="font-mono text-primary">001-1234567-8</span>
                  <span className="text-muted-foreground ml-2">→ Dependiente</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setIdentifier('REP001')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-background hover:bg-accent transition-colors"
                >
                  <span className="font-mono text-primary">REP001</span>
                  <span className="text-muted-foreground ml-2">→ Visitador</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setIdentifier('ADMIN')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-background hover:bg-accent transition-colors"
                >
                  <span className="font-mono text-primary">ADMIN</span>
                  <span className="text-muted-foreground ml-2">→ Director</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground">
        <p>© 2024 Alfa Rewards. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
