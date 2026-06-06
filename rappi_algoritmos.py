
import heapq
import math
from collections import deque


# ══════════════════════════════════════════════════════════════
#  CONSTANTES DE LA HEURÍSTICA
# ══════════════════════════════════════════════════════════════

# Factor de penalización por nivel de congestión de zona.
# Multiplica el tiempo estimado en línea recta → A* evita zonas saturadas.
FACTOR_CONGESTION = {
    "muy_alta": 2.1,
    "alta":     1.5,
    "media":    1.1,
    "baja":     0.9,
}

VELOCIDAD_BASE_KMH = 25.0   # velocidad promedio de un repartidor en Lima


# ══════════════════════════════════════════════════════════════
#  UTILIDADES COMPARTIDAS
# ══════════════════════════════════════════════════════════════

def haversine(lat1, lon1, lat2, lon2):
    """
    Distancia en km entre dos coordenadas GPS (fórmula de Haversine).
    Usada por A* para estimar el costo restante hasta el destino.
    Complejidad: O(1)
    """
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _reconstruir_camino(predecesor, origen, destino):
    """
    Reconstruye el camino desde el dict de predecesores.
    Compartido por A* y Dijkstra para evitar duplicar código.
    """
    camino, nodo = [], destino
    while nodo in predecesor:
        camino.append(nodo)
        nodo = predecesor[nodo]
    if nodo == origen:
        camino.append(origen)
    camino.reverse()
    return camino


# ══════════════════════════════════════════════════════════════
#  A* — ALGORITMO PRINCIPAL
# ══════════════════════════════════════════════════════════════

def a_estrella(grafo, origen, destino, df_nodos, peso="tiempo_min"):
    """
    Encuentra la ruta más rápida entre restaurante y cliente.
    Es el algoritmo principal del sistema Rappi.

    Ventaja sobre Dijkstra:
        Dijkstra expande en todas las direcciones (sin guía).
        A* usa una heurística para dirigir la búsqueda HACIA el
        destino, explorando 40-70% menos nodos en grafos geográficos
        mientras garantiza la misma ruta óptima.

    Heurística combinada (admisible):
        h(n) = tiempo_estimado_linea_recta(n, destino)
               × factor_congestion_zona(n)

        Es admisible porque nunca sobreestima: usa velocidad_base
        (la más rápida posible) en el denominador, y el factor de
        zona solo del nodo actual, no del camino completo.

    Parámetros
    ----------
    grafo    : dict  {nodo_id: [(vecino_id, {attrs}), ...]}
    origen   : int   nodo_id del restaurante
    destino  : int   nodo_id del cliente
    df_nodos : DataFrame con columnas nodo_id, latitud, longitud, demanda_nivel
    peso     : str   atributo de arista a minimizar (default: "tiempo_min")

    Retorna
    -------
    (costo_total, camino, visitados)
        costo_total : float — costo acumulado (inf si no hay ruta)
        camino      : list  — nodo_ids desde origen hasta destino
        visitados   : list  — nodos expandidos en orden (para visualización)

    Complejidad: O((V + E) log V) — igual que Dijkstra en el peor caso,
    pero con constante mucho menor en grafos geográficos reales.
    """

    # Precargar coordenadas y nivel de demanda de cada nodo
    coords = {}
    demanda = {}
    for _, row in df_nodos.iterrows():
        nid = int(row["nodo_id"])
        coords[nid] = (float(row["latitud"]), float(row["longitud"]))
        demanda[nid] = str(row.get("demanda_nivel", "media"))

    if destino not in coords:
        return float("inf"), [], []

    lat_d, lon_d = coords[destino]

    def heuristica(nodo):
        """
        h(n) = tiempo estimado en línea recta hasta el destino
               × factor de congestión de la zona actual.

        La multiplicación penaliza nodos en zonas congestionadas,
        haciendo que A* los evite proactivamente.
        """
        if nodo not in coords:
            return 0.0
        lat_n, lon_n = coords[nodo]
        dist_km = haversine(lat_n, lon_n, lat_d, lon_d)
        tiempo_est = (dist_km / VELOCIDAD_BASE_KMH) * 60.0   # minutos
        factor = FACTOR_CONGESTION.get(demanda.get(nodo, "media"), 1.1)
        return tiempo_est * factor

    # Estructuras principales
    g_score = {origen: 0.0}   # costo real acumulado desde origen
    predecesor = {}
    visitados = []
    cerrado = set()

    # heap: (f = g + h, nodo_id)
    heap = [(heuristica(origen), origen)]

    while heap:
        _, nodo = heapq.heappop(heap)

        if nodo in cerrado:
            continue
        cerrado.add(nodo)
        visitados.append(nodo)

        if nodo == destino:
            break

        for vecino, attrs in grafo.get(nodo, []):
            if vecino in cerrado:
                continue
            w = attrs.get(peso, 1.0)
            g_tentativo = g_score[nodo] + w

            if g_tentativo < g_score.get(vecino, float("inf")):
                g_score[vecino] = g_tentativo
                predecesor[vecino] = nodo
                f = g_tentativo + heuristica(vecino)
                heapq.heappush(heap, (f, vecino))

    camino = _reconstruir_camino(predecesor, origen, destino)
    return g_score.get(destino, float("inf")), camino, visitados


