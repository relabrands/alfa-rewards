import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { Scan, Camera, CheckCircle2, XCircle, History, Zap, Loader2, AlertCircle, Coins, Trophy } from 'lucide-react';
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
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-6 relative overflow-hidden">
      {/* Decorative blobs - More subtle */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#00C2E0]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute top-40 left-0 w-48 h-48 bg-[#FFD700]/5 rounded-full blur-3xl -ml-20 pointer-events-none" />

      <div className="px-4 space-y-8 max-w-md mx-auto relative z-10">

        {/* Header & Balance Card */}
        <div className="relative z-20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-lg border border-white/30 shadow-sm">
                👋
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground/90 leading-tight">
                  Hola, {currentUser?.name?.split(' ')[0] || 'Usuario'}
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  {pharmacyName || 'Farmacia'}
                </p>
              </div>
            </div>
            {/* Notification Bell Placeholder */}
            <button className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-gray-100">
              <Trophy className="w-5 h-5 text-[#FFD700]" />
            </button>
          </div>

          {/* Balance Card - Gamified */}
          <div className="relative w-full h-52 rounded-[2.5rem] overflow-hidden shadow-gold transform transition-transform hover:scale-[1.02] duration-300">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700] via-[#FFA500] to-[#FF8C00]"></div>

            {/* Decorative Coins/Circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -ml-5 -mb-5"></div>

            <div className="relative z-10 flex flex-col items-center justify-center h-full text-white pt-2">
              <span className="text-xs font-bold uppercase tracking-widest opacity-90 mb-1">Mis Coins</span>
              <div className="flex items-center gap-2 mb-4">
                <Coins className="w-8 h-8 text-white drop-shadow-md" />
                <span className="text-6xl font-black tracking-tighter drop-shadow-sm">{points.toLocaleString()}</span>
              </div>

              {/* Level Progress Bar */}
              <div className="w-4/5 bg-black/10 h-3 rounded-full overflow-hidden backdrop-blur-sm border border-white/20 relative">
                <div
                  className="h-full bg-white shadow-sm rounded-full"
                  style={{ width: `${(points % 1000) / 10}%` }}
                />
              </div>
              <p className="text-[10px] font-bold mt-2 opacity-90">
                Nivel {Math.floor(points / 1000) + 1} • {(1000 - (points % 1000)).toLocaleString()} para el siguiente nivel
              </p>
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

        {/* Scan Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Main Scan Action - Game Button Style */}
          <button
            onClick={handleScanClick}
            disabled={!isActive || isScanning}
            className="col-span-2 group relative h-36 rounded-[2.5rem] overflow-hidden shadow-float transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#00C2E0] to-[#0077E6] animate-gradient-x"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

            {/* Pulse Rings */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse"></div>

            <div className="absolute top-5 right-5 bg-white/20 p-3 rounded-full backdrop-blur-md shadow-inner">
              <Camera className="w-8 h-8 text-white drop-shadow-md" />
            </div>

            <div className="relative z-10 h-full flex flex-col justify-end p-8 text-left">
              <h3 className="text-3xl font-black text-white leading-none mb-1 drop-shadow-md italic uppercase">
                ¡Jugar!
              </h3>
              <p className="text-blue-100 text-sm font-bold flex items-center gap-1">
                Escanear para ganar ✨
              </p>
            </div>

            {isScanning && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <Loader2 className="w-10 h-10 text-white animate-spin mb-2" />
                <span className="text-white font-bold animate-pulse">Procesando...</span>
              </div>
            )}
          </button>
        </div>

        {!isActive && (
          <div className="flex items-center gap-2 text-xs bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100">
            <XCircle className="h-4 w-4" />
            <span>Cuenta pendiente de verificación por el admin.</span>
          </div>
        )}

        {/* Recent Activity / Status - Soft List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-lg text-foreground/80">
              Actividad Reciente
            </h3>
            <Button variant="ghost" size="sm" className="text-primary text-xs font-bold hover:bg-transparent hover:text-primary/80">Ver Todo</Button>
          </div>

          <div className="space-y-3">
            {recentScans.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground bg-white rounded-[2rem] shadow-sm border border-slate-50 flex flex-col items-center gap-2">
                <History className="w-10 h-10 text-muted-foreground/20" />
                <p className="text-sm font-medium">Sin actividad aún</p>
              </div>
            ) : (
              recentScans.map((scan) => (
                <div key={scan.id} className="group bg-white p-4 rounded-3xl shadow-sm border border-slate-50 flex items-center justify-between transition-all hover:shadow-md hover:scale-[1.01]">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${scan.status === 'processed' ? 'bg-[#E0F7FA] text-[#00C2E0]' :
                      scan.status === 'error' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'
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
                      <p className="font-bold text-sm text-foreground/90">
                        {scan.status === 'processed' ? 'Puntos Ganados' :
                          scan.status === 'error' ? 'Error al procesar' : 'Analizando...'}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                        {formatDate(scan.createdAt)}
                      </p>
                    </div>
                  </div>
                  {scan.pointsEarned > 0 && (
                    <div className="text-right">
                      <span className="block font-black text-[#00C2E0] text-lg">+{scan.pointsEarned}</span>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase">Coins</span>
                    </div>
                  )}
                  {scan.status === 'error' && (
                    <button className="text-xs font-bold text-red-500 bg-red-100 px-3 py-1 rounded-full">Revisar</button>
                  )}
                </div>
              ))
            )}
          </div>
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
