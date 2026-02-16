
const BASE_URL = 'https://raw.githubusercontent.com/DannyFeliz/Datos-Rep-Dom/master/JSON/';

async function inspectMuni() {
    try {
        const mRes = await fetch(BASE_URL + 'municipios.json');
        const municipalities = await mRes.json();
        const sde = municipalities.find(m => m.nombre.includes("Santo Domingo Este"));
        console.log("SDE Object:", JSON.stringify(sde, null, 2));
    } catch (e) {
        console.error(e);
    }
}

inspectMuni();
