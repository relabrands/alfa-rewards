
const BASE_URL = 'https://raw.githubusercontent.com/DannyFeliz/Datos-Rep-Dom/master/JSON/';

async function checkSectorStructure() {
    try {
        const sRes = await fetch(BASE_URL + 'secciones.json');
        const sections = await sRes.json();
        console.log('Section [0]:', JSON.stringify(sections[0], null, 2));

        const bRes = await fetch(BASE_URL + 'barrios.json');
        const barrios = await bRes.json();
        console.log('Barrio [0]:', JSON.stringify(barrios[0], null, 2));

    } catch (e) {
        console.error(e);
    }
}

checkSectorStructure();
