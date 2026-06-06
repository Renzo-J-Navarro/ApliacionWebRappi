"""
==============================================================
  GENERADOR DE DATASET — SISTEMA RAPPI LIMA
  Optimización de Rutas de Reparto de Comida

  Tipos de nodo:
    restaurante  → origen del pedido (Bembos, KFC, etc.)
    hub_rappi    → zona de alta demanda / concentración
    interseccion → esquinas y cruces de avenidas
    cliente      → destino final del pedido
==============================================================
"""

import pandas as pd
import numpy as np
import random
import os


ZONAS_LIMA = [
    ("Miraflores",        -12.1191, -77.0282, "muy_alta"),
    ("San Isidro",        -12.0975, -77.0368, "muy_alta"),
    ("Barranco",          -12.1453, -77.0217, "alta"),
    ("Surco",             -12.1470, -76.9997, "alta"),
    ("San Borja",         -12.1084, -77.0005, "alta"),
    ("La Molina",         -12.0835, -76.9446, "media"),
    ("Chorrillos",        -12.1700, -77.0225, "media"),
    ("Lince",             -12.0850, -77.0367, "media"),
    ("Jesus Maria",       -12.0733, -77.0433, "media"),
    ("Magdalena",         -12.0892, -77.0683, "media"),
    ("San Miguel",        -12.0769, -77.0867, "media"),
    ("Pueblo Libre",      -12.0747, -77.0617, "media"),
    ("Ate",               -12.0300, -76.9100, "baja"),
    ("Santa Anita",       -12.0469, -76.9619, "baja"),
    ("El Agustino",       -12.0400, -77.0100, "baja"),
    ("San Juan Lurig",    -12.1600, -76.9800, "baja"),
    ("Villa El Salvador", -12.2100, -76.9400, "baja"),
    ("Villa Maria",       -12.1634, -76.9411, "baja"),
    ("Los Olivos",        -11.9900, -77.0700, "baja"),
    ("San Martin Porres", -12.0200, -77.0700, "baja"),
    ("Independencia",     -11.9900, -77.0600, "baja"),
    ("Comas",             -11.9400, -77.0500, "baja"),
    ("Brena",             -12.0619, -77.0536, "media"),
    ("Lima Cercado",      -12.0453, -77.0311, "media"),
    ("Rimac",             -12.0286, -77.0317, "baja"),
    ("Callao",            -12.0560, -77.1180, "baja"),
    ("Lurin",             -12.2780, -76.8700, "baja"),
    ("Pachacamac",        -12.2320, -76.8720, "baja"),
    ("Carabayllo",        -11.8800, -77.0300, "baja"),
    ("Puente Piedra",     -11.8700, -77.0800, "baja"),
]

RESTAURANTES = [
    "Bembos", "KFC", "McDonald's", "Pizza Hut", "Domino's",
    "Chili's", "TGI Fridays", "Popeyes", "Burger King", "Pardos Chicken",
    "La Lucha", "El Corral", "Don Belisario", "Norkys", "Rockys",
    "Mediterraneo", "Tanta", "La Mar", "Osaka", "Segundo Muelle",
    "Sushi Ito", "China Wok", "Chifa Titi", "Isolina", "Central",
    "Maido", "Rafael", "Astrid Gaston", "Costanera 700", "El Mercado",
]

AVENIDAS = [
    "Av. Larco", "Av. Arequipa", "Av. Javier Prado", "Av. Benavides",
    "Av. Angamos", "Av. Petit Thouars", "Av. Santa Cruz", "Av. Caminos del Inca",
    "Av. Primavera", "Av. El Derby", "Av. La Encalada", "Av. Tomas Marsano",
    "Av. Aviacion", "Av. Universitaria", "Av. Brasil", "Av. Salaverry",
    "Av. 28 de Julio", "Av. Colonial", "Via Expresa", "Av. La Marina",
]

FACTOR_CONGESTION = {
    "muy_alta": (1.8, 2.5),
    "alta":     (1.3, 1.8),
    "media":    (1.0, 1.3),
    "baja":     (0.8, 1.0),
}

TIPOS = ["restaurante", "hub_rappi", "interseccion", "cliente"]
PESOS_TIPO = [0.04,          0.06,        0.50,           0.40]


