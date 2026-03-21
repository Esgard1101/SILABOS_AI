import asyncio
import os
import uuid
from datetime import datetime, timezone

from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

import bcrypt

import warnings
warnings.filterwarnings("ignore", category=UserWarning)

load_dotenv()

database_url = os.getenv("DATABASE_URL")

def main():
    print("Iniciando Seed de la Base de Datos Silabos MVP...")
    
    if not database_url:
        print("Error: DATABASE_URL no encontrada en .env")
        return
        
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    
    with Session() as sesion:
        ahora = datetime.now(timezone.utc).isoformat()
        
        # 1. Crear Facultad FACHSE
        fachse_id = str(uuid.uuid4())
        sesion.execute(
            text("""
                INSERT INTO faculties (id, name, created_at)
                VALUES (:id, :name, :created_at)
                ON CONFLICT DO NOTHING
            """),
            {"id": fachse_id, "name": "FACHSE", "created_at": ahora}
        )
        print("Facultad FACHSE creada.")

        # Obtener el ID de la facultad por si ya existía (ignoramos conflictos arriba)
        fachse_row = sesion.execute(
            text("SELECT id FROM faculties WHERE name = 'FACHSE'")
        ).mappings().first()
        if fachse_row:
             fachse_id = str(fachse_row["id"])
             
        # 2. Crear las carreras
        carreras = [
            "Educación Inicial", 
            "Educación Primaria", 
            "Ciencias Naturales", 
            "CC.HH.SS. y Filosofía", 
            "Lengua y Literatura", 
            "Idiomas Extranjeros", 
            "Matemática y Computación", 
            "Educación Física"
        ]
        
        lengua_y_literatura_id = None
        
        for carrera in carreras:
            carrera_id = str(uuid.uuid4())
            sesion.execute(
                text("""
                    INSERT INTO careers (id, name, faculty_id, created_at)
                    VALUES (:id, :name, :faculty_id, :created_at)
                    ON CONFLICT DO NOTHING
                """),
                {"id": carrera_id, "name": carrera, "faculty_id": fachse_id, "created_at": ahora}
            )
            
        print("Carreras creadas.")

        # Buscar su ID para "Lengua y Literatura"
        row = sesion.execute(
            text("SELECT id FROM careers WHERE name = 'Lengua y Literatura'")
        ).mappings().first()
        if row:
            lengua_y_literatura_id = str(row["id"])

        # 3. Crear Usuario Docente
        docente_email = "docente@unprg.edu.pe"
        docente_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode('utf-8')
        
        sesion.execute(
            text("""
                INSERT INTO users (id, email, password_hash, full_name, role, career_id, created_at)
                VALUES (:id, :email, :password_hash, :full_name, :role, :career_id, :created_at)
                ON CONFLICT (email) DO NOTHING
            """),
            {
                "id": str(uuid.uuid4()),
                "email": docente_email,
                "password_hash": docente_hash,
                "full_name": "Dr. Carlos Carvas",
                "role": "docente",
                "career_id": lengua_y_literatura_id,
                "created_at": ahora
            }
        )
        print("Usuario Docente creado.")
        
        # 4. Crear Usuario Admin
        admin_email = "admin@unprg.edu.pe"
        admin_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode('utf-8')
        
        sesion.execute(
            text("""
                INSERT INTO users (id, email, password_hash, full_name, role, career_id, created_at)
                VALUES (:id, :email, :password_hash, :full_name, :role, :career_id, :created_at)
                ON CONFLICT (email) DO NOTHING
            """),
            {
                "id": str(uuid.uuid4()),
                "email": admin_email,
                "password_hash": admin_hash,
                "full_name": "Admin Sistema",
                "role": "admin",
                "career_id": None,
                "created_at": ahora
            }
        )
        print("Usuario Admin creado.")
        
        sesion.commit()
        print("Datos insertados exitosamente.")

if __name__ == "__main__":
    main()
