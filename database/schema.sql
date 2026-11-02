-- =========================================================
--  SALUD+  ·  ESQUEMA de la base de datos (MySQL 8 / MariaDB)
--  Crea la base de datos y TODAS las tablas de la app.
--  Modelo en Tercera Forma Normal (3FN). Ver diagrama_er.png
--
--  Cómo usarlo (elige una opción):
--    · phpMyAdmin (XAMPP): pestaña "Importar" → elegir este archivo
--    · Consola:  mysql -u root -p < database/saludplus.sql
--    · Python:   python iniciar_bd.py   (crea también los usuarios de prueba con:
--               python cargar_datos_ejemplo.py)
-- =========================================================

CREATE DATABASE IF NOT EXISTS saludplus
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE saludplus;


-- ---------------------------------------------------------
-- 1. USUARIOS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(60)   NOT NULL,
    correo          VARCHAR(120)  NOT NULL,
    clave_hash      VARCHAR(255)  NOT NULL,      -- nunca la contraseña en texto plano
    rol             ENUM('usuario', 'cuidador', 'admin') NOT NULL DEFAULT 'usuario',
    creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 2. MEDICAMENTOS
--    activo = 0 significa "eliminado": la fila se conserva
--    para no perder el historial de tomas.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicamentos (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED  NOT NULL,
    nombre          VARCHAR(40)   NOT NULL,
    dosis           VARCHAR(20)   NOT NULL,
    cantidad        VARCHAR(30)   NOT NULL,
    hora            TIME          NOT NULL,
    activo          TINYINT(1)    NOT NULL DEFAULT 1,
    creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_medicamentos_usuario (usuario_id, activo, hora),
    CONSTRAINT fk_medicamentos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 3. TOMAS DE MEDICAMENTOS  ("Lo tomé" / "No lo tomé")
--    Una sola toma por medicamento y por día.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tomas_medicamento (
    id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    medicamento_id   INT UNSIGNED  NOT NULL,
    fecha            DATE          NOT NULL,
    hora_programada  TIME          NOT NULL,     -- hora que tenía el medicamento ese día
    estado           ENUM('tomado', 'no_tomado') NOT NULL,
    registrado_en    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_toma_por_dia (medicamento_id, fecha),
    KEY ix_tomas_fecha (fecha),
    CONSTRAINT fk_tomas_medicamento
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 4. CITAS MÉDICAS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS citas (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED  NOT NULL,
    medico          VARCHAR(60)   NOT NULL,
    especialidad    VARCHAR(50)   NOT NULL,
    fecha           DATE          NOT NULL,
    hora            TIME          NOT NULL,
    lugar           VARCHAR(80)   NOT NULL,
    estado          ENUM('pendiente', 'cumplida', 'cancelada')
                                  NOT NULL DEFAULT 'pendiente',
    creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_citas_usuario_fecha (usuario_id, fecha, hora),
    CONSTRAINT fk_citas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 5. ESTADOS EMOCIONALES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS estados_emocionales (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED  NOT NULL,
    emocion         ENUM('Muy bien', 'Bien', 'Regular', 'Mal', 'Muy mal') NOT NULL,
    comentario      VARCHAR(300)  NULL,
    registrado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_emociones_usuario (usuario_id, registrado_en),
    CONSTRAINT fk_emociones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 6. ACTIVIDAD FÍSICA  (una por día)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS actividad_fisica (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED  NOT NULL,
    fecha           DATE          NOT NULL,
    tipo            VARCHAR(30)   NOT NULL,
    minutos         SMALLINT UNSIGNED NOT NULL,
    registrado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_actividad_dia (usuario_id, fecha),
    CONSTRAINT fk_actividad_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE,
    CONSTRAINT ck_actividad_minutos CHECK (minutos BETWEEN 5 AND 300)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 7. AGUA  (vasos por día)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS agua (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED  NOT NULL,
    fecha           DATE          NOT NULL,
    vasos           TINYINT UNSIGNED NOT NULL DEFAULT 0,
    actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_agua_dia (usuario_id, fecha),
    CONSTRAINT fk_agua_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE,
    CONSTRAINT ck_agua_vasos CHECK (vasos BETWEEN 0 AND 8)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 8. SUEÑO  (horas por noche)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sueno (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED  NOT NULL,
    fecha           DATE          NOT NULL,
    horas           DECIMAL(3,1)  NOT NULL,
    registrado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sueno_dia (usuario_id, fecha),
    CONSTRAINT fk_sueno_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE,
    CONSTRAINT ck_sueno_horas CHECK (horas BETWEEN 1 AND 16)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 9. PREFERENCIAS DE RECORDATORIOS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS preferencias (
    usuario_id      INT UNSIGNED  NOT NULL,
    avisos_app      TINYINT(1)    NOT NULL DEFAULT 1,
    notificaciones  TINYINT(1)    NOT NULL DEFAULT 0,
    minutos_cita    SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    voz_activa      TINYINT(1)    NOT NULL DEFAULT 0,       -- leer recordatorios en voz alta
    actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id),
    CONSTRAINT fk_preferencias_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =========================================================
--  REQUERIMIENTO AVANZADO: rol cuidador y videollamada
-- =========================================================

-- ---------------------------------------------------------
-- 10. VÍNCULOS ADULTO MAYOR ↔ CUIDADOR
--     El adulto genera un código de 6 dígitos (vence en 24 h);
--     el cuidador lo ingresa y el vínculo queda 'activo'.
--     Se usa INT UNSIGNED (y no BIGINT) para coincidir con usuarios.id.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS vinculos_cuidado (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    adulto_id       INT UNSIGNED  NOT NULL,
    cuidador_id     INT UNSIGNED  NULL,                     -- NULL mientras el código está pendiente
    codigo          CHAR(6)       NULL,
    codigo_vence    DATETIME      NULL,
    estado          ENUM('pendiente', 'activo', 'revocado') NOT NULL DEFAULT 'pendiente',
    creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vinculado_en    DATETIME      NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vinculo (adulto_id, cuidador_id),
    UNIQUE KEY uq_vinculo_codigo (codigo),
    KEY ix_vinculos_cuidador (cuidador_id, estado),
    CONSTRAINT fk_vinculos_adulto
        FOREIGN KEY (adulto_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_vinculos_cuidador
        FOREIGN KEY (cuidador_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 11. LLAMADAS (salas privadas de Daily.co)
--     La duración se calcula: finalizada_en - iniciada_en.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS llamadas (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    sala            VARCHAR(80)   NOT NULL,
    sala_url        VARCHAR(255)  NOT NULL,
    sala_vence      DATETIME      NOT NULL,
    iniciador_id    INT UNSIGNED  NOT NULL,
    receptor_id     INT UNSIGNED  NOT NULL,
    cita_id         INT UNSIGNED  NULL,
    estado          ENUM('sonando', 'en_curso', 'finalizada', 'perdida') NOT NULL DEFAULT 'sonando',
    creada_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    iniciada_en     DATETIME      NULL,
    finalizada_en   DATETIME      NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_llamadas_sala (sala),
    KEY ix_llamadas_receptor (receptor_id, estado, creada_en),
    KEY ix_llamadas_iniciador (iniciador_id, creada_en),
    CONSTRAINT fk_llamadas_iniciador
        FOREIGN KEY (iniciador_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_llamadas_receptor
        FOREIGN KEY (receptor_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_llamadas_cita
        FOREIGN KEY (cita_id) REFERENCES citas (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 12. SUSCRIPCIONES WEB PUSH (un registro por navegador/celular)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS suscripciones_push (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED  NOT NULL,
    endpoint        VARCHAR(500)  NOT NULL,
    p256dh          VARCHAR(200)  NOT NULL,
    auth            VARCHAR(100)  NOT NULL,
    creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_push_endpoint (endpoint),
    KEY ix_push_usuario (usuario_id),
    CONSTRAINT fk_push_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------
-- 13. ALERTAS ENVIADAS (evita avisar dos veces la misma toma)
--     Una toma programada = (medicamento_id, fecha).
--     tipo: 'recordatorio' (al adulto, a la hora) o
--           'toma_omitida' (al cuidador, +30 min sin "Lo tomé").
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS alertas_enviadas (
    medicamento_id  INT UNSIGNED  NOT NULL,
    fecha           DATE          NOT NULL,
    tipo            ENUM('recordatorio', 'toma_omitida') NOT NULL,
    enviada_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (medicamento_id, fecha, tipo),
    CONSTRAINT fk_alertas_medicamento
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
