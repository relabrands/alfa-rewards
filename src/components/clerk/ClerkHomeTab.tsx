import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { Scan, Camera, CheckCircle2, XCircle, History, Zap, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function ClerkHomeTab() {
  const { currentUser, isActive, addPoints, points } = useApp();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanClick = () => {
    if (!isActive) {
      toast({
        title: "Cuenta Inactiva",
        description: "Tu cuenta debe ser activada por el representante.",
        variant: "destructive"
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const processImage = async (file: File) => {
    if (!currentUser) return;
    setIsScanning(true);

    try {
      // 1. Create initial Scan Document
      const scanRef = await addDoc(collection(db, 'scans'), {
        userId: currentUser.id,
        status: 'uploading',
        createdAt: serverTimestamp(),
        userName: currentUser.name
      });

      // 2. Upload Image to Storage
      const storagePath = `invoices/${currentUser.id}/${scanRef.id}.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // 3. Trigger Cloud Function by updating Status
      await updateDoc(scanRef, {
        status: 'uploaded',
        imageUrl: downloadUrl,
        storagePath: storagePath
      });

      toast({
        title: "Analizando...",
        description: "Subiendo imagen y procesando con IA. Esto puede tomar unos segundos.",
      });

      // 4. Listen for Result
      const unsubscribe = onSnapshot(doc(db, 'scans', scanRef.id), (docSnapshot) => {
        const data = docSnapshot.data();
        if (!data) return;

        if (data.status === 'processed') {
          setIsScanning(false);
          unsubscribe();

          const earnedPoints = data.pointsEarned || 0;
          const productsFound = data.productsFound || [];
          const productNames = productsFound.map((p: any) => p.product).join(', ');

          if (earnedPoints > 0) {
            addPoints(earnedPoints);
            toast({
              title: "¡Factura Aprobada! 🎉",
              description: `Detectamos: ${productNames}. Ganaste ${earnedPoints} puntos.`,
            });

            // Simple logic: if points > 50, maybe trigger roulette?
            // Or keep the random logic:
            if (Math.random() > 0.7) setShowRoulette(true);

          } else {
            toast({
              title: "Sin productos válidos",
              description: "La IA analizó la factura pero no encontró productos participantes.",
              variant: "destructive"
            });
          }
        } else if (data.status === 'error') {
          setIsScanning(false);
          unsubscribe();
          toast({
            title: "Error de Análisis",
            description: data.error || "Ocurrió un error al procesar la factura.",
            variant: "destructive"
          });
        }
      });

    } catch (error) {
      console.error("Scan flow error:", error);
      setIsScanning(false);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen. Verifica tu conexión.",
        variant: "destructive"
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleSpinRoulette = () => {
    const won = Math.random() > 0.5;
    if (won) {
      const prizePoints = 50;
      addPoints(prizePoints);
      toast({ title: "¡Ganaste en la Ruleta!", description: `+${prizePoints} puntos extra.` });
    } else {
      toast({ title: "Suerte para la próxima", description: "No ganaste premio esta vez." });
    }
    setShowRoulette(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-4 relative">
      <div className="px-4 space-y-6 max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Hola, {currentUser?.name?.split(' ')[0] || 'Usuario'} 👋
            </h1>
            <p className="text-muted-foreground text-sm">
              {currentUser?.email || 'Farmacia Central'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tus Puntos</div>
            <div className="text-2xl font-black text-primary">{points.toLocaleString()}</div>
          </div>
        </div>

        {/* hidden input for camera */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Scan Button Card */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-primary/90 text-primary-foreground overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10" />

          <CardContent className="p-8 flex flex-col items-center justify-center text-center relative z-10">
            <div className="mb-4 p-4 bg-white/20 rounded-full backdrop-blur-sm animate-pulse">
              <Scan className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Escanear Factura</h2>
            <p className="text-primary-foreground/80 mb-6 max-w-[200px]">
              Toma una foto a la factura. La IA detectará los productos automáticamente.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="w-full font-bold text-primary shadow-lg hover:shadow-xl transition-all"
              onClick={handleScanClick}
              disabled={!isActive || isScanning}
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Procesando IA...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Abrir Cámara
                </>
              )}
            </Button>
            {!isActive && (
              <p className="mt-4 text-xs bg-black/20 px-3 py-1 rounded-full flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Cuenta no verificada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity / Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Actividad Reciente
            </h3>
          </div>

          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {/* Mock Activity Items */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Factura Aprobada</p>
                    <p className="text-xs text-muted-foreground">Hace 2 horas</p>
                  </div>
                </div>
                <span className="font-bold text-success">+150 pts</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roulette Modal */}
        {showRoulette && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-sm bg-gradient-to-b from-background to-muted border-primary/20 shadow-2xl">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-6xl">🎰</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">¡Giro de Suerte!</h2>
                  <p className="text-muted-foreground">Has desbloqueado un giro gratis</p>
                </div>
                <Button
                  size="lg"
                  className="w-full text-lg font-bold animate-pulse"
                  onClick={handleSpinRoulette}
                >
                  Girar Ahora
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
