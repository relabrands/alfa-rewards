import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pill, Shield, ArrowRight, Loader2, UserPlus } from 'lucide-react';
import { getAllPharmacies, createUserProfile } from '@/lib/db';
import { Pharmacy } from '@/lib/types';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Register() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        cedula: '',
        phone: '',
        email: '',
        password: '',
        pharmacyId: ''
    });

    useEffect(() => {
        const loadPharmacies = async () => {
            try {
                const data = await getAllPharmacies();
                setPharmacies(data);
            } catch (error) {
                console.error("Error loading pharmacies", error);
            }
        };
        loadPharmacies();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSelectChange = (value: string) => {
        setFormData(prev => ({ ...prev, pharmacyId: value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.cedula || !formData.email || !formData.password || !formData.pharmacyId) {
            toast({
                title: 'Campos incompletos',
                description: 'Por favor completa todos los campos requeridos',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);

        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // 2. Create Firestore Profile with 'pending' status
            await createUserProfile(user.uid, {
                id: user.uid,
                name: formData.firstName,
                lastName: formData.lastName,
                cedula: formData.cedula,
                phone: formData.phone,
                role: 'clerk',
                status: 'pending',
                pharmacyId: formData.pharmacyId,
                points: 0,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
            });

            toast({
                title: '¡Registro Exitoso!',
                description: 'Tu cuenta ha sido creada y está pendiente de aprobación por un visitador.',
            });

            // Navigate to login or a pending page
            navigate('/');

        } catch (error: any) {
            console.error(error);
            let message = 'Error al registrar usuario';
            if (error.code === 'auth/email-already-in-use') message = 'El correo ya está registrado';
            if (error.code === 'auth/weak-password') message = 'La contraseña es muy débil';

            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
            <header className="p-6 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                        <Pill className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Alfa Rewards</h1>
                        <p className="text-xs text-muted-foreground">Registro de Dependientes</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg shadow-xl border-0 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="text-center space-y-4 pb-2">
                        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserPlus className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
                            <CardDescription className="mt-2">
                                Únete al programa de lealtad para dependientes
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-4">
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">Nombre</Label>
                                    <Input id="firstName" value={formData.firstName} onChange={handleChange} placeholder="Juan" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Apellido</Label>
                                    <Input id="lastName" value={formData.lastName} onChange={handleChange} placeholder="Pérez" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cedula">Cédula</Label>
                                <Input id="cedula" value={formData.cedula} onChange={handleChange} placeholder="001-0000000-0" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input id="phone" value={formData.phone} onChange={handleChange} placeholder="(809) 000-0000" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pharmacyId">Farmacia</Label>
                                <Select onValueChange={handleSelectChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona tu farmacia" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pharmacies.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} {p.sector ? `— ${p.sector}` : ''} {p.clientCode ? `(${p.clientCode})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="juan@ejemplo.com" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <Input id="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 text-lg font-semibold btn-primary-gradient mt-4"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Registrarse
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                ¿Ya tienes una cuenta?{' '}
                                <Link to="/" className="text-primary font-medium hover:underline">
                                    Inicia Sesión
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
