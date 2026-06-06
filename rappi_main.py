
from rappi_visualizacion_ruta import plot_recorrido_legible
from rappi_visualizacion import (construir_grafo_nx, plot_red_rappi,
                                 plot_zona_alta_demanda, plot_dashboard)
from rappi_algoritmos import dijkstra, bfs, dfs, calcular_metricas_ruta
from rappi_generar_dataset import generar_nodos, generar_aristas
import os
import sys
import time
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))


OUTPUT = "backend/output_imagenes"


def cargar_datos():
    """Genera dataset nuevo en cada ejecucion (nodos y aristas aleatorios)."""
    print("Generando nuevo dataset Rappi Lima (1500 nodos aleatorios)...")
    # Crea la carpeta data/ si no existe (necesario en Windows y Linux)
    os.makedirs("backend/data", exist_ok=True)
    # Crea tambien la carpeta de imagenes si no existe
    os.makedirs("backend/output_imagenes", exist_ok=True)
    df_n = generar_nodos(1500)
    df_a = generar_aristas(df_n)
    # Sobreescribe CSVs con los nuevos datos
    df_n.to_csv("backend/data/nodos_rappi.csv", index=False)
    df_a.to_csv("backend/data/aristas_rappi.csv", index=False)
    return df_n, df_a


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


def elegir_restaurante_y_cliente(df_nodos, grafo):
    """
    Busca un restaurante (origen) y un cliente (destino)
    que tengan ruta válida entre sí.
    """
    import random
    restaurantes = df_nodos[df_nodos["tipo"]
                            == "restaurante"]["nodo_id"].tolist()
    clientes = df_nodos[df_nodos["tipo"] == "cliente"]["nodo_id"].tolist()

    for _ in range(500):
        o = random.choice(restaurantes)
        d = random.choice(clientes)
        if o in grafo and o != d:
            _, camino, _ = dijkstra(grafo, o, d, peso="tiempo_min")
            if len(camino) >= 2:
                return o, d
    return restaurantes[0], clientes[0]


def ejecutar_algoritmos(grafo, origen, destino, df_nodos):
    print(f"\n{'='*58}")
    print(f"  PEDIDO RAPPI")
    print(f"  Restaurante (nodo {origen}) → Cliente (nodo {destino})")
    print(f"{'='*58}")

    resultados = {}

    # DIJKSTRA — ruta más rápida
    t0 = time.perf_counter()
    costo_d, camino_d, visitados_d = dijkstra(
        grafo, origen, destino, "tiempo_min")
    ms_d = round((time.perf_counter()-t0)*1000, 2)
    resultados["Dijkstra"] = {
        "camino": camino_d, "visitados": visitados_d, "exec_ms": ms_d,
        **calcular_metricas_ruta(camino_d, grafo, df_nodos)
    }
    r = resultados["Dijkstra"]
    print(f"\n  DIJKSTRA — Ruta mas rapida ({ms_d} ms)")
    print(f"    Paradas  : {r['n_paradas']}")
    print(f"    Distancia: {r['distancia_km']} km")
    print(f"    Tiempo   : {r['tiempo_min']} min")
    print(f"    Costo    : S/ {r['costo_sol']}")
    print(f"    Nodos explorados: {len(visitados_d)}")

    # BFS — menos paradas
    t0 = time.perf_counter()
    camino_b, visitados_b = bfs(grafo, origen, destino)
    ms_b = round((time.perf_counter()-t0)*1000, 2)
    resultados["BFS"] = {
        "camino": camino_b, "visitados": visitados_b, "exec_ms": ms_b,
        **calcular_metricas_ruta(camino_b, grafo, df_nodos)
    }
    r = resultados["BFS"]
    print(f"\n  BFS — Menos paradas ({ms_b} ms)")
    print(f"    Paradas  : {r['n_paradas']}")
    print(f"    Distancia: {r['distancia_km']} km")
    print(f"    Tiempo   : {r['tiempo_min']} min")
    print(f"    Costo    : S/ {r['costo_sol']}")
    print(f"    Nodos explorados: {len(visitados_b)}")

    # DFS — exploración de conectividad
    t0 = time.perf_counter()
    camino_f, visitados_f = dfs(grafo, origen, destino)
    ms_f = round((time.perf_counter()-t0)*1000, 2)
    resultados["DFS"] = {
        "camino": camino_f, "visitados": visitados_f, "exec_ms": ms_f,
        **calcular_metricas_ruta(camino_f, grafo, df_nodos)
    }
    r = resultados["DFS"]
    print(f"\n  DFS — Exploracion de conectividad ({ms_f} ms)")
    print(f"    Paradas  : {r['n_paradas']}")
    print(f"    Nodos explorados: {len(visitados_f)}")

    print(f"\n{'='*58}")
    print("  CONCLUSION:")
    print("  Dijkstra garantiza la entrega MAS RAPIDA.")
    print("  Es el algoritmo que usa Rappi en produccion.")
    print(f"{'='*58}\n")

    return resultados


def main():
    os.makedirs(OUTPUT, exist_ok=True)

    print("\n" + "="*58)
    print("  RAPPI LIMA — OPTIMIZACION DE RUTAS DE REPARTO")
    print("  Complejidad Algoritmica 1ACC0184 | 2026-10")
    print("="*58 + "\n")

    # 1. Dataset
    df_nodos, df_aristas = cargar_datos()
    print(f"  Nodos  : {len(df_nodos):,}")
    print(f"  Aristas: {len(df_aristas):,}")
    print(df_nodos["tipo"].value_counts().to_string())

    # 2. Grafo para algoritmos
    print("\nConstruyendo grafo de adyacencia...")
    grafo = construir_grafo_dict(df_aristas)

    # 3. Grafo NetworkX para visualizacion
    print("Construyendo grafo NetworkX...")
    G = construir_grafo_nx(df_nodos, df_aristas, muestra=800)

    # 4. Elegir restaurante y cliente
    print("\nBuscando par Restaurante → Cliente con ruta valida...")
    origen, destino = elegir_restaurante_y_cliente(df_nodos, grafo)
    info_o = df_nodos[df_nodos["nodo_id"] == origen].iloc[0]
    info_d = df_nodos[df_nodos["nodo_id"] == destino].iloc[0]
    print(f"  Restaurante: {info_o['nombre']} ({info_o['distrito']})")
    print(f"  Cliente    : {info_d['nombre']} ({info_d['distrito']})")

    # 5. Algoritmos
    resultados = ejecutar_algoritmos(grafo, origen, destino, df_nodos)

    # 6. Visualizaciones
    print("Generando visualizaciones...\n")
    caminos = {a: r["camino"] for a, r in resultados.items()}
    metricas = {a: {k: v for k, v in r.items()
                    if k not in ("camino", "visitados", "exec_ms")}
                for a, r in resultados.items()}

    plot_red_rappi(G, output=f"{OUTPUT}/01_red_rappi_lima.png")

    archivos = plot_recorrido_legible(caminos, grafo, G, df_nodos, metricas,
                                      info_o, info_d,
                                      output_dir=OUTPUT)

    # Zona de alta demanda = distrito del restaurante
    distrito_zona = info_o["distrito"]
    plot_zona_alta_demanda(G, df_nodos, distrito_zona,
                           camino_dijkstra=resultados["Dijkstra"]["camino"],
                           output=f"{OUTPUT}/03_zona_alta_demanda.png")

    plot_dashboard(metricas, output=f"{OUTPUT}/04_dashboard_rappi.png")

    print(f"\nTodo listo. Ver carpeta: {OUTPUT}/")


if __name__ == "__main__":
    main()
