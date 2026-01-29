#!/usr/bin/env python3
"""
Script para agregar la columna category a la tabla servers
"""
import sqlite3
import os

def add_category_column():
    """Agrega la columna category a la tabla servers si no existe"""
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, 'tickets.db')
    
    print(f"Conectando a la base de datos: {DB_PATH}")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verificar si la columna ya existe
        c.execute("PRAGMA table_info(servers)")
        columns = [column[1] for column in c.fetchall()]
        
        if 'category' in columns:
            print("✅ La columna 'category' ya existe en la tabla servers")
        else:
            print("🔧 Agregando columna 'category' a la tabla servers...")
            c.execute('ALTER TABLE servers ADD COLUMN category TEXT DEFAULT "main"')
            conn.commit()
            print("✅ Columna 'category' agregada exitosamente")
        
        # Verificar la estructura final
        c.execute("PRAGMA table_info(servers)")
        columns = [column[1] for column in c.fetchall()]
        print(f"📋 Columnas actuales: {columns}")
        
        conn.close()
        print("🎉 Migración completada exitosamente!")
        
    except Exception as e:
        print(f"❌ Error durante la migración: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    add_category_column()
