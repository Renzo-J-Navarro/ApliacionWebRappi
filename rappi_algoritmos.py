"""
==============================================================
  ALGORITMOS DE BÚSQUEDA — SISTEMA RAPPI
  Dijkstra · BFS · DFS
  Complejidad Algorítmica 1ACC0184 - 2026-10
==============================================================
"""

import heapq
from collections import deque


def dijkstra(grafo, origen, destino, peso="tiempo_min"):
    """
    Encuentra la ruta más rápida entre restaurante y cliente.
    Usado por Rappi para calcular el tiempo de entrega mínimo.

    Complejidad: O((V + E) log V)
    """
    dist = {origen: 0.0}
    predecesor = {}
    visitados = []
    heap = [(0.0, origen)]

    while heap:
        costo_actual, nodo = heapq.heappop(heap)
        if nodo in visitados:
            continue
        visitados.append(nodo)
        if nodo == destino:
            break
        for vecino, attrs in grafo.get(nodo, []):
            w = attrs.get(peso, 1.0)
            nuevo_costo = costo_actual + w
            if nuevo_costo < dist.get(vecino, float("inf")):
                dist[vecino] = nuevo_costo
                predecesor[vecino] = nodo
                heapq.heappush(heap, (nuevo_costo, vecino))

    # Reconstruir camino
    camino, nodo = [], destino
    while nodo in predecesor:
        camino.append(nodo)
        nodo = predecesor[nodo]
    if nodo == origen:
        camino.append(origen)
    camino.reverse()

    return dist.get(destino, float("inf")), camino, visitados


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
        u, v = camino[i], camino[i+1]
        for vecino, attrs in grafo.get(u, []):
            if vecino == v:
                dist_total += attrs.get("distancia_km", 0)
                tiempo_total += attrs.get("tiempo_min",   0)
                costo_total += attrs.get("costo_sol",    0)
                break

    nodos_ruta = df_nodos[df_nodos["nodo_id"].isin(camino)]
    pedidos = int(nodos_ruta["pedidos_hora"].sum())

    return {
        "distancia_km": round(dist_total,   3),
        "tiempo_min":   round(tiempo_total, 2),
        "costo_sol":    round(costo_total,  2),
        "pedidos":      pedidos,
        "n_paradas":    len(camino),
    }
