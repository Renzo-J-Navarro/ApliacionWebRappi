from algoritmos import dijkstra, bfs, calcular_metricas_ruta
import unittest
import time
import sys
import os

# Permitir que el test encuentre los archivos en la carpeta superior
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))


class TestSistemaRappi(unittest.TestCase):

    def setUp(self):
        """Configuración de un mini-grafo de Lima para pruebas controladas."""
        self.grafo_prueba = {
            0: [(1, {"tiempo_min": 5, "distancia_km": 1.2, "costo_sol": 3.5})],
            1: [(2, {"tiempo_min": 3, "distancia_km": 0.8, "costo_sol": 2.0})],
            2: []
        }
        self.t_inicio = time.perf_counter()

    def tearDown(self):
        """Muestra el tiempo de procesamiento al finalizar cada prueba."""
        t_fin = time.perf_counter()
        ms = (t_fin - self.t_inicio) * 1000
        print(f" -> Tiempo de ejecución del test: {ms:.4f} ms")

    def test_eficiencia_dijkstra(self):
        """QA: Verifica que Dijkstra encuentre la ruta óptima en tiempo[cite: 1]."""
        print("\n[QA] Ejecutando: test_eficiencia_dijkstra", end="")
        dist, camino, _ = dijkstra(self.grafo_prueba, 0, 2, peso="tiempo_min")

        self.assertEqual(camino, [0, 1, 2],
                         "Error: La ruta no es la esperada.")
        self.assertEqual(
            dist, 8, "Error: El cálculo de tiempo acumulado falló.")

    def test_vulnerabilidad_nodo_fantasma(self):
        """QA: Verifica que el sistema no colapse si el nodo no existe[cite: 1]."""
        print("\n[QA] Ejecutando: test_vulnerabilidad_nodo_fantasma", end="")
        dist, camino, _ = dijkstra(self.grafo_prueba, 0, 999)

        self.assertEqual(dist, float(
            "inf"), "Vulnerabilidad: Debería retornar infinito para nodos inexistentes.")
        self.assertEqual(
            camino, [], "Vulnerabilidad: El camino debe estar vacío.")

    def test_conectividad_bfs(self):
        """QA: Verifica que BFS encuentre el camino con menos paradas[cite: 1]."""
        print("\n[QA] Ejecutando: test_conectividad_bfs", end="")
        camino, _ = bfs(self.grafo_prueba, 0, 2)
        self.assertTrue(len(camino) > 0, "Error: BFS no encontró conexión.")


if __name__ == "__main__":
    print("=== INICIANDO PRUEBAS DE CALIDAD (QA) - SISTEMA LIMA 2026 ===")
    unittest.main()
