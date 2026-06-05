try:
    import pandas as pd
    import matplotlib.pyplot as plt
    import networkx as nx
    print("✅ Todas las dependencias están listas para procesar datos.")
except ImportError as e:
    print(f"❌ Error de instalación: {e}")
