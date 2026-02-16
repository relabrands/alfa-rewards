
const BASE_URL = 'https://raw.githubusercontent.com/DannyFeliz/Datos-Rep-Dom/master/JSON/';

async function checkStructure() {
    try {
        const pRes = await fetch(BASE_URL + 'provincias.json');
        const provinces = await pRes.json();
        console.log('Province [0]:', JSON.stringify(provinces[0], null, 2));

        const mRes = await fetch(BASE_URL + 'municipios.json');
        const municipalities = await mRes.json();
        console.log('Municipality [0]:', JSON.stringify(municipalities[0], null, 2));

    } catch (e) {
        console.error(e);
    }
}

checkStructure();
