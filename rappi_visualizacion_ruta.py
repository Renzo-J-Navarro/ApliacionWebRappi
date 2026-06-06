
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.lines import Line2D
import networkx as nx
import pandas as pd
import os

COLOR_FONDO = "#0A0E1A"
COLOR_ORIGEN = "#E74C3C"
COLOR_DESTINO = "#2ECC71"
COLOR_PASO = "#5DADE2"

# ── A* agregado como primer algoritmo (principal) ──────────
COLORES_ALGO = {
    # naranja Rappi ← NUEVO
    "A*":       {"ruta": "#FF6B2C", "header": "#B84E1E"},
    "Dijkstra": {"ruta": "#E74C3C", "header": "#922B21"},
    "BFS":      {"ruta": "#F1C40F", "header": "#9A7D0A"},
    "DFS":      {"ruta": "#1ABC9C", "header": "#0B5345"},
}


def get_arista(grafo, u, v):
    for vecino, attrs in grafo.get(u, []):
        if vecino == v:
            return attrs
    return {"tiempo_min": 0, "distancia_km": 0, "costo_sol": 0, "via": "calle"}


def _pos_geo(G):
    return {n: (G.nodes[n]["lon"], G.nodes[n]["lat"]) for n in G.nodes}


# ─────────────────────────────────────────────────────────────
#  IMAGEN: mapa con la ruta del algoritmo
# ─────────────────────────────────────────────────────────────
def _guardar_imagen_mapa(G, camino, origen, destino, c, algo,
                         df_nodos, info_origen, info_destino,
                         metricas, fname):
    fig, ax = plt.subplots(figsize=(14, 11))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)

    pos = _pos_geo(G)
    nodos_G = set(G.nodes)

    # Fondo: red completa casi invisible
    nx.draw_networkx_edges(G, pos, ax=ax,
                           edge_color="#FFFFFF", alpha=0.04,
                           arrows=False, width=0.3)
    nx.draw_networkx_nodes(G, pos, ax=ax,
                           node_color="#1F2A3A", node_size=5, alpha=0.7)

    if len(camino) >= 2:
        # Ruta resaltada con flechas
        aristas_ruta = [(u, v) for u, v in zip(camino[:-1], camino[1:])
                        if u in nodos_G and v in nodos_G]
        if aristas_ruta:
            nx.draw_networkx_edges(G, pos, edgelist=aristas_ruta, ax=ax,
                                   edge_color=c["ruta"], width=3.5,
                                   alpha=1.0, arrows=True, arrowsize=16,
                                   connectionstyle="arc3,rad=0.06")

        # Paradas intermedias
        intermedios = [n for n in camino
                       if n not in (origen, destino) and n in nodos_G]
        if intermedios:
            nx.draw_networkx_nodes(G, pos, nodelist=intermedios, ax=ax,
                                   node_color=COLOR_PASO, node_size=55, alpha=1.0)

        # ORIGEN — cuadrado rojo grande
        if origen in nodos_G:
            nx.draw_networkx_nodes(G, pos, nodelist=[origen], ax=ax,
                                   node_color=COLOR_ORIGEN,
                                   node_shape="s", node_size=600, alpha=1.0)
            x, y = pos[origen]
            ax.text(x, y + 0.014,
                    f"RESTAURANTE\n{str(info_origen['nombre'])[:25]}",
                    ha="center", va="bottom", fontsize=8, fontweight="bold",
                    color="white",
                    bbox=dict(boxstyle="round,pad=0.3", facecolor=COLOR_ORIGEN,
                              edgecolor="white", linewidth=2, alpha=0.97))

        # DESTINO — estrella verde grande
        if destino in nodos_G:
            nx.draw_networkx_nodes(G, pos, nodelist=[destino], ax=ax,
                                   node_color=COLOR_DESTINO,
                                   node_shape="*", node_size=800, alpha=1.0)
            x, y = pos[destino]
            ax.text(x, y - 0.015,
                    f"CLIENTE\n{str(info_destino['nombre'])[:25]}",
                    ha="center", va="top", fontsize=8, fontweight="bold",
                    color="white",
                    bbox=dict(boxstyle="round,pad=0.3", facecolor=COLOR_DESTINO,
                              edgecolor="white", linewidth=2, alpha=0.97))
    else:
        ax.text(0.5, 0.5, "Sin ruta encontrada entre estos puntos",
                transform=ax.transAxes, ha="center", va="center",
                fontsize=14, color="#888888", fontstyle="italic")

    # Leyenda
    leyenda = [
        Line2D([0], [0], marker="s", color="w", markerfacecolor=COLOR_ORIGEN,
               markersize=12, label="Restaurante (origen)"),
        Line2D([0], [0], marker="*", color="w", markerfacecolor=COLOR_DESTINO,
               markersize=15, label="Cliente (destino)"),
        Line2D([0], [0], marker="o", color="w", markerfacecolor=COLOR_PASO,
               markersize=9,  label="Parada intermedia"),
        Line2D([0], [0], color=c["ruta"], lw=2.5, label=f"Ruta {algo}"),
    ]
    # Badge "PRINCIPAL" para A*
    if algo == "A*":
        leyenda.append(Line2D([0], [0], color="none",
                              label="★ Algoritmo principal"))
    ax.legend(handles=leyenda, loc="lower left",
              facecolor="#1A1F2E", edgecolor="#555",
              labelcolor="white", fontsize=9,
              title="Referencias", title_fontsize=10)

    # Métricas en esquina superior derecha
    m = metricas
    resumen = (f"Paradas: {m.get('n_paradas', '—')}   "
               f"Distancia: {m.get('distancia_km', '—')} km\n"
               f"Tiempo: {m.get('tiempo_min', '—')} min   "
               f"Costo: S/ {m.get('costo_sol', '—')}")
    ax.text(0.98, 0.98, resumen,
            transform=ax.transAxes, ha="right", va="top",
            fontsize=9, color="white", fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.4", facecolor=c["header"],
                      edgecolor=c["ruta"], linewidth=1.5, alpha=0.92))

    ax.set_xlabel("Longitud", color="#888", fontsize=8)
    ax.set_ylabel("Latitud",  color="#888", fontsize=8)
    ax.tick_params(colors="#555", labelsize=7)
    for spine in ax.spines.values():
        spine.set_edgecolor("#333")

    nombre_r = str(info_origen["nombre"])[:40]
    nombre_c = str(info_destino["nombre"])[:40]
    titulo = f"Ruta {algo} — Sistema Rappi Lima"
    if algo == "A*":
        titulo += "  ★ Principal"
    fig.suptitle(
        f"{titulo}\nDesde: {nombre_r}   →   Hasta: {nombre_c}",
        color="white", fontsize=13, fontweight="bold",
        y=1.01, linespacing=1.6)

    plt.tight_layout()
    plt.savefig(fname, dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close()
    print(f"  ✓ Imagen: {fname}")


# ─────────────────────────────────────────────────────────────
#  CSV: desglose paso a paso con valores de aristas
# ─────────────────────────────────────────────────────────────
def _guardar_csv_ruta(camino, grafo, df_nodos, algo, fname):
    if len(camino) < 2:
        pd.DataFrame([{
            "paso": 1, "nodo_id": "", "nombre": "Sin ruta encontrada",
            "tipo": "", "distrito": "",
            "via_hacia_siguiente": "", "tiempo_min": "",
            "distancia_km": "", "costo_sol": ""
        }]).to_csv(fname, index=False)
        print(f"  ✓ CSV: {fname}")
        return

    filas = []
    for idx, nodo in enumerate(camino):
        info = df_nodos[df_nodos["nodo_id"] == nodo]
        if info.empty:
            nombre, tipo, distrito = f"Nodo {nodo}", "desconocido", ""
        else:
            row = info.iloc[0]
            nombre = row["nombre"]
            tipo = row["tipo"]
            distrito = row["distrito"]

        if idx == 0:
            rol = "ORIGEN (Restaurante)"
        elif idx == len(camino) - 1:
            rol = "DESTINO (Cliente)"
        elif tipo == "hub_rappi":
            rol = "Hub Rappi"
        else:
            rol = "Parada intermedia"

        if idx < len(camino) - 1:
            sig = camino[idx + 1]
            attrs = get_arista(grafo, nodo, sig)
            via = attrs.get("via",          "—")
            t_min = attrs.get("tiempo_min",    0)
            d_km = attrs.get("distancia_km",  0)
            costo = attrs.get("costo_sol",     0)
        else:
            via, t_min, d_km, costo = "—", "—", "—", "—"

        filas.append({
            "paso":                idx + 1,
            "nodo_id":             nodo,
            "rol":                 rol,
            "nombre":              nombre,
            "tipo":                tipo,
            "distrito":            distrito,
            "via_hacia_siguiente": via,
            "tiempo_min":          t_min,
            "distancia_km":        d_km,
            "costo_sol":           costo,
        })

    pd.DataFrame(filas).to_csv(fname, index=False)
    print(f"  ✓ CSV:   {fname}")


# ─────────────────────────────────────────────────────────────
#  FUNCIÓN PRINCIPAL — genera imagen + CSV por cada algoritmo
# ─────────────────────────────────────────────────────────────
def plot_recorrido_legible(caminos, grafo, G, df_nodos, metricas,
                           info_origen, info_destino,
                           output_dir="backend/output_imagenes"):
    """
    Genera una imagen PNG y un CSV por cada algoritmo en `caminos`.

    El nombre del archivo usa el algoritmo en minúsculas y sin
    caracteres especiales:
        A*       → 02_a_estrella_ruta.png   (antes fallaba con '*')
        Dijkstra → 02_dijkstra_ruta.png
        BFS      → 02_bfs_ruta.png
        DFS      → 02_dfs_ruta.png
    """
    os.makedirs(output_dir, exist_ok=True)

    origen = -1
    destino = -1
    for cam in caminos.values():
        if len(cam) >= 2:
            origen = cam[0]
            destino = cam[-1]
            break

    for algo, camino in caminos.items():
        # ── Color del algoritmo ───────────────────────────
        # Si el algoritmo no está en el dict usa un gris de fallback
        c = COLORES_ALGO.get(algo, {"ruta": "#AAAAAA", "header": "#555555"})
        m = metricas.get(algo, {})

        # ── Nombre de archivo seguro (sin '*' ni espacios) ─
        nombre_safe = algo.lower().replace("*", "_estrella").replace(" ", "_")

        fname_img = f"{output_dir}/02_{nombre_safe}_ruta.png"
        fname_csv = f"{output_dir}/02_{nombre_safe}_pasos.csv"

        _guardar_imagen_mapa(G, camino, origen, destino, c, algo,
                             df_nodos, info_origen, info_destino,
                             m, fname_img)

        _guardar_csv_ruta(camino, grafo, df_nodos, algo, fname_csv)
