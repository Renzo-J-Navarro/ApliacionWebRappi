
from rappi_visualizacion_ruta import plot_recorrido_legible
from rappi_visualizacion import (construir_grafo_nx, plot_red_rappi,
                                 plot_zona_alta_demanda, plot_dashboard)
from rappi_algoritmos import (a_estrella, dijkstra, bfs, dfs,
                              calcular_metricas_ruta)
from rappi_generar_dataset import generar_nodos, generar_aristas
import sys
import json
import time
import os
import random

# Forzar codificación UTF-8 en las salidas estándar (AÑADE ESTAS LÍNEAS):
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


OUTPUT_DIR = "backend/output_imagenes"


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
    n_nodos = int(sys.argv[1]) if len(sys.argv) > 1 else 1500
    semilla = int(sys.argv[2]) if len(
        sys.argv) > 2 else random.randint(1, 9999)

    try:
        os.makedirs("backend/data",       exist_ok=True)
        os.makedirs(OUTPUT_DIR,   exist_ok=True)

        # ── 1. Dataset ──────────────────────────────────────
        df_nodos = generar_nodos(n_nodos)
        df_aristas = generar_aristas(df_nodos)
        grafo = construir_grafo_dict(df_aristas)

        # ── 2. Par válido ────────────────────────────────────
        origen, destino = elegir_par_valido(df_nodos, grafo, semilla)
        info_o = df_nodos[df_nodos["nodo_id"] == origen].iloc[0]
        info_d = df_nodos[df_nodos["nodo_id"] == destino].iloc[0]

        # ── 3. Algoritmos ────────────────────────────────────
        resultados = {}

        t0 = time.perf_counter()
        costo_a, cam_a, vis_a = a_estrella(
            grafo, origen, destino, df_nodos, peso="tiempo_min")
        resultados["A*"] = {
            **calcular_metricas_ruta(cam_a, grafo, df_nodos),
            "exec_ms": round((time.perf_counter()-t0)*1000, 2),
            "nodos_visitados": len(vis_a), "camino": cam_a,
            "costo_total": round(costo_a, 2),
        }

        t0 = time.perf_counter()
        costo_d, cam_d, vis_d = dijkstra(grafo, origen, destino, "tiempo_min")
        resultados["Dijkstra"] = {
            **calcular_metricas_ruta(cam_d, grafo, df_nodos),
            "exec_ms": round((time.perf_counter()-t0)*1000, 2),
            "nodos_visitados": len(vis_d), "camino": cam_d,
            "costo_total": round(costo_d, 2),
        }

        t0 = time.perf_counter()
        cam_b, vis_b = bfs(grafo, origen, destino)
        resultados["BFS"] = {
            **calcular_metricas_ruta(cam_b, grafo, df_nodos),
            "exec_ms": round((time.perf_counter()-t0)*1000, 2),
            "nodos_visitados": len(vis_b), "camino": cam_b,
            "costo_total": None,
        }

        t0 = time.perf_counter()
        cam_f, vis_f = dfs(grafo, origen, destino)
        resultados["DFS"] = {
            **calcular_metricas_ruta(cam_f, grafo, df_nodos),
            "exec_ms": round((time.perf_counter()-t0)*1000, 2),
            "nodos_visitados": len(vis_f), "camino": cam_f,
            "costo_total": None,
        }

        ahorro_pct = round((1 - len(vis_a)/len(vis_d))*100, 1) if vis_d else 0

        # ── 4. Visualizaciones ───────────────────────────────
        # Grafo NetworkX (muestra de 800 nodos para velocidad)
        G = construir_grafo_nx(df_nodos, df_aristas, muestra=800)

        # 4a. Red completa de Lima
        path_red = f"{OUTPUT_DIR}/01_red_rappi_lima.png"
        plot_red_rappi(G, output=path_red)

        # 4b. Ruta por cada algoritmo (PNG + CSV)
        caminos = {a: r["camino"] for a, r in resultados.items()}
        metricas = {a: {k: v for k, v in r.items()
                        if k not in ("camino", "nodos_visitados", "exec_ms", "costo_total")}
                    for a, r in resultados.items()}
        plot_recorrido_legible(caminos, grafo, G, df_nodos, metricas,
                               info_o, info_d, output_dir=OUTPUT_DIR)

        # 4c. Zona de alta demanda (usa ruta A* como principal)
        path_zona = f"{OUTPUT_DIR}/03_zona_alta_demanda.png"
        plot_zona_alta_demanda(G, df_nodos, str(info_o["distrito"]),
                               camino_dijkstra=cam_a,
                               output=path_zona)

        # 4d. Dashboard de métricas comparativas
        path_dash = f"{OUTPUT_DIR}/04_dashboard_rappi.png"
        plot_dashboard(metricas, output=path_dash)

        # ── 5. Rutas URL de imágenes para el frontend ────────
        # Node sirve output_imagenes/ en /imagenes/ (ver server.js)
        def url(fname):
            base = os.path.basename(fname)
            return f"/output_imagenes/{base}"

        imagenes = {
            "red_lima":     url(path_red),
            "zona_demanda": url(path_zona),
            "dashboard":    url(path_dash),
            "rutas": {
                algo: url(f"{OUTPUT_DIR}/02_{algo.lower()}_ruta.png")
                for algo in ["A*", "Dijkstra", "BFS", "DFS"]
            },
        }

        # ── 6. JSON final por stdout ─────────────────────────
        print(json.dumps({
            "ok":        True,
            "n_nodos":   len(df_nodos),
            "n_aristas": len(df_aristas),
            "origen": {
                "id": int(origen), "nombre": str(info_o["nombre"]),
                "tipo": str(info_o["tipo"]), "distrito": str(info_o["distrito"]),
                "lat": float(info_o["latitud"]), "lng": float(info_o["longitud"]),
            },
            "destino": {
                "id": int(destino), "nombre": str(info_d["nombre"]),
                "tipo": str(info_d["tipo"]), "distrito": str(info_d["distrito"]),
                "lat": float(info_d["latitud"]), "lng": float(info_d["longitud"]),
            },
            "resultados":                   resultados,
            "ahorro_astar_vs_dijkstra_pct": ahorro_pct,
            "imagenes":                     imagenes,
        }, ensure_ascii=False))

    except Exception as e:
        import traceback
        print(json.dumps({
            "ok":    False,
            "error": str(e),
            "trace": traceback.format_exc()[-800:],
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
