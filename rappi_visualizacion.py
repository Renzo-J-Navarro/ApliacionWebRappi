
import networkx as nx
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.patheffects as pe
import pandas as pd
import numpy as np

# Colores y formas por tipo de nodo Rappi
COLORES = {
    "restaurante":  "#E74C3C",   # rojo
    "hub_rappi":    "#F39C12",   # naranja
    "interseccion": "#5DADE2",   # azul claro
    "cliente":      "#2ECC71",   # verde
}
FORMAS = {
    "restaurante":  "s",   # cuadrado
    "hub_rappi":    "D",   # rombo
    "interseccion": "o",   # circulo
    "cliente":      "^",   # triangulo
}
TAMANIOS = {
    "restaurante":  120,
    "hub_rappi":    90,
    "interseccion": 12,
    "cliente":      20,
}


def construir_grafo_nx(df_nodos, df_aristas, muestra=800):
    G = nx.DiGraph()
    sample = df_nodos.sample(min(muestra, len(df_nodos)), random_state=42)
    ids_s = set(sample["nodo_id"])

    for _, r in sample.iterrows():
        G.add_node(int(r["nodo_id"]), tipo=r["tipo"], distrito=r["distrito"],
                   lat=r["latitud"], lon=r["longitud"],
                   pedidos=r["pedidos_hora"], demanda=r["demanda_nivel"])

    for _, r in df_aristas.iterrows():
        o, d = int(r["origen"]), int(r["destino"])
        if o in ids_s and d in ids_s:
            G.add_edge(o, d, distancia_km=r["distancia_km"],
                       tiempo_min=r["tiempo_min"], costo_sol=r["costo_sol"],
                       congestion=r["congestion"])
    return G


def _pos_geo(G):
    return {n: (G.nodes[n]["lon"], G.nodes[n]["lat"]) for n in G.nodes}


