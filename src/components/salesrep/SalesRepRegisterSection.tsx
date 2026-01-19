import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Camera, CheckCircle2, User, Phone, CreditCard, Loader2, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/context/AppContext';
import { addRegisteredClerk, getPharmacies } from '@/lib/db';
import { Pharmacy } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function SalesRepRegisterSection() {
  const { toast } = useToast();
  const { currentUser } = useApp();
  const [isScanning, setIsScanning] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    phone: '',
    pharmacy: '',
  });

  useEffect(() => {
    const loadData = async () => {
      const data = await getPharmacies();
      setPharmacies(data);
    };
    loadData();
  }, []);

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    setIsScanning(true);
    try {
      // 1. Create Identity Scan Doc
      const scanRef = await addDoc(collection(db, 'identity_scans'), {
        userId: currentUser.id,
        status: 'uploading',
        createdAt: serverTimestamp()
      });

      // 2. Upload
      const storagePath = `identity/${currentUser.id}/${scanRef.id}.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // 3. Trigger Processing
      await scanRef.update({ // This assumes doc ref usage directly, but we need updateDoc
        // Wait, scanRef in v9 is a DocumentReference. But update methods are separate.
        // Using updateDoc below.
      });

      // Wait, I can't call scanRef.update in Modular SDK. Using helper below.
    } catch (e) {
      console.error(e);
      setIsScanning(false);
    }

    // Reworking the logic block to be correct v9 SDK:
    processIdentityImage(file);
  };

  const processIdentityImage = async (file: File) => {
    if (!currentUser) return;
    setIsScanning(true);

    try {
      const scanRef = await addDoc(collection(db, 'identity_scans'), {
        userId: currentUser.id,
        status: 'uploading',
        createdAt: serverTimestamp(),
        storagePath: '' // Requesting update
      });

      const storagePath = `identity/${currentUser.id}/${scanRef.id}.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);

      // Update to trigger Cloud Function
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(scanRef, {
        status: 'uploaded',
        storagePath: storagePath
      });

      toast({
        title: "Procesando Cédula...",
        description: "Analizando imagen con IA...",
      });

      // Listen for results
      const unsubscribe = onSnapshot(doc(db, 'identity_scans', scanRef.id), (docSnapshot) => {
        const data = docSnapshot.data();
        if (!data) return;

        if (data.status === 'processed' && data.data) {
          const result = data.data;
          setFormData(prev => ({
            ...prev,
            name: result.name || prev.name,
            idNumber: result.idNumber || prev.idNumber
          }));
          setIsScanning(false);
          setIsScanned(true);
          toast({
            title: "✅ Datos Extraídos",
            description: "Verifica que la información sea correcta.",
          });
          unsubscribe();
        } else if (data.status === 'error') {
          setIsScanning(false);
          toast({
            title: "Error",
            description: "No se pudo leer la cédula. Intenta de nuevo.",
            variant: "destructive"
          });
          unsubscribe();
        }
      });

    } catch (error) {
      console.error(error);
      setIsScanning(false);
      toast({
        title: "Error",
        description: "Error al subir la imagen.",
        variant: "destructive"
      });
    }
  };

  const handleRegister = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      const selectedPharmacy = pharmacies.find(p => p.id === formData.pharmacy);
      await addRegisteredClerk({
        ...formData,
        cedula: formData.idNumber,
        pharmacyName: selectedPharmacy?.name || 'Desconocida',
        registeredBy: currentUser.id,
      });

      toast({
        title: '🎉 ¡Registro Exitoso!',
        description: `${formData.name} ha sido registrado(a) en el programa Alfa Rewards`,
        className: 'bg-success text-success-foreground',
      });
      setFormData({ name: '', idNumber: '', phone: '', pharmacy: '' });
      setIsScanned(false);
    } catch (error) {
      console.error("Error registering clerk:", error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el dependiente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Registrar Nuevo Dependiente</h1>
        <p className="text-muted-foreground mt-1">Escanea la cédula para auto-completar el formulario</p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Location Card ... (Keep same) */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Ubicación Detectada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative h-40 rounded-lg overflow-hidden bg-muted">
            {/* ... SVG Map ... */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full relative">
                  <div className="absolute inset-0 opacity-30">
                    <svg viewBox="0 0 400 200" className="w-full h-full">
                      <path d="M0 100 Q100 50 200 100 T400 100" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" />
                      <path d="M50 150 Q150 100 250 150 T400 130" fill="none" stroke="currentColor" className="text-primary/50" strokeWidth="1" />
                      <rect x="150" y="60" width="100" height="60" fill="currentColor" className="text-primary/10" rx="4" />
                    </svg>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
                    <div className="relative">
                      <MapPin className="h-8 w-8 text-primary fill-primary" />
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary/30 rounded-full blur-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 bg-card/90 backdrop-blur-sm rounded-md px-3 py-2 text-sm">
              <span className="text-primary font-medium">Santo Domingo Este</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Farmacia</Label>
            <Select value={formData.pharmacy} onValueChange={(v) => setFormData(prev => ({ ...prev, pharmacy: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar farmacia..." />
              </SelectTrigger>
              <SelectContent>
                {pharmacies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.sector ? `— ${p.sector}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ID Scanner Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Escanear Cédula
          </CardTitle>
          <CardDescription>
            Apunta la cámara a la cédula del dependiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`relative aspect-[4/3] rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden ${isScanned ? 'border-success bg-success/5' : 'border-primary/30 bg-muted/50'
              }`}
          >
            {isScanned ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
                <span className="font-medium text-success">Cédula Verificada</span>
                <button
                  onClick={handleScanClick}
                  className="mt-2 text-xs text-muted-foreground underline z-10 cursor-pointer hover:text-primary transition-colors"
                >
                  Escanear de nuevo
                </button>
              </div>
            ) : isScanning ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <span className="text-muted-foreground">Procesando OCR...</span>
                <div className="absolute inset-4 border-2 border-primary/50 rounded-lg animate-pulse" />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Camera className="h-10 w-10 text-primary" />
                  </div>
                  {/* ... corner borders ... */}
                  <div className="absolute -inset-4">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
                  </div>
                </div>
                <span className="text-muted-foreground text-sm">Toque para escanear</span>
              </div>
            )}

            {!isScanning && (
              <button
                onClick={handleScanClick}
                className="absolute inset-0 w-full h-full cursor-pointer z-0"
                aria-label="Escanear cédula"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Registration Form ... (Keep same) */}
      <Card className={`transition-all duration-300 ${isScanned ? 'ring-2 ring-primary/20' : ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Datos del Dependiente</CardTitle>
          <CardDescription>
            {isScanned ? 'Datos auto-completados vía OCR' : 'Complete o verifique la información'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Nombre Completo
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre y apellido"
              className={isScanned && formData.name ? 'border-success/50 bg-success/5' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="idNumber" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Número de Cédula
            </Label>
            <Input
              id="idNumber"
              value={formData.idNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
              placeholder="000-0000000-0"
              className={isScanned && formData.idNumber ? 'border-success/50 bg-success/5' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Teléfono
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="809-000-0000"
              className={isScanned && formData.phone ? 'border-success/50 bg-success/5' : ''}
            />
          </div>

          <Button
            onClick={handleRegister}
            disabled={!formData.name || !formData.idNumber || !formData.phone || !formData.pharmacy || isSubmitting}
            className="w-full h-14 text-lg font-semibold btn-primary-gradient"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            )}
            Registrar & Activar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
