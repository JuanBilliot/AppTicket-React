import sqlite3
import os

def migrate():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, 'tickets.db')
    print(f"[MIGRATE] Conectando a {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    print("[MIGRATE] Creando tabla 'agents' si no existe...")
    c.execute('''CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
    )''')

    tables_to_migrate = ['branches', 'users', 'agents']
    for table in tables_to_migrate:
        try:
            c.execute(f"PRAGMA table_info({table})")
            cols = [r[1] for r in c.fetchall()]
            if 'active' not in cols:
                print(f"[MIGRATE] Agregando columna 'active' a la tabla '{table}'...")
                c.execute(f'ALTER TABLE {table} ADD COLUMN active INTEGER NOT NULL DEFAULT 1')
            else:
                print(f"[MIGRATE] Columna 'active' ya existe en la tabla '{table}'.")
        except sqlite3.OperationalError as e:
            print(f"[MIGRATE] Error al verificar la tabla {table}: {e}")

    conn.commit()
    conn.close()
    print("[MIGRATE] Migración completada.")

if __name__ == '__main__':
    migrate()
