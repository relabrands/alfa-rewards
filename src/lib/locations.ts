// Dominican Republic Locations Structure
// Moved to separate file to avoid circular dependency issues

export const DR_LOCATIONS: Record<string, string[]> = {
    "Distrito Nacional": [
        "Piantini", "Naco", "Evaristo Morales", "Bella Vista", "Cacicazgos",
        "Mirador Sur", "Mirador Norte", "Los Prados", "Julieta Morales",
        "Paraíso", "Ensanche Quisqueya", "La Julia", "Zona Colonial",
        "Gascue", "Ciudad Universitaria", "Ensanche La Fe", "Villa Juana",
        "Villa Consuelo", "Arroyo Hondo", "Los Ríos"
    ],
    "Santo Domingo Este": [
        "Alma Rosa", "Ensanche Ozama", "Los Minas", "Villa Duarte",
        "San Isidro", "Invivienda", "Los Tres Ojos", "Brisas del Este"
    ],
    "Santo Domingo Oeste": [
        "Herrera", "Las Caobas", "Manoguayabo", "Los Alcarrizos"
    ],
    "Santo Domingo Norte": [
        "Villa Mella", "Sabana Perdida", "Guaricanos"
    ],
    "Santiago": [
        "Los Jardines", "Villa Olga", "La Trinitaria", "Gurabo",
        "Pekín", "Cienfuegos", "El Embrujo"
    ],
    "La Romana": [
        "Casa de Campo", "Buena Vista", "Villa Verde", "El Centro"
    ],
    "San Pedro de Macorís": [
        "Miramar", "Barrio Lindo", "Placer Bonito", "Villa Velásquez"
    ],
    "San Cristóbal": [
        "Madre Vieja", "Lavapiés", "Pueblo Nuevo", "Los Nova"
    ],
    "La Vega": [
        "Villa Rosa", "Las Carolinas", "El Vedado", "Pontón"
    ],
    "San Francisco de Macorís": [
        "Urbanización Piña", "El Ciruelillo", "Los Maestros", "Pueblo Nuevo"
    ],
    "Puerto Plata": [
        "Torre Alta", "Bayardo", "Los Reyes", "San Marcos"
    ],
    "Punta Cana": [
        "Bávaro", "Verón", "Cap Cana", "Punta Cana Village"
    ]
};

// Flattened list using reduce for maximum compatibility
export const SECTORS = Object.values(DR_LOCATIONS).reduce((acc, val) => acc.concat(val), [] as string[]).sort();
