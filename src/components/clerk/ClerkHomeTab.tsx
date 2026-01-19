import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { Scan, Camera, CheckCircle2, XCircle, History, Zap, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, onSnapshot, serverTimestamp, query, where, orderBy, limit, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import confetti from 'canvas-confetti';

export function ClerkHomeTab() {
  const { currentUser, isActive, addPoints, points } = useApp();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [pharmacyName, setPharmacyName] = useState<string>('');
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Pharmacy Name
  useEffect(() => {
    const fetchPharmacy = async () => {
      if (currentUser?.pharmacyId) {
        try {
          const pharRef = doc(db, 'pharmacies', currentUser.pharmacyId);
          const pharSnap = await getDoc(pharRef);
          if (pharSnap.exists()) {
            setPharmacyName(pharSnap.data().name);
          }
        } catch (error) {
          console.error("Error fetching pharmacy:", error);
        }
      }
    };
    fetchPharmacy();
  }, [currentUser?.pharmacyId]);

  // Fetch Recent Activity (Scans)
  useEffect(() => {
    if (!currentUser?.id) return;

    const q = query(
      collection(db, 'scans'),
      where('userId', '==', currentUser.id),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentScans(scans);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

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

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00C2E0', '#FFD700', '#ffffff'] // Brand Cyan & Gold
    });
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
        userName: currentUser.name,
        userEmail: currentUser.email, // Added for easier tracking
        pharmacyId: currentUser.pharmacyId || null
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

      // 4. Listen for Result (handled by general listener, but here for immediate feedback)
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
            // Points update handled via user listener in AppContext usually, 
            // but we can locally trigger if needed or just let the global state update.
            // addPoints(earnedPoints); // Rely on backend or global listener to avoid double count

            toast({
              title: "¡Factura Aprobada! 🎉",
              description: `Detectamos: ${productNames}. Ganaste ${earnedPoints} puntos.`,
            });

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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Reciente';
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('es-DO', { hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 pb-24 pt-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none" />

      <div className="px-4 space-y-8 max-w-md mx-auto relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Hola, {currentUser?.name?.split(' ')[0] || 'Usuario'} 👋
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {pharmacyName || currentUser?.email || 'Cargando farmacia...'}
            </p>
          </div>
          <div className="text-right bg-white/50 backdrop-blur-sm p-2 rounded-xl border border-white/40 shadow-sm">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Tus Puntos</div>
            <div className="text-2xl font-black text-primary flex items-center justify-end gap-1">
              <Sparkles className="w-4 h-4 text-gold animate-pulse" />
              {points.toLocaleString()}
            </div>
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

        {/* Scan Button Card - Dopamine Style */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
          <Card className="relative border-none shadow-2xl bg-gradient-to-br from-primary via-cyan-500 to-primary text-white overflow-hidden transform transition-all hover:scale-[1.02]">

            {/* Animated Background Elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10" />

            <CardContent className="p-8 flex flex-col items-center justify-center text-center relative z-10">
              <div className="mb-6 p-5 bg-white/20 rounded-full backdrop-blur-md shadow-inner ring-4 ring-white/10 animate-[pulse_3s_ease-in-out_infinite]">
                <Scan className="w-16 h-16 text-white drop-shadow-md" />
              </div>
              <h2 className="text-3xl font-black mb-3 tracking-tight">Escanear Factura</h2>
              <p className="text-white/90 mb-8 max-w-[220px] font-medium leading-relaxed">
                ¡Suma puntos ahora! Toma una foto y gana recompensas al instante.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="w-full font-bold text-primary text-lg h-14 shadow-xl hover:shadow-2xl transition-all hover:bg-white border-2 border-transparent hover:border-primary/20"
                onClick={handleScanClick}
                disabled={!isActive || isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-6 w-6" />
                    ¡Escanear Ahora!
                  </>
                )}
              </Button>
              {!isActive && (
                <div className="mt-4 flex items-center gap-2 text-xs bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm text-white/90 font-medium">
                  <XCircle className="h-4 w-4 text-red-300" />
                  <span>Cuenta pendiente de verificación</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity / Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-lg flex items-center gap-2 text-foreground/80">
              <History className="h-5 w-5 text-primary" />
              Actividad Reciente
            </h3>
          </div>

          <Card className="border-none shadow-lg bg-white/60 backdrop-blur-sm">
            <CardContent className="p-0 divide-y divide-gray-100">
              {recentScans.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <History className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium">Aún no tienes actividad.</p>
                  <p className="text-xs">¡Escanea tu primera factura hoy!</p>
                </div>
              ) : (
                recentScans.map((scan) => (
                  <div key={scan.id} className="p-4 flex items-center justify-between hover:bg-white/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${scan.status === 'processed' ? 'bg-success/10 text-success ring-1 ring-success/20' :
                          scan.status === 'error' ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/20' : 'bg-secondary text-primary ring-1 ring-primary/20'
                        }`}>
                        {scan.status === 'processed' ? (
                          <Zap className="h-6 w-6 fill-current" />
                        ) : scan.status === 'error' ? (
                          <AlertCircle className="h-6 w-6" />
                        ) : (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">
                          {scan.status === 'processed' ? 'Puntos Ganados' :
                            scan.status === 'error' ? 'Intento Fallido' : 'Procesando...'}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          {formatDate(scan.createdAt)}
                        </p>
                      </div>
                    </div>
                    {scan.pointsEarned > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="font-black text-success text-lg">+{scan.pointsEarned}</span>
                        <span className="text-[10px] font-bold text-success/70 uppercase">Puntos</span>
                      </div>
                    )}
                    {scan.status === 'error' && (
                      <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full">Error</span>
                    )}
                  </div>
                ))
              )}
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