# ── FIGURA 1: Red completa Rappi Lima ────────────────────────
def plot_red_rappi(G, output="01_red_rappi_lima.png"):
    fig, ax = plt.subplots(figsize=(16, 13))
    fig.patch.set_facecolor("#0A0E1A")
    ax.set_facecolor("#0A0E1A")
    pos = _pos_geo(G)

    # Aristas por congestión
    congestion_colors = {"baja": "#27AE60",
                         "media": "#F39C12", "alta": "#E74C3C"}
    for cong, color in congestion_colors.items():
        edges = [(u, v) for u, v, d in G.edges(
            data=True) if d.get("congestion") == cong]
        nx.draw_networkx_edges(G, pos, edgelist=edges, ax=ax,
                               edge_color=color, alpha=0.15,
                               arrows=False, width=0.5)

    # Nodos por tipo
    for tipo in ["interseccion", "cliente", "hub_rappi", "restaurante"]:
        nodos = [n for n, d in G.nodes(data=True) if d.get("tipo") == tipo]
        nx.draw_networkx_nodes(G, pos, nodelist=nodos, ax=ax,
                               node_color=COLORES[tipo],
                               node_shape=FORMAS[tipo],
                               node_size=TAMANIOS[tipo], alpha=0.9)

    # Leyenda nodos
    leg_nodos = [mpatches.Patch(color=c, label=t.replace("_", " ").title())
                 for t, c in COLORES.items()]
    # Leyenda congestión
    leg_cong = [mpatches.Patch(color=c, label=f"Tráfico {k}")
                for k, c in congestion_colors.items()]

    l1 = ax.legend(handles=leg_nodos, loc="lower left",
                   facecolor="#1A1F2E", edgecolor="#555", labelcolor="white",
                   fontsize=8, title="Tipo de Punto", title_fontsize=9)
    ax.add_artist(l1)
    ax.legend(handles=leg_cong, loc="lower right",
              facecolor="#1A1F2E", edgecolor="#555", labelcolor="white",
              fontsize=8, title="Nivel de Tráfico", title_fontsize=9)

    ax.set_title("Red Logística Rappi — Lima Metropolitana\n"
                 "Restaurantes · Hubs · Intersecciones · Clientes",
                 color="white", fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Longitud", color="#888", fontsize=8)
    ax.set_ylabel("Latitud",  color="#888", fontsize=8)
    ax.tick_params(colors="#666")

    plt.tight_layout()
    plt.savefig(output, dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close()
    print(f"  ✓ {output}")


# ── FIGURA 2: Ruta del repartidor Rappi ─────────────────────
def plot_ruta_repartidor(G, caminos, origen, destino, metricas,
                         info_origen, info_destino,
                         output="02_ruta_repartidor.png"):
    colores_algo = {"Dijkstra": "#E74C3C", "BFS": "#F1C40F", "DFS": "#1ABC9C"}
    n = len(caminos)
    fig, axes = plt.subplots(1, n, figsize=(7*n, 9))
    fig.patch.set_facecolor("#0A0E1A")
    if n == 1:
        axes = [axes]

    pos = _pos_geo(G)
    nodos_G = set(G.nodes)

    for ax, (algo, camino) in zip(axes, caminos.items()):
        ax.set_facecolor("#0A0E1A")

        # Fondo
        nx.draw_networkx_edges(G, pos, ax=ax, edge_color="#FFFFFF",
                               alpha=0.04, arrows=False, width=0.3)
        nx.draw_networkx_nodes(G, pos, ax=ax, node_color="#333333",
                               node_size=6, alpha=0.5)

        # Ruta resaltada
        if len(camino) >= 2:
            aristas_r = [(u, v) for u, v in zip(camino[:-1], camino[1:])
                         if u in nodos_G and v in nodos_G]
            nodos_intermedios = [n for n in camino
                                 if n not in (origen, destino) and n in nodos_G]
            if aristas_r:
                nx.draw_networkx_edges(G, pos, edgelist=aristas_r, ax=ax,
                                       edge_color=colores_algo[algo],
                                       width=2.8, alpha=0.95, arrows=True,
                                       arrowsize=14,
                                       connectionstyle="arc3,rad=0.08")
            if nodos_intermedios:
                nx.draw_networkx_nodes(G, pos, nodelist=nodos_intermedios,
                                       ax=ax, node_color=colores_algo[algo],
                                       node_size=30, alpha=0.9)

        # Origen = restaurante
        if origen in nodos_G:
            nx.draw_networkx_nodes(G, pos, nodelist=[origen], ax=ax,
                                   node_color="#E74C3C", node_size=300,
                                   node_shape="s")
            ax.annotate(f"RESTAURANTE\n{info_origen['nombre'][:20]}",
                        xy=pos[origen],
                        xytext=(pos[origen][0]+0.003, pos[origen][1]+0.003),
                        color="#E74C3C", fontsize=6.5, fontweight="bold",
                        bbox=dict(boxstyle="round,pad=0.2", facecolor="#1A0A0A",
                                  edgecolor="#E74C3C", alpha=0.8))

        # Destino = cliente
        if destino in nodos_G:
            nx.draw_networkx_nodes(G, pos, nodelist=[destino], ax=ax,
                                   node_color="#2ECC71", node_size=300,
                                   node_shape="^")
            ax.annotate(f"CLIENTE\n{info_destino['nombre'][:20]}",
                        xy=pos[destino],
                        xytext=(pos[destino][0]+0.003, pos[destino][1]-0.004),
                        color="#2ECC71", fontsize=6.5, fontweight="bold",
                        bbox=dict(boxstyle="round,pad=0.2", facecolor="#0A1A0A",
                                  edgecolor="#2ECC71", alpha=0.8))

        m = metricas.get(algo, {})
        titulo = (f"{algo}\n"
                  f"Paradas: {m.get('n_paradas', '—')}  |  "
                  f"{m.get('distancia_km', '—')} km\n"
                  f"Tiempo: {m.get('tiempo_min', '—')} min  |  "
                  f"S/ {m.get('costo_sol', '—')}")
        ax.set_title(titulo, color=colores_algo[algo], fontsize=10,
                     fontweight="bold", pad=8, linespacing=1.5)
        ax.tick_params(colors="#555")

    fig.suptitle("Ruta del Repartidor Rappi — Comparación de Algoritmos",
                 color="white", fontsize=13, fontweight="bold", y=1.01)
    plt.tight_layout()
    plt.savefig(output, dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close()
    print(f"  ✓ {output}")


# ── FIGURA 3: Subgrafo zona de alta demanda ──────────────────
def plot_zona_alta_demanda(G, df_nodos, distrito,
                           camino_dijkstra=None,
                           output="03_zona_alta_demanda.png"):
    ids_zona = set(df_nodos[df_nodos["distrito"] == distrito]["nodo_id"])
    subG = G.subgraph([n for n in G.nodes if n in ids_zona]).copy()

    if len(subG.nodes) == 0:
        print(f"  ⚠ Sin nodos en: {distrito}")
        return

    fig, ax = plt.subplots(figsize=(13, 10))
    fig.patch.set_facecolor("#0A0E1A")
    ax.set_facecolor("#0A0E1A")
    pos = _pos_geo(subG)

    # Aristas por congestión
    for cong, color in [("baja", "#27AE60"), ("media", "#F39C12"), ("alta", "#E74C3C")]:
        edges = [(u, v) for u, v, d in subG.edges(data=True)
                 if d.get("congestion") == cong]
        nx.draw_networkx_edges(subG, pos, edgelist=edges, ax=ax,
                               edge_color=color, alpha=0.3, width=0.8, arrows=False)

    for tipo in ["interseccion", "cliente", "hub_rappi", "restaurante"]:
        nodos_t = [n for n, d in subG.nodes(
            data=True) if d.get("tipo") == tipo]
        nx.draw_networkx_nodes(subG, pos, nodelist=nodos_t, ax=ax,
                               node_color=COLORES[tipo], node_shape=FORMAS[tipo],
                               node_size=TAMANIOS[tipo]*1.5, alpha=0.9)

    # Ruta Dijkstra en el subgrafo
    if camino_dijkstra:
        ruta_sub = [n for n in camino_dijkstra if n in subG.nodes]
        if len(ruta_sub) >= 2:
            ar = list(zip(ruta_sub[:-1], ruta_sub[1:]))
            nx.draw_networkx_edges(subG, pos, edgelist=ar, ax=ax,
                                   edge_color="#FF6B6B", width=3.5,
                                   arrows=True, arrowsize=18)
            nx.draw_networkx_nodes(subG, pos, nodelist=ruta_sub, ax=ax,
                                   node_color="#FF6B6B", node_size=55)

    leyenda = [mpatches.Patch(color=c, label=t.replace("_", " ").title())
               for t, c in COLORES.items()]
    if camino_dijkstra:
        leyenda.append(mpatches.Patch(color="#FF6B6B", label="Ruta Dijkstra"))
    ax.legend(handles=leyenda, loc="lower left",
              facecolor="#1A1F2E", edgecolor="#444", labelcolor="white", fontsize=8)

    ax.set_title(f"Zona de Alta Demanda Rappi — {distrito}\n"
                 f"({len(subG.nodes)} puntos activos)",
                 color="white", fontsize=12, fontweight="bold", pad=10)
    ax.set_xlabel("Longitud", color="#888", fontsize=8)
    ax.set_ylabel("Latitud",  color="#888", fontsize=8)
    ax.tick_params(colors="#555")
    plt.tight_layout()
    plt.savefig(output, dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close()
    print(f"  ✓ {output}")


# ── FIGURA 4: Dashboard métricas Rappi ──────────────────────
def plot_dashboard(metricas, output="04_dashboard_rappi.png"):
    algos = list(metricas.keys())
    colors = ["#E74C3C", "#F1C40F", "#1ABC9C"]

    campos = [
        ("n_paradas",    "Paradas del Repartidor", "paradas"),
        ("distancia_km", "Distancia Recorrida",    "km"),
        ("tiempo_min",   "Tiempo de Entrega",       "min"),
        ("costo_sol",    "Costo del Viaje",         "S/"),
    ]

    fig, axes = plt.subplots(2, 2, figsize=(13, 8))
    fig.patch.set_facecolor("#0A0E1A")

    for ax, (campo, titulo, unidad) in zip(axes.flat, campos):
        ax.set_facecolor("#111827")
        valores = [metricas[a].get(campo, 0) for a in algos]
        bars = ax.bar(algos, valores, color=colors[:len(algos)],
                      alpha=0.85, edgecolor="#FFFFFF", linewidth=0.5, width=0.5)
        for bar, val in zip(bars, valores):
            ax.text(bar.get_x() + bar.get_width()/2,
                    bar.get_height() + max(valores)*0.02,
                    f"{val} {unidad}", ha="center", va="bottom",
                    color="white", fontsize=9, fontweight="bold")
        ax.set_title(titulo, color="white", fontsize=10, pad=8)
        ax.set_ylim(0, max(valores)*1.25 if max(valores) > 0 else 1)
        ax.set_xticks(range(len(algos)))
        ax.set_xticklabels(algos, color="white", fontsize=9)
        ax.tick_params(axis="y", colors="#666")
        for spine in ax.spines.values():
            spine.set_edgecolor("#333")

    fig.suptitle("Dashboard Rappi — Comparativa de Algoritmos de Ruta\n"
                 "¿Cuál minimiza el tiempo de entrega?",
                 color="white", fontsize=13, fontweight="bold", y=1.02)
    plt.tight_layout()
    plt.savefig(output, dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close()
    print(f"  ✓ {output}")
