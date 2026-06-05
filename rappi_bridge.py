"""
==============================================================
  BRIDGE PYTHON ↔ NODE.JS — SISTEMA RAPPI LIMA
  Uso: python rappi_bridge.py [nodos] [semilla]

  Node.js lo llama así:
    spawn('python', ['rappi_bridge.py', '1500', '42'])

  Devuelve JSON por stdout con esta estructura:
  {
    "ok": true,
    "origen":  { "id":…, "nombre":…, "distrito":… },
    "destino": { "id":…, "nombre":…, "distrito":… },
    "resultados": {
      "A*":      { "tiempo_min":…, "distancia_km":…, "costo_sol":…,
                   "n_paradas":…, "pedidos":…, "exec_ms":…,
                   "nodos_visitados":…, "camino": […] },
      "Dijkstra": { … },
      "BFS":      { … },
      "DFS":      { … }
    },
    "ahorro_astar_vs_dijkstra_pct": 42.5
  }
==============================================================
"""

from rappi_algoritmos import (a_estrella, dijkstra, bfs, dfs,
                              calcular_metricas_ruta)
from rappi_generar_dataset import generar_nodos, generar_aristas
import sys
import json
import time
import os
import random

# Asegura que Python encuentre los módulos del proyecto
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def construir_grafo_dict(df_aristas):
    grafo = {}
    for _, r in df_aristas.iterrows():
        o = int(r["origen"])
        d = int(r["destino"])
        grafo.setdefault(o, []).append((d, {
            "distancia_km": float(r["distancia_km"]),
            "tiempo_min":   float(r["tiempo_min"]),
            "costo_sol":    float(r["costo_sol"]),
        }))
    return grafo


def elegir_par_valido(df_nodos, grafo, semilla=42):
    """Busca restaurante→cliente con ruta válida usando A*."""
    random.seed(semilla)
    restaurantes = df_nodos[df_nodos["tipo"]
                            == "restaurante"]["nodo_id"].tolist()
    clientes = df_nodos[df_nodos["tipo"] == "cliente"]["nodo_id"].tolist()

    for _ in range(500):
        o = random.choice(restaurantes)
        d = random.choice(clientes)
        if o in grafo and o != d:
            _, camino, _ = a_estrella(grafo, o, d, df_nodos, peso="tiempo_min")
            if len(camino) >= 2:
                return o, d
    return restaurantes[0], clientes[0]


def main():
    # Parámetros opcionales desde Node
    n_nodos = int(sys.argv[1]) if len(sys.argv) > 1 else 1500
    semilla = int(sys.argv[2]) if len(
        sys.argv) > 2 else random.randint(1, 9999)

    try:
        # 1. Generar dataset
        os.makedirs("data", exist_ok=True)
        df_nodos = generar_nodos(n_nodos)
        df_aristas = generar_aristas(df_nodos)

        # 2. Construir grafo
        grafo = construir_grafo_dict(df_aristas)

        # 3. Elegir par
        origen, destino = elegir_par_valido(df_nodos, grafo, semilla)
        info_o = df_nodos[df_nodos["nodo_id"] == origen].iloc[0]
        info_d = df_nodos[df_nodos["nodo_id"] == destino].iloc[0]

        # 4. Correr los 4 algoritmos
        resultados = {}

        # A*
        t0 = time.perf_counter()
        costo_a, cam_a, vis_a = a_estrella(grafo, origen, destino,
                                           df_nodos, peso="tiempo_min")
        ms_a = round((time.perf_counter() - t0) * 1000, 2)
        resultados["A*"] = {
            **calcular_metricas_ruta(cam_a, grafo, df_nodos),
            "exec_ms":        ms_a,
            "nodos_visitados": len(vis_a),
            "camino":          cam_a,
            "costo_total":     round(costo_a, 2),
        }

        # Dijkstra
        t0 = time.perf_counter()
        costo_d, cam_d, vis_d = dijkstra(grafo, origen, destino, "tiempo_min")
        ms_d = round((time.perf_counter() - t0) * 1000, 2)
        resultados["Dijkstra"] = {
            **calcular_metricas_ruta(cam_d, grafo, df_nodos),
            "exec_ms":         ms_d,
            "nodos_visitados": len(vis_d),
            "camino":          cam_d,
            "costo_total":     round(costo_d, 2),
        }

        # BFS
        t0 = time.perf_counter()
        cam_b, vis_b = bfs(grafo, origen, destino)
        ms_b = round((time.perf_counter() - t0) * 1000, 2)
        resultados["BFS"] = {
            **calcular_metricas_ruta(cam_b, grafo, df_nodos),
            "exec_ms":         ms_b,
            "nodos_visitados": len(vis_b),
            "camino":          cam_b,
            "costo_total":     None,
        }

        # DFS
        t0 = time.perf_counter()
        cam_f, vis_f = dfs(grafo, origen, destino)
        ms_f = round((time.perf_counter() - t0) * 1000, 2)
        resultados["DFS"] = {
            **calcular_metricas_ruta(cam_f, grafo, df_nodos),
            "exec_ms":         ms_f,
            "nodos_visitados": len(vis_f),
            "camino":          cam_f,
            "costo_total":     None,
        }

        # 5. Calcular ahorro A* vs Dijkstra
        n_astar = len(vis_a)
        n_dijkstra = len(vis_d)
        ahorro_pct = round((1 - n_astar / n_dijkstra) *
                           100, 1) if n_dijkstra > 0 else 0

        # 6. Imprimir JSON limpio por stdout (Node lo captura)
        salida = {
            "ok": True,
            "n_nodos":   len(df_nodos),
            "n_aristas": len(df_aristas),
            "origen": {
                "id":       int(origen),
                "nombre":   str(info_o["nombre"]),
                "tipo":     str(info_o["tipo"]),
                "distrito": str(info_o["distrito"]),
                "lat":      float(info_o["latitud"]),
                "lng":      float(info_o["longitud"]),
            },
            "destino": {
                "id":       int(destino),
                "nombre":   str(info_d["nombre"]),
                "tipo":     str(info_d["tipo"]),
                "distrito": str(info_d["distrito"]),
                "lat":      float(info_d["latitud"]),
                "lng":      float(info_d["longitud"]),
            },
            "resultados":                     resultados,
            "ahorro_astar_vs_dijkstra_pct":   ahorro_pct,
        }

        # stdout = solo JSON (Node parsea esto)
        print(json.dumps(salida, ensure_ascii=False))

    except Exception as e:
        # En caso de error, Node recibe un JSON de error
        print(json.dumps({
            "ok":    False,
            "error": str(e),
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