def generar_nodos(n=1500):
    nodos = []
    cont_rest = 0
    for i in range(n):
        distrito, lat_b, lon_b, demanda_nivel = random.choice(ZONAS_LIMA)
        lat = lat_b + np.random.uniform(-0.022, 0.022)
        lon = lon_b + np.random.uniform(-0.022, 0.022)
        tipo = np.random.choice(TIPOS, p=PESOS_TIPO)

        if tipo == "restaurante":
            nombre = f"{RESTAURANTES[cont_rest % len(RESTAURANTES)]} ({distrito})"
            pedidos_hora = random.randint(10, 80)
            capacidad = random.randint(20, 100)
            cont_rest += 1
        elif tipo == "hub_rappi":
            nombre = f"Hub Rappi {distrito}"
            pedidos_hora = random.randint(100, 500)
            capacidad = random.randint(200, 500)
        elif tipo == "interseccion":
            nombre = f"Intersec. {random.choice(AVENIDAS)} ({distrito})"
            pedidos_hora = 0
            capacidad = 0
        else:
            nombre = f"Cliente #{i} ({distrito})"
            pedidos_hora = random.randint(1, 5)
            capacidad = random.randint(1, 3)

        nodos.append({
            "nodo_id":       i,
            "nombre":        nombre,
            "tipo":          tipo,
            "distrito":      distrito,
            "demanda_nivel": demanda_nivel,
            "latitud":       round(lat, 6),
            "longitud":      round(lon, 6),
            "pedidos_hora":  pedidos_hora,
            "capacidad":     capacidad,
        })
    return pd.DataFrame(nodos)


def distancia_haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = (np.sin(dlat/2)**2 +
         np.cos(np.radians(lat1))*np.cos(np.radians(lat2))*np.sin(dlon/2)**2)
    return R * 2 * np.arcsin(np.sqrt(a))


def calcular_tiempo(distancia_km, demanda_nivel):
    velocidad_base = 25.0
    tiempo_base = (distancia_km / velocidad_base) * 60
    fmin, fmax = FACTOR_CONGESTION[demanda_nivel]
    factor = random.uniform(fmin, fmax)
    return round(tiempo_base * factor + random.uniform(0.5, 2.0), 2)


def generar_aristas(df_nodos, max_dist_km=3.0, max_vecinos=6):
    aristas = []
    coords = df_nodos[["latitud", "longitud"]].values
    ids = df_nodos["nodo_id"].values
    tipos = df_nodos["tipo"].values
    demandas = df_nodos["demanda_nivel"].values
    n = len(ids)

    for i in range(n):
        dists = []
        for j in range(n):
            if i == j:
                continue
            d = distancia_haversine(
                coords[i, 0], coords[i, 1], coords[j, 0], coords[j, 1])
            limite = max_dist_km * \
                1.4 if tipos[i] == "restaurante" else max_dist_km
            if d <= limite:
                dists.append((d, j))
        dists.sort()
        for d, j in dists[:max_vecinos]:
            congestion = random.choice(["baja", "media", "alta"])
            tiempo = calcular_tiempo(d, demandas[i])
            costo = round(d * 1.2 + random.uniform(0.3, 1.5), 2)
            aristas.append({
                "origen":       int(ids[i]),
                "destino":      int(ids[j]),
                "via":          random.choice(AVENIDAS),
                "distancia_km": round(d, 4),
                "tiempo_min":   tiempo,
                "costo_sol":    costo,
                "congestion":   congestion,
                "demanda_zona": demandas[i],
            })

    return pd.DataFrame(aristas).drop_duplicates(subset=["origen", "destino"])


if __name__ == "__main__":
    os.makedirs("backend/data", exist_ok=True)
    print("Generando nodos Rappi Lima (1500)...")
    df_nodos = generar_nodos(1500)
    df_nodos.to_csv("backend/data/nodos_rappi.csv", index=False)

    print("Generando aristas (calles de Lima)...")
    df_aristas = generar_aristas(df_nodos)
    df_aristas.to_csv("backend/data/aristas_rappi.csv", index=False)

    print(f"\nNodos  : {len(df_nodos):,}")
    print(f"Aristas: {len(df_aristas):,}")
    print(df_nodos["tipo"].value_counts().to_string())
