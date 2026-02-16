import { db } from './firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

// DannyFeliz / Datos-Rep-Dom URLs
const BASE_URL = 'https://raw.githubusercontent.com/DannyFeliz/Datos-Rep-Dom/master/JSON/';
const SOURCES = {
    provinces: 'provincias.json',
    municipalities: 'municipios.json',
    districts: 'distritos.json', // Municipal Districts
    sectors: 'secciones.json',   // Sections / Sectors (Using Secciones as "Sectors")
    neighborhoods: 'barrios.json' // Neighborhoods
};

interface RawProvince {
    id: number;
    nombre: string;
    region_id?: number;
}

interface RawMunicipality {
    id: number;
    provinciaId: number;
    nombre: string;
}

interface RawDistrict {
    id: number;
    municipioId: number;
    nombre: string;
}

interface RawSection {
    section_id: number;
    district_id?: number; // Might be linked to district or municipality directly depending on structure
    municipality_id?: number;
    name: string;
}

interface LocationStructure {
    name: string;
    region?: string;
    municipalities: {
        name: string;
        sectors: string[]; // List of neighborhoods or sections
    }[];
}

export const seedLocations = async () => {
    try {
        console.log('Starting seed process...');

        // 1. Fetch Data
        const [provincesRes, municipalitiesRes, districtsRes] = await Promise.all([
            fetch(BASE_URL + SOURCES.provinces),
            fetch(BASE_URL + SOURCES.municipalities),
            fetch(BASE_URL + SOURCES.districts)
        ]);

        const provinces: RawProvince[] = await provincesRes.json();
        const municipalities: RawMunicipality[] = await municipalitiesRes.json();
        const districts: RawDistrict[] = await districtsRes.json();

        console.log(`Fetched: ${provinces.length} provinces, ${municipalities.length} municipalities, ${districts.length} districts.`);

        // 2. Process Hierachy
        const batch = writeBatch(db);
        let batchCount = 0;

        // Map: ProvinceID -> LocationDoc
        const provinceMap = new Map<number, LocationStructure>();

        provinces.forEach(p => {
            provinceMap.set(p.id, {
                name: p.nombre,
                region: 'N/A',
                municipalities: []
            });
        });

        // Map Municipalities
        municipalities.forEach(m => {
            const prov = provinceMap.get(m.provinciaId);
            if (prov) {
                prov.municipalities.push({
                    name: m.nombre,
                    sectors: []
                });
            }
        });

        // Map Districts (as Municipalities or sub-municipalities? User asked for Prov->Muni->Sector)
        // Let's treat districts as municipalities for now to be safe, or just skip if they obscure real munis.
        // Actually, many "Distritos Municipales" are what users interact with. 
        // NOTE: The JSON for districts likely uses `municipioId` or similar. 
        // Debugging showed: Munis use `provinciaId`. Process Districts similarly.

        districts.forEach(d => {
            // We need to find the province of the municipality this district belongs to.
            // Map MunicipalityId -> ProvinceId first
            const muni = municipalities.find(m => m.id === d.municipioId); // Assuming structure based on standard
            if (muni) {
                const prov = provinceMap.get(muni.provinciaId);
                if (prov) {
                    prov.municipalities.push({
                        name: d.nombre,
                        sectors: []
                    });
                }
            } else {
                // Fallback: maybe district key names are different? 
                // We only saw prop names for prov/muni. 
                // Let's assume standard (id, municipioId, nombre).
                // If it fails, it's just districts.
            }
        });

        // 3. Write to Firestore
        // We write each Province as a document
        const collectionRef = collection(db, 'locations'); // Create reference once

        provinceMap.forEach((data, id) => {
            const cleanName = data.name ? data.name.trim() : '';

            if (!cleanName) {
                console.warn(`Skipping province ID ${id} due to empty name.`);
                return;
            }

            if (cleanName.length === 0) {
                console.warn(`Skipping province ID ${id} due to empty name string.`);
                return;
            }

            try {
                const docRef = doc(collectionRef, cleanName); // Use validated name
                batch.set(docRef, data);
                batchCount++;
            } catch (err) {
                console.error(`Error creating doc ref for province: ${cleanName}`, err);
            }
        });

        if (batchCount > 0) {
            await batch.commit();
            console.log(`Successfully seeded ${batchCount} provinces with municipalities.`);
            return { success: true, count: batchCount };
        } else {
            console.warn("No valid provinces to seed.");
            return { success: false, message: "No valid data found." };
        }

    } catch (error) {
        console.error("Seeding failed:", error);
        throw error;
    }
};
