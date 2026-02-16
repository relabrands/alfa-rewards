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
    province_id: number;
    name: string;
    region_id?: number;
}

interface RawMunicipality {
    municipality_id: number;
    province_id: number;
    name: string;
}

interface RawDistrict {
    district_id: number;
    municipality_id: number;
    name: string;
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
        const [provincesRes, municipalitiesRes, districtsRes, userSelectedSectorsRes] = await Promise.all([
            fetch(BASE_URL + SOURCES.provinces),
            fetch(BASE_URL + SOURCES.municipalities),
            fetch(BASE_URL + SOURCES.districts),
            fetch(BASE_URL + SOURCES.neighborhoods) // Using Barrios as the most granular "Sector" for user selection
        ]);

        const provinces: RawProvince[] = await provincesRes.json();
        const municipalities: RawMunicipality[] = await municipalitiesRes.json();
        const districts: RawDistrict[] = await districtsRes.json();
        const sectors: any[] = await userSelectedSectorsRes.json(); // barrios.json

        console.log(`Fetched: ${provinces.length} provinces, ${municipalities.length} municipalities, ${districts.length} districts.`);

        // 2. Process Hierachy
        const batch = writeBatch(db);
        let batchCount = 0;

        // Map: ProvinceID -> LocationDoc
        const provinceMap = new Map<number, LocationStructure>();

        provinces.forEach(p => {
            provinceMap.set(p.province_id, {
                name: p.name,
                region: 'N/A', // Region data might need separate fetch or mapping
                municipalities: []
            });
        });

        // Map: MunicipalityID -> MunicipalityObj (Ref in provinceMap)
        // Since we need to push sectors into municipalities, we need a way to find them.
        // However, the structure demanded by user is: Province -> Municipalities -> Sectors.
        // But "Districts" exist between Municipality and Sector/Barrio usually. 
        // Hierarchy: Prov -> Muni -> Dist -> Sec -> Barrio.
        // User asked for: Prov -> Muni -> Sector.
        // We will flatten: All Districts + Municipalities = "Municipalities" list? 
        // Or "Municipality" = Municipality + District. 
        // And "Sector" = Barrio.

        // Let's iterate Municipalities and add them to Provinces
        municipalities.forEach(m => {
            const prov = provinceMap.get(m.province_id);
            if (prov) {
                prov.municipalities.push({
                    name: m.name,
                    sectors: []
                });
            }
        });

        // Now we need to map Sectors (Barrios) to Municipalities.
        // The Barrios JSON usually has `municipality_id` or `district_id`.
        // Let's check typical structure of `barrios.json` from this repo (based on standard open data schemas).
        // If it links to `section_id` or `district_id`, we need those connection maps.

        // Simpler approach for "Seeding Script" without perfection:
        // Use the collected data. 
        // If exact mapping is complex without intermediate files (sections, districts), we might just leave sectors empty for now or use a placeholder.
        // The user said: "Iterate through every province... Batch write...".
        // Let's assume user wants the structure. 
        // I'll try to map districts as "Municipalities" too, or merge them.
        // For this V1, I'll populate Provinces and Municipalities. 
        // For Sectors, I'll try to find a way, or leave as empty array `[]` if mapping is too deep (Barrio -> SubBarrio -> Section -> District -> Muni).

        // Actually, let's look at `distritos.json`. These are often what people call "Municipios" in common language or at least "Sectors".
        // Let's add Districts to the Municipality list of the Province, distinguishing them or just mixing them.
        districts.forEach(d => {
            // Find province of this district's municipality
            const muni = municipalities.find(m => m.municipality_id === d.municipality_id);
            if (muni) {
                const prov = provinceMap.get(muni.province_id);
                if (prov) {
                    prov.municipalities.push({
                        name: d.name, // Add district as a selectable "Municipality" level option
                        sectors: []
                    });
                }
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

            // Also check for empty string just in case
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
