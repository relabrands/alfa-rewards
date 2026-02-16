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
    id: number;
    distritoId?: number;
    municipioId?: number;
    nombre: string;
}

interface RawBarrio {
    id: number;
    nombre: string;
    seccionId: number;
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
        const [provincesRes, municipalitiesRes, districtsRes, sectionsRes, barriosRes] = await Promise.all([
            fetch(BASE_URL + SOURCES.provinces),
            fetch(BASE_URL + SOURCES.municipalities),
            fetch(BASE_URL + SOURCES.districts),
            fetch(BASE_URL + SOURCES.sectors),
            fetch(BASE_URL + SOURCES.neighborhoods)
        ]);

        const provinces: RawProvince[] = await provincesRes.json();
        const municipalities: RawMunicipality[] = await municipalitiesRes.json();
        const districts: RawDistrict[] = await districtsRes.json();
        const sections: RawSection[] = await sectionsRes.json();
        const barrios: RawBarrio[] = await barriosRes.json();

        console.log(`Fetched: ${provinces.length} provinces, ${municipalities.length} municipalities, ${districts.length} districts, ${sections.length} sections, ${barrios.length} barrios.`);

        // --- PRE-PROCESS SECTORS ---

        // Map: SeccionID -> List of Barrio Names
        const sectionToBarriosMap = new Map<number, string[]>();
        barrios.forEach(b => {
            const list = sectionToBarriosMap.get(b.seccionId) || [];
            list.push(b.nombre);
            sectionToBarriosMap.set(b.seccionId, list);
        });

        // Map: MunicipalityID -> Set of Sector Names (Set to avoid dupes)
        const municipalitySectorsMap = new Map<number, Set<string>>();
        // Map: DistrictID -> Set of Sector Names
        const districtSectorsMap = new Map<number, Set<string>>();

        sections.forEach(s => {
            const barriosList = sectionToBarriosMap.get(s.id) || [];

            // If valid barrios exist, use them. 
            // If no barrios (rural section?), maybe use the section name itself? 
            // For now, let's stick to barrios if available, or section name if list is empty.
            // Actually, "Zona Urbana" sections usually have barrios. Rural ones might not have "barrios" listed in JSON?
            // Let's include BOTH? Or just barrios?
            // User wants "Sectors". Use Barrios. If no Barrios, use Section Name.

            const namesToAdd = barriosList.length > 0 ? barriosList : [s.nombre];

            if (s.distritoId) {
                // Belongs to a District
                const set = districtSectorsMap.get(s.distritoId) || new Set();
                namesToAdd.forEach(n => set.add(n));
                districtSectorsMap.set(s.distritoId, set);
            } else if (s.municipioId) {
                // Belongs to a Municipality (direct)
                const set = municipalitySectorsMap.get(s.municipioId) || new Set();
                namesToAdd.forEach(n => set.add(n));
                municipalitySectorsMap.set(s.municipioId, set);
            }
        });


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
        // NOTE: The source JSON for municipalities does NOT have an 'id' field. 
        // We assume ID = index + 1 based on the relational data in sections/districts.
        municipalities.forEach((m, index) => {
            const muniId = index + 1;
            const prov = provinceMap.get(m.provinciaId);
            if (prov) {
                const sectorsSet = municipalitySectorsMap.get(muniId) || new Set(); // Use generated ID
                const sectorList = sectorsSet ? Array.from(sectorsSet).sort() : [];

                prov.municipalities.push({
                    name: m.nombre,
                    sectors: sectorList
                });
            }
        });

        // Map Districts (as Municipalities)
        // Similarly, districts might lack IDs or need index-based logic. 
        // Let's check if districts have IDs. If not, use index + 1. 
        // Actually, district IDs might conflict with Muni IDs if we just use 1..N.
        // But here we are just mapping SECTORS to them. 
        // unique ID for district is needed to find its sectors.
        districts.forEach((d, index) => {
            // If District has no ID, assume Index + 1. 
            // We need to check if 'd' has 'id'. 
            // The simulation showed 'distritoId' in sections, so districts must have IDs. 
            // Let's assume District JSON order matches IDs: 1..N.
            const distId = (d as any).id || (index + 1);

            const muni = municipalities.find((m, mIndex) => (mIndex + 1) === d.municipioId);
            if (muni) {
                const prov = provinceMap.get(muni.provinciaId);
                if (prov) {
                    const sectorsSet = districtSectorsMap.get(distId);
                    const sectorList = sectorsSet ? Array.from(sectorsSet).sort() : [];

                    prov.municipalities.push({
                        name: d.nombre,
                        sectors: sectorList
                    });
                }
            } else {
                // Try finding province directly via other means if needed, currently reliant on parent municipality
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
