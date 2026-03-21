import os
import uuid
from datetime import datetime, timezone
import bcrypt

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Asegurar que se leen las variables de entorno
load_dotenv()

database_url = os.getenv("DATABASE_URL")

def main():
    print("Iniciando Seed de la Base de Datos Silabos MVP (FACHSE Piloto)...")
    
    if not database_url:
        print("Error: DATABASE_URL no encontrada en .env")
        return
        
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    
    with Session() as sesion:
        ahora = datetime.now(timezone.utc).isoformat()
        
        # ─────────────────────────────────────────
        # 1. Facultad
        # ─────────────────────────────────────────
        fac_code = "FACHSE"
        row = sesion.execute(text("SELECT id FROM faculties WHERE code = :code"), {"code": fac_code}).mappings().first()
        if row:
            fachse_id = str(row["id"])
            print(f"- Facultad {fac_code} ya existe, omitiendo inserción.")
        else:
            fachse_id = str(uuid.uuid4())
            sesion.execute(
                text("""
                    INSERT INTO faculties (id, name, code, created_at)
                    VALUES (:id, :name, :code, :created_at)
                """),
                {
                    "id": fachse_id, 
                    "name": "Facultad de Ciencias Histórico Sociales y Educación", 
                    "code": fac_code,
                    "created_at": ahora
                }
            )
            print(f"- Facultad {fac_code} insertada exitosamente.")

        # ─────────────────────────────────────────
        # 2. Carrera Padre (Educación - EDU)
        # Aunque el requerimiento pide "Programas vinculados a FACHSE",
        # listó a 'Educación' con código 'EDU' como una carrera,
        # y luego 8 programas. Mapearemos "Educación" como una y las 8 como sus propias carreras independientes,
        # o 9 en total según el requerimiento. Se crearán todas.
        # ─────────────────────────────────────────

        # Array de (nombre, codigo)
        careers_data = [
            ("Educación", "EDU"),
            ("Educación Inicial", "EDU-INI"),
            ("Educación Primaria", "EDU-PRI"),
            ("Ciencias Naturales", "EDU-CN"),
            ("CC.HH.SS. y Filosofía", "EDU-CHHSS"),
            ("Lengua y Literatura", "EDU-LL"),
            ("Idiomas Extranjeros", "EDU-IE"),
            ("Matemática y Computación", "EDU-MC"),
            ("Educación Física", "EDU-EF")
        ]
        
        carreras_insertadas = 0
        career_ids = {}
        
        print("\nVerificando / Insertando Carreras:")
        for c_name, c_code in careers_data:
            row = sesion.execute(text("SELECT id FROM careers WHERE code = :code"), {"code": c_code}).mappings().first()
            if row:
                career_ids[c_code] = str(row["id"])
                print(f"  - Carrera {c_code} ya existe, omitiendo.")
            else:
                c_id = str(uuid.uuid4())
                sesion.execute(
                    text("""
                        INSERT INTO careers (id, name, code, faculty_id, created_at)
                        VALUES (:id, :name, :code, :faculty_id, :created_at)
                    """),
                    {
                        "id": c_id,
                        "name": c_name,
                        "code": c_code,
                        "faculty_id": fachse_id,
                        "created_at": ahora
                    }
                )
                career_ids[c_code] = c_id
                carreras_insertadas += 1
                print(f"  - Carrera {c_code} insertada exitosamente.")

        # ID de Lengua y Literatura que necesitaremos:
        lengua_lit_id = career_ids.get("EDU-LL")

        # ─────────────────────────────────────────
        # 4. Plan de Estudios Demo
        # ─────────────────────────────────────────
        print("\nVerificando / Insertando Plan de Estudios:")
        version_plan = "2023-II"
        row = sesion.execute(
            text("SELECT id FROM study_plans where career_id = :career_id AND version = :version"),
            {"career_id": lengua_lit_id, "version": version_plan}
        ).mappings().first()
        
        if row:
            plan_id = str(row["id"])
            print(f"  - Plan de Estudios {version_plan} ya existe, omitiendo.")
        else:
            plan_id = str(uuid.uuid4())
            sesion.execute(
                text("""
                    INSERT INTO study_plans (id, career_id, version, admission_from, active, pdf_path, created_at)
                    VALUES (:id, :career_id, :version, :admission_from, :active, :pdf_path, :created_at)
                """),
                {
                    "id": plan_id,
                    "career_id": lengua_lit_id,
                    "version": version_plan,
                    "admission_from": "2023-II",
                    "active": True,
                    "pdf_path": None,
                    "created_at": ahora
                }
            )
            print(f"  - Plan de Estudios {version_plan} insertado exitosamente.")

        # ─────────────────────────────────────────
        # 5. Curso Demo
        # ─────────────────────────────────────────
        print("\nVerificando / Insertando Curso Demo:")
        course_code = "CEDE1167"
        row = sesion.execute(
            text("SELECT id FROM courses WHERE code = :code AND study_plan_id = :study_plan_id"),
            {"code": course_code, "study_plan_id": plan_id}
        ).mappings().first()
        
        if row:
            course_id = str(row["id"])
            print(f"  - Curso {course_code} ya existe, omitiendo.")
        else:
            course_id = str(uuid.uuid4())
            sesion.execute(
                text("""
                    INSERT INTO courses (
                        id, career_id, study_plan_id, name, code, credits, 
                        hours_theory, hours_practice, cycle, prerequisites, 
                        sumilla, competencia, capacidad, created_at
                    ) VALUES (
                        :id, :career_id, :study_plan_id, :name, :code, :credits,
                        :hours_theory, :hours_practice, :cycle, :prerequisites,
                        :sumilla, :competencia, :capacidad, :created_at
                    )
                """),
                {
                    "id": course_id,
                    "career_id": lengua_lit_id,
                    "study_plan_id": plan_id,
                    "name": "Taller de Investigación Educativa I",
                    "code": course_code,
                    "credits": 3,
                    "hours_theory": 2,
                    "hours_practice": 2,
                    "cycle": 10, # Usando 10 para X ciclo si la BD es integer
                    "prerequisites": "Estadística aplicada a la investigación cuantitativa",
                    "sumilla": "Pendiente de importar desde PDF",
                    "competencia": "Pendiente de importar desde PDF",
                    "capacidad": "Pendiente de importar desde PDF",
                    "created_at": ahora
                }
            )
            print(f"  - Curso {course_code} insertado exitosamente.")

        # ─────────────────────────────────────────
        # 6. Desempeños demo del curso
        # ─────────────────────────────────────────
        print("\nVerificando / Insertando Desempeños:")
        performances_data = [
            ("D1", "Redacta el informe final de la investigación de acuerdo a protocolos nacionales y/o internacionales, considerando las normas APA vigente.", 1),
            ("D2", "Sustenta su informe final de acuerdo a la normativa académica y de investigación vigente.", 2),
            ("D3", "Elabora, a partir de su informe de investigación, un artículo científico, considerando las normas de publicación exigidas por revistas de su especialidad.", 3)
        ]
        
        perfs_insertados = 0
        for code, statement, order in performances_data:
            row = sesion.execute(
                text("SELECT id FROM performances WHERE course_id = :course_id AND code = :code"),
                {"course_id": course_id, "code": code}
            ).mappings().first()
            if row:
                print(f"  - Desempeño {code} ya existe, omitiendo.")
            else:
                sesion.execute(
                    text("""
                        INSERT INTO performances (id, course_id, code, statement, display_order, created_at)
                        VALUES (:id, :course_id, :code, :statement, :display_order, :created_at)
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "course_id": course_id,
                        "code": code,
                        "statement": statement,
                        "display_order": order,
                        "created_at": ahora
                    }
                )
                perfs_insertados += 1
                print(f"  - Desempeño {code} insertado exitosamente.")

        # ─────────────────────────────────────────
        # 7. Usuarios Demo
        # ─────────────────────────────────────────
        print("\nVerificando / Insertando Usuarios:")
        users_data = [
            ("carvas@unprg.edu.pe", "Demo2025!", "Dr. Carlos Carvas", "docente", lengua_lit_id),
            ("dev@silabos.ai", "Dev2025!", "Desarrollador", "docente", None)
        ]
        
        users_insertados = 0
        for email, password, fname, role, c_id in users_data:
            row = sesion.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).mappings().first()
            if row:
                print(f"  - Usuario {email} ya existe, omitiendo.")
            else:
                # bcrypt hashea en bytes y decodifica a string
                hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                sesion.execute(
                    text("""
                        INSERT INTO users (id, email, password_hash, full_name, role, career_id, created_at)
                        VALUES (:id, :email, :password_hash, :full_name, :role, :career_id, :created_at)
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "email": email,
                        "password_hash": hashed,
                        "full_name": fname,
                        "role": role,
                        "career_id": c_id,
                        "created_at": ahora
                    }
                )
                users_insertados += 1
                print(f"  - Usuario {email} insertado exitosamente.")

        # Guardar en BD
        sesion.commit()
        
        total_nuevos = (
            (1 if not row else 0) + # Fac
            carreras_insertadas +
            (1 if not row else 0) + # Plan
            (1 if not row else 0) + # Curso
            perfs_insertados +
            users_insertados
        )
        print(f"\nProceso finalizado. Total de registros nuevos: {total_nuevos}")

if __name__ == "__main__":
    main()
