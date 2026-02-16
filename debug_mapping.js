
const BASE_URL = 'https://raw.githubusercontent.com/DannyFeliz/Datos-Rep-Dom/master/JSON/';

async function simulateMapping() {
    try {
        console.log("Fetching data...");
        const [pRes, mRes, dRes, sRes, bRes] = await Promise.all([
            fetch(BASE_URL + 'provincias.json'),
            fetch(BASE_URL + 'municipios.json'),
            fetch(BASE_URL + 'distritos.json'),
            fetch(BASE_URL + 'secciones.json'),
            fetch(BASE_URL + 'barrios.json')
        ]);

        const provinces = await pRes.json();
        const municipalities = await mRes.json();
        const districts = await dRes.json();
        const sections = await sRes.json();
        const barrios = await bRes.json();

        console.log(`Loaded: ${provinces.length} provs, ${municipalities.length} munis, ${sections.length} sections, ${barrios.length} barrios`);

        // --- MAPPING LOGIC START ---

        // Map: SeccionID -> List of Barrio Names
        const sectionToBarriosMap = new Map();
        barrios.forEach(b => {
            const list = sectionToBarriosMap.get(b.seccionId) || [];
            list.push(b.nombre);
            sectionToBarriosMap.set(b.seccionId, list);
        });

        // Map: MunicipalityID -> Set of Sector Names
        const municipalitySectorsMap = new Map();
        // Map: DistrictID -> Set of Sector Names
        const districtSectorsMap = new Map();

        sections.forEach(s => {
            const barriosList = sectionToBarriosMap.get(s.id) || [];
            const namesToAdd = barriosList.length > 0 ? barriosList : [s.nombre];

            if (s.distritoId) {
                const set = districtSectorsMap.get(s.distritoId) || new Set();
                namesToAdd.forEach(n => set.add(n));
                districtSectorsMap.set(s.distritoId, set);
            } else if (s.municipioId) {
                const set = municipalitySectorsMap.get(s.municipioId) || new Set();
                namesToAdd.forEach(n => set.add(n));
                municipalitySectorsMap.set(s.municipioId, set);
            }
        });

        // Test Specific Case: Distrito Nacional (Brand: 1, Name: Distrito Nacional) -> Muni: Santo Domingo de Guzmán (ID: 1)
        const TEST_MUNI_ID = 1;
        const muniName = municipalities.find(m => m.id === TEST_MUNI_ID)?.nombre;
        const sectors = municipalitySectorsMap.get(TEST_MUNI_ID);

        console.log(`\nTest Municipality: ${muniName} (ID: ${TEST_MUNI_ID})`);
        console.log(`Sectors Found: ${sectors ? sectors.size : 0}`);
        if (sectors) console.log(Array.from(sectors).slice(0, 5));

        // Test Specific Case: Santo Domingo Este (ID: ??)
        const sde = municipalities.find(m => m.nombre.includes("Santo Domingo Este"));
        if (sde) {
            const sdeSectors = municipalitySectorsMap.get(sde.id);
            console.log(`\nTest Municipality: ${sde.nombre} (ID: ${sde.id})`);
            console.log(`Sectors Found: ${sdeSectors ? sdeSectors.size : 0}`);
            if (sdeSectors) console.log(Array.from(sdeSectors).slice(0, 5));
        }

    } catch (e) {
        console.error(e);
    }
}

simulateMapping();