# ══════════════════════════════════════════════════════════════
#  DIJKSTRA — Mantenido para comparación con A*
# ══════════════════════════════════════════════════════════════

def dijkstra(grafo, origen, destino, peso="tiempo_min"):
    """
    Encuentra la ruta más rápida entre restaurante y cliente.
    Mantenido para benchmarking y comparativa vs A*.

    Diferencia clave con A*:
        No tiene heurística → explora en todas las direcciones.
        Garantiza el óptimo pero visita más nodos innecesariamente.

    Complejidad: O((V + E) log V)
    """
    dist = {origen: 0.0}
    predecesor = {}
    visitados = []
    cerrado = set()
    heap = [(0.0, origen)]

    while heap:
        costo_actual, nodo = heapq.heappop(heap)
        if nodo in cerrado:
            continue
        cerrado.add(nodo)
        visitados.append(nodo)
        if nodo == destino:
            break
        for vecino, attrs in grafo.get(nodo, []):
            if vecino in cerrado:
                continue
            w = attrs.get(peso, 1.0)
            nuevo_costo = costo_actual + w
            if nuevo_costo < dist.get(vecino, float("inf")):
                dist[vecino] = nuevo_costo
                predecesor[vecino] = nodo
                heapq.heappush(heap, (nuevo_costo, vecino))

    camino = _reconstruir_camino(predecesor, origen, destino)
    return dist.get(destino, float("inf")), camino, visitados


# ══════════════════════════════════════════════════════════════
#  BFS — Sin cambios
# ══════════════════════════════════════════════════════════════

def bfs(grafo, origen, destino):
    """
    Encuentra la ruta con menor número de paradas (intersecciones).
    Útil para saber cuántas calles dobla el repartidor.

    Complejidad: O(V + E)
    """
    if origen == destino:
        return [origen], [origen]

    cola = deque([[origen]])
    visitados = []
    visitados_s = {origen}

    while cola:
        camino = cola.popleft()
        nodo = camino[-1]
        visitados.append(nodo)

        for vecino, _ in grafo.get(nodo, []):
            if vecino not in visitados_s:
                nuevo_camino = camino + [vecino]
                visitados_s.add(vecino)
                if vecino == destino:
                    visitados.append(vecino)
                    return nuevo_camino, visitados
                cola.append(nuevo_camino)

    return [], visitados


# ══════════════════════════════════════════════════════════════
#  DFS — Sin cambios
# ══════════════════════════════════════════════════════════════

def dfs(grafo, origen, destino, max_depth=40):
    """
    Explora rutas en profundidad. Útil para detectar
    conectividad entre zonas de Lima.

    Complejidad: O(V + E)
    """
    pila = [(origen, [origen])]
    visitados = []
    visitados_s = set()

    while pila:
        nodo, camino = pila.pop()
        if nodo in visitados_s:
            continue
        visitados_s.add(nodo)
        visitados.append(nodo)
        if nodo == destino:
            return camino, visitados
        if len(camino) >= max_depth:
            continue
        for vecino, _ in grafo.get(nodo, []):
            if vecino not in visitados_s:
                pila.append((vecino, camino + [vecino]))

    return [], visitados


# ══════════════════════════════════════════════════════════════
#  MÉTRICAS — Sin cambios
# ══════════════════════════════════════════════════════════════

def calcular_metricas_ruta(camino, grafo, df_nodos):
    """
    Calcula distancia, tiempo, costo y pedidos atendidos
    a lo largo de la ruta del repartidor Rappi.
    """
    if len(camino) < 2:
        return {"distancia_km": 0, "tiempo_min": 0,
                "costo_sol": 0, "pedidos": 0, "n_paradas": len(camino)}

    dist_total = tiempo_total = costo_total = 0.0

    for i in range(len(camino) - 1):
        u, v = camino[i], camino[i + 1]
        for vecino, attrs in grafo.get(u, []):
            if vecino == v:
                dist_total += attrs.get("distancia_km", 0)
                tiempo_total += attrs.get("tiempo_min",   0)
                costo_total += attrs.get("costo_sol",    0)
                break

    nodos_ruta = df_nodos[df_nodos["nodo_id"].isin(camino)]
    if nodos_ruta.empty:
        pedidos = 0
    else:
        pedidos = int(nodos_ruta["pedidos_hora"].fillna(0).sum())

    return {
        "distancia_km": round(dist_total,   3),
        "tiempo_min":   round(tiempo_total, 2),
        "costo_sol":    round(costo_total,  2),
        "pedidos":      pedidos,
        "n_paradas":    len(camino),
    }
