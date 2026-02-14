import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LocationSelectorProps {
    onLocationChange: (location: { province: string, municipality: string, sector: string }) => void;
    initialProvince?: string;
    initialMunicipality?: string;
    initialSector?: string;
}

interface ProvinceData {
    name: string;
    municipalities: {
        name: string;
        sectors: string[];
    }[];
}

export default function LocationSelector({ onLocationChange, initialProvince = '', initialMunicipality = '', initialSector = '' }: LocationSelectorProps) {
    const [provinces, setProvinces] = useState<ProvinceData[]>([]);
    const [selectedProvince, setSelectedProvince] = useState(initialProvince);
    const [selectedMunicipality, setSelectedMunicipality] = useState(initialMunicipality);
    const [selectedSector, setSelectedSector] = useState(initialSector);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProvinces();
    }, []);

    const loadProvinces = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "locations"));
            const data = querySnapshot.docs.map(doc => doc.data() as ProvinceData);
            // Sort by name
            data.sort((a, b) => a.name.localeCompare(b.name));
            setProvinces(data);
        } catch (error) {
            console.error("Error loading locations:", error);
        } finally {
            setLoading(false);
        }
    };

    // Derived lists
    const currentProvinceData = provinces.find(p => p.name === selectedProvince);
    const municipalities = currentProvinceData?.municipalities || [];
    // Sort municipalities
    const sortedMunicipalities = [...municipalities].sort((a, b) => a.name.localeCompare(b.name));

    const currentMunicipalityData = sortedMunicipalities.find(m => m.name === selectedMunicipality);
    const sectors = currentMunicipalityData?.sectors || [];
    // Sort sectors
    const sortedSectors = [...sectors].sort((a, b) => a.localeCompare(b));

    const handleProvinceChange = (val: string) => {
        setSelectedProvince(val);
        setSelectedMunicipality('');
        setSelectedSector('');
        onLocationChange({ province: val, municipality: '', sector: '' });
    };

    const handleMunicipalityChange = (val: string) => {
        setSelectedMunicipality(val);
        setSelectedSector('');
        onLocationChange({ province: selectedProvince, municipality: val, sector: '' });
    };

    const handleSectorChange = (val: string) => {
        setSelectedSector(val);
        onLocationChange({ province: selectedProvince, municipality: selectedMunicipality, sector: val });
    };

    if (loading) return <div className="text-sm text-muted-foreground">Cargando ubicaciones...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label>Provincia</Label>
                <Select value={selectedProvince} onValueChange={handleProvinceChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar Provincia" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {provinces.map(p => (
                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Municipio / Distrito</Label>
                <Select value={selectedMunicipality} onValueChange={handleMunicipalityChange} disabled={!selectedProvince}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar Municipio" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {sortedMunicipalities.map(m => (
                            <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Sector / Barrio</Label>
                <Select value={selectedSector} onValueChange={handleSectorChange} disabled={!selectedMunicipality || sectors.length === 0}>
                    <SelectTrigger>
                        <SelectValue placeholder={sectors.length === 0 ? "Sin sectores registrados" : "Seleccionar Sector"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {sortedSectors.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
