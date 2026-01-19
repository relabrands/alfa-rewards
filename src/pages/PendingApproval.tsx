import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { Clock, LogOut } from "lucide-react";

export default function PendingApproval() {
    const { logout } = useApp();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-10 h-10 text-yellow-600" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Cuenta Pendiente</h1>
                    <p className="text-muted-foreground">
                        Tu cuenta ha sido creada exitosamente, pero requiere la aprobación de un representante de ventas para ser activada.
                    </p>
                </div>

                <div className="bg-muted p-4 rounded-lg text-sm text-left space-y-2">
                    <p><strong>¿Qué sigue?</strong></p>
                    <ul className="list-disc list-inside text-muted-foreground">
                        <li>Tu solicitud ha sido enviada a tu zona.</li>
                        <li>Un visitador verificará tus datos.</li>
                        <li>Una vez aprobado, podrás acceder con tu correo y contraseña.</li>
                    </ul>
                </div>

                <Button variant="outline" onClick={logout} className="w-full">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                </Button>
            </div>
        </div>
    );
}
