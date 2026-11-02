-- =========================================================
--  SALUD+  ·  COPIA DE RESPALDO (estructura + datos de ejemplo)
--  Generado: 2026-11-01 20:10
--  Motor: MySQL 8 / MariaDB 10.6+
--
--  Restaurar:
--     · phpMyAdmin: Importar → este archivo
--     · Consola:    mysql -u root -p < database/saludplus_respaldo.sql
--
--  Usuarios de prueba (rol, correo, contraseña):
--     admin    admin@saludplus.com      Admin2026*
--     usuario  maria@saludplus.com      Maria2026*
--     usuario  jorge@saludplus.com      Jorge2026*
--     cuidador carlos@saludplus.com     Carlos2026*
--
--  Nota: las fechas corresponden al día en que se generó el archivo.
--  Para datos con fechas de hoy: python cargar_datos_ejemplo.py --reiniciar
-- =========================================================

CREATE DATABASE IF NOT EXISTS saludplus
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE saludplus;

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `alertas_enviadas`;
DROP TABLE IF EXISTS `suscripciones_push`;
DROP TABLE IF EXISTS `llamadas`;
DROP TABLE IF EXISTS `vinculos_cuidado`;
DROP TABLE IF EXISTS `sueno`;
DROP TABLE IF EXISTS `agua`;
DROP TABLE IF EXISTS `actividad_fisica`;
DROP TABLE IF EXISTS `estados_emocionales`;
DROP TABLE IF EXISTS `citas`;
DROP TABLE IF EXISTS `tomas_medicamento`;
DROP TABLE IF EXISTS `medicamentos`;
DROP TABLE IF EXISTS `preferencias`;
DROP TABLE IF EXISTS `usuarios`;

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

CREATE TABLE IF NOT EXISTS alertas_enviadas (
    medicamento_id  INT UNSIGNED  NOT NULL,
    fecha           DATE          NOT NULL,
    tipo            ENUM('recordatorio', 'toma_omitida') NOT NULL,
    enviada_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (medicamento_id, fecha, tipo),
    CONSTRAINT fk_alertas_medicamento
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- usuarios: 4 registros ----------
INSERT INTO `usuarios` (`id`, `nombre`, `correo`, `clave_hash`, `rol`, `creado_en`, `actualizado_en`) VALUES
    (1, 'Administrador Salud+', 'admin@saludplus.com', 'scrypt:32768:8:1$UZkEtHcnVwSVWQUm$f631a6715180bd01a62fa87755aad14f54ca153997d967552fe55f0cfb8e6a599920562bfb509df32a4387643ffcd647cc427951f5444111b81ae212ed9dac97', 'admin', '2026-10-02 14:00:00', '2026-11-01 20:10:22'),
    (2, 'María Rodríguez', 'maria@saludplus.com', 'scrypt:32768:8:1$ry3mgkPIyv5ls6nw$3e05395ab0d24b2782d3ddee3539f136bf5939e638a90536a9b9f82165c8ecdb068e30c9becb2271f23c40d366ed82459339b79fcc1a2ceba6d87620af994fa4', 'usuario', '2026-10-02 14:00:00', '2026-11-01 20:10:22'),
    (3, 'Jorge Pérez', 'jorge@saludplus.com', 'scrypt:32768:8:1$DH50m700EkL7jjCo$44e7f2e19dfcc7344baf9d180374f9e900af30ed832beb325587d5042b155501318466baaeac6e70213a6c8cfc2cc6ee9785e7bf3a46503f8bc16a10d80fb2ea', 'usuario', '2026-10-02 14:00:00', '2026-11-01 20:10:22'),
    (4, 'Carlos Rodríguez', 'carlos@saludplus.com', 'scrypt:32768:8:1$0elDKwpnPaOzfs4M$8ac848d8eee3b48d449ee34947cb8fa91cc0972537e6ab9976db07435152ea0336256f022cb94d5de8c423504212d8ac8534eba10d34c119ec3be4fa23f4273c', 'cuidador', '2026-10-02 14:00:00', '2026-11-01 20:10:22');

-- ---------- preferencias: 4 registros ----------
INSERT INTO `preferencias` (`usuario_id`, `avisos_app`, `notificaciones`, `minutos_cita`, `voz_activa`, `actualizado_en`) VALUES
    (1, 1, 0, 60, 0, '2026-11-01 20:10:22'),
    (2, 1, 0, 60, 1, '2026-11-01 20:10:22'),
    (3, 1, 0, 60, 0, '2026-11-01 20:10:22'),
    (4, 1, 0, 60, 0, '2026-11-01 20:10:22');

-- ---------- medicamentos: 4 registros ----------
INSERT INTO `medicamentos` (`id`, `usuario_id`, `nombre`, `dosis`, `cantidad`, `hora`, `activo`, `creado_en`, `actualizado_en`) VALUES
    (1, 2, 'Losartán', '50 mg', '1 tableta', '08:00:00', 1, '2026-10-12 14:00:00', '2026-11-01 20:10:22'),
    (2, 2, 'Metformina', '850 mg', '1 tableta', '13:00:00', 1, '2026-10-12 14:00:00', '2026-11-01 20:10:22'),
    (3, 2, 'Atorvastatina', '20 mg', '1 tableta', '20:00:00', 1, '2026-10-12 14:00:00', '2026-11-01 20:10:22'),
    (4, 3, 'Enalapril', '10 mg', '1 tableta', '07:30:00', 1, '2026-11-01 20:10:22', '2026-11-01 20:10:22');

-- ---------- tomas_medicamento: 47 registros ----------
INSERT INTO `tomas_medicamento` (`id`, `medicamento_id`, `fecha`, `hora_programada`, `estado`, `registrado_en`) VALUES
    (1, 1, '2026-10-18', '08:00:00', 'tomado', '2026-10-18 13:32:00'),
    (2, 2, '2026-10-18', '13:00:00', 'no_tomado', '2026-10-18 18:41:00'),
    (3, 3, '2026-10-18', '20:00:00', 'no_tomado', '2026-10-19 01:06:00'),
    (4, 1, '2026-10-19', '08:00:00', 'no_tomado', '2026-10-19 13:38:00'),
    (5, 2, '2026-10-19', '13:00:00', 'tomado', '2026-10-19 18:26:00'),
    (6, 3, '2026-10-19', '20:00:00', 'tomado', '2026-10-20 01:35:00'),
    (7, 1, '2026-10-20', '08:00:00', 'tomado', '2026-10-20 13:31:00'),
    (8, 2, '2026-10-20', '13:00:00', 'tomado', '2026-10-20 18:37:00'),
    (9, 3, '2026-10-20', '20:00:00', 'tomado', '2026-10-21 01:00:00'),
    (10, 1, '2026-10-21', '08:00:00', 'tomado', '2026-10-21 13:07:00'),
    (11, 2, '2026-10-21', '13:00:00', 'tomado', '2026-10-21 18:06:00'),
    (12, 3, '2026-10-21', '20:00:00', 'tomado', '2026-10-22 01:43:00'),
    (13, 1, '2026-10-22', '08:00:00', 'tomado', '2026-10-22 13:20:00'),
    (14, 2, '2026-10-22', '13:00:00', 'tomado', '2026-10-22 18:16:00'),
    (15, 3, '2026-10-22', '20:00:00', 'tomado', '2026-10-23 01:22:00'),
    (16, 1, '2026-10-23', '08:00:00', 'tomado', '2026-10-23 13:32:00'),
    (17, 2, '2026-10-23', '13:00:00', 'tomado', '2026-10-23 18:21:00'),
    (18, 3, '2026-10-23', '20:00:00', 'tomado', '2026-10-24 01:34:00'),
    (19, 1, '2026-10-24', '08:00:00', 'tomado', '2026-10-24 13:29:00'),
    (20, 2, '2026-10-24', '13:00:00', 'tomado', '2026-10-24 18:41:00'),
    (21, 3, '2026-10-24', '20:00:00', 'tomado', '2026-10-25 01:36:00'),
    (22, 1, '2026-10-25', '08:00:00', 'tomado', '2026-10-25 13:45:00'),
    (23, 2, '2026-10-25', '13:00:00', 'tomado', '2026-10-25 18:29:00'),
    (24, 3, '2026-10-25', '20:00:00', 'tomado', '2026-10-26 01:25:00'),
    (25, 1, '2026-10-26', '08:00:00', 'no_tomado', '2026-10-26 13:35:00'),
    (26, 2, '2026-10-26', '13:00:00', 'tomado', '2026-10-26 18:07:00'),
    (27, 3, '2026-10-26', '20:00:00', 'tomado', '2026-10-27 01:38:00'),
    (28, 1, '2026-10-27', '08:00:00', 'no_tomado', '2026-10-27 13:25:00'),
    (29, 2, '2026-10-27', '13:00:00', 'no_tomado', '2026-10-27 18:16:00'),
    (30, 3, '2026-10-27', '20:00:00', 'tomado', '2026-10-28 01:36:00'),
    (31, 1, '2026-10-28', '08:00:00', 'no_tomado', '2026-10-28 13:30:00'),
    (32, 2, '2026-10-28', '13:00:00', 'tomado', '2026-10-28 18:01:00'),
    (33, 3, '2026-10-28', '20:00:00', 'tomado', '2026-10-29 01:08:00'),
    (34, 1, '2026-10-29', '08:00:00', 'tomado', '2026-10-29 13:45:00'),
    (35, 2, '2026-10-29', '13:00:00', 'tomado', '2026-10-29 18:42:00'),
    (36, 3, '2026-10-29', '20:00:00', 'tomado', '2026-10-30 01:39:00'),
    (37, 1, '2026-10-30', '08:00:00', 'tomado', '2026-10-30 13:09:00'),
    (38, 2, '2026-10-30', '13:00:00', 'tomado', '2026-10-30 18:14:00'),
    (39, 3, '2026-10-30', '20:00:00', 'tomado', '2026-10-31 01:07:00'),
    (40, 1, '2026-10-31', '08:00:00', 'tomado', '2026-10-31 13:29:00'),
    (41, 2, '2026-10-31', '13:00:00', 'tomado', '2026-10-31 18:45:00'),
    (42, 3, '2026-10-31', '20:00:00', 'no_tomado', '2026-11-01 01:34:00'),
    (43, 4, '2026-10-27', '07:30:00', 'tomado', '2026-10-27 12:40:00'),
    (44, 4, '2026-10-28', '07:30:00', 'tomado', '2026-10-28 12:40:00'),
    (45, 4, '2026-10-29', '07:30:00', 'no_tomado', '2026-10-29 12:40:00'),
    (46, 4, '2026-10-30', '07:30:00', 'tomado', '2026-10-30 12:40:00'),
    (47, 4, '2026-10-31', '07:30:00', 'tomado', '2026-10-31 12:40:00');

-- ---------- citas: 6 registros ----------
INSERT INTO `citas` (`id`, `usuario_id`, `medico`, `especialidad`, `fecha`, `hora`, `lugar`, `estado`, `creado_en`, `actualizado_en`) VALUES
    (1, 2, 'Dr. Andrés Martínez', 'Medicina general', '2026-10-20', '09:30:00', 'Clínica Santa María', 'cumplida', '2026-11-01 20:10:22', '2026-11-01 20:10:22'),
    (2, 2, 'Dra. Laura Gómez', 'Cardiología', '2026-10-26', '15:00:00', 'Clínica Santa María', 'cumplida', '2026-11-01 20:10:22', '2026-11-01 20:10:22'),
    (3, 2, 'Dr. Felipe Castro', 'Odontología', '2026-10-29', '10:00:00', 'Consultorio Dental Sonrisas', 'cancelada', '2026-11-01 20:10:22', '2026-11-01 20:10:22'),
    (4, 2, 'Dra. Laura Gómez', 'Cardiología', '2026-11-03', '10:30:00', 'Clínica Santa María', 'pendiente', '2026-11-01 20:10:22', '2026-11-01 20:10:22'),
    (5, 2, 'Dr. Carlos Ruiz', 'Oftalmología', '2026-11-10', '08:00:00', 'Centro de Visión del Caribe', 'pendiente', '2026-11-01 20:10:22', '2026-11-01 20:10:22'),
    (6, 3, 'Dr. Andrés Martínez', 'Medicina general', '2026-11-05', '14:00:00', 'Clínica Santa María', 'pendiente', '2026-11-01 20:10:22', '2026-11-01 20:10:22');

-- ---------- estados_emocionales: 13 registros ----------
INSERT INTO `estados_emocionales` (`id`, `usuario_id`, `emocion`, `comentario`, `registrado_en`) VALUES
    (1, 2, 'Bien', 'Fui a la cita y todo salió bien.', '2026-10-19 20:25:00'),
    (2, 2, 'Muy bien', 'Fui a la cita y todo salió bien.', '2026-10-20 20:51:00'),
    (3, 2, 'Regular', 'Extraño a mis amigas del grupo de baile.', '2026-10-22 00:56:00'),
    (4, 2, 'Bien', 'Un día tranquilo en casa.', '2026-10-22 18:12:00'),
    (5, 2, 'Mal', 'Fui a la cita y todo salió bien.', '2026-10-23 16:00:00'),
    (6, 2, 'Bien', 'Dormí bien y salí a caminar con mi nieta.', '2026-10-24 14:41:00'),
    (7, 2, 'Muy bien', 'Extraño a mis amigas del grupo de baile.', '2026-10-26 00:33:00'),
    (8, 2, 'Regular', 'Extraño a mis amigas del grupo de baile.', '2026-10-26 17:58:00'),
    (9, 2, 'Bien', 'Me sentí algo cansada en la tarde.', '2026-10-27 16:44:00'),
    (10, 2, 'Muy bien', 'Extraño a mis amigas del grupo de baile.', '2026-10-28 19:32:00'),
    (11, 3, 'Regular', NULL, '2026-10-28 23:00:00'),
    (12, 3, 'Bien', NULL, '2026-10-30 23:00:00'),
    (13, 3, 'Bien', NULL, '2026-10-31 23:00:00');

-- ---------- actividad_fisica: 5 registros ----------
INSERT INTO `actividad_fisica` (`id`, `usuario_id`, `fecha`, `tipo`, `minutos`, `registrado_en`) VALUES
    (1, 2, '2026-10-26', 'Caminar', 30, '2026-11-01 20:10:22'),
    (2, 2, '2026-10-27', 'Ejercicios suaves', 20, '2026-11-01 20:10:22'),
    (3, 2, '2026-10-29', 'Caminar', 45, '2026-11-01 20:10:22'),
    (4, 2, '2026-10-30', 'Bicicleta', 25, '2026-11-01 20:10:22'),
    (5, 2, '2026-10-31', 'Caminar', 35, '2026-11-01 20:10:22');

-- ---------- agua: 15 registros ----------
INSERT INTO `agua` (`id`, `usuario_id`, `fecha`, `vasos`, `actualizado_en`) VALUES
    (1, 2, '2026-10-18', 7, '2026-11-01 20:10:22'),
    (2, 2, '2026-10-19', 7, '2026-11-01 20:10:22'),
    (3, 2, '2026-10-20', 8, '2026-11-01 20:10:22'),
    (4, 2, '2026-10-21', 4, '2026-11-01 20:10:22'),
    (5, 2, '2026-10-22', 6, '2026-11-01 20:10:22'),
    (6, 2, '2026-10-23', 6, '2026-11-01 20:10:22'),
    (7, 2, '2026-10-24', 7, '2026-11-01 20:10:22'),
    (8, 2, '2026-10-25', 4, '2026-11-01 20:10:22'),
    (9, 2, '2026-10-26', 7, '2026-11-01 20:10:22'),
    (10, 2, '2026-10-27', 8, '2026-11-01 20:10:22'),
    (11, 2, '2026-10-28', 6, '2026-11-01 20:10:22'),
    (12, 2, '2026-10-29', 7, '2026-11-01 20:10:22'),
    (13, 2, '2026-10-30', 5, '2026-11-01 20:10:22'),
    (14, 2, '2026-10-31', 7, '2026-11-01 20:10:22'),
    (15, 2, '2026-11-01', 3, '2026-11-01 20:10:22');

-- ---------- sueno: 7 registros ----------
INSERT INTO `sueno` (`id`, `usuario_id`, `fecha`, `horas`, `registrado_en`) VALUES
    (1, 2, '2026-10-26', 8.5, '2026-11-01 20:10:22'),
    (2, 2, '2026-10-27', 7.5, '2026-11-01 20:10:22'),
    (3, 2, '2026-10-28', 6.0, '2026-11-01 20:10:22'),
    (4, 2, '2026-10-29', 8.5, '2026-11-01 20:10:22'),
    (5, 2, '2026-10-30', 7.0, '2026-11-01 20:10:22'),
    (6, 2, '2026-10-31', 7.5, '2026-11-01 20:10:22'),
    (7, 2, '2026-11-01', 7.0, '2026-11-01 20:10:22');

-- ---------- vinculos_cuidado: 1 registros ----------
INSERT INTO `vinculos_cuidado` (`id`, `adulto_id`, `cuidador_id`, `codigo`, `codigo_vence`, `estado`, `creado_en`, `vinculado_en`) VALUES
    (1, 2, 4, NULL, NULL, 'activo', '2026-11-01 20:10:22', '2026-10-17 23:00:00');

-- ---------- llamadas: 4 registros ----------
INSERT INTO `llamadas` (`id`, `sala`, `sala_url`, `sala_vence`, `iniciador_id`, `receptor_id`, `cita_id`, `estado`, `creada_en`, `iniciada_en`, `finalizada_en`) VALUES
    (1, 'saludplus-ejemplo0', 'https://ejemplo.daily.co/saludplus-ejemplo0', '2026-10-27 01:05:00', 2, 4, NULL, 'finalizada', '2026-10-27 00:05:00', '2026-10-27 00:05:09', '2026-10-27 00:13:34'),
    (2, 'saludplus-ejemplo1', 'https://ejemplo.daily.co/saludplus-ejemplo1', '2026-10-28 16:40:00', 4, 2, NULL, 'finalizada', '2026-10-28 15:40:00', '2026-10-28 15:40:09', '2026-10-28 15:43:19'),
    (3, 'saludplus-ejemplo2', 'https://ejemplo.daily.co/saludplus-ejemplo2', '2026-10-31 02:15:00', 2, 4, NULL, 'perdida', '2026-10-31 01:15:00', NULL, '2026-10-31 01:16:00'),
    (4, 'saludplus-ejemplo3', 'https://ejemplo.daily.co/saludplus-ejemplo3', '2026-11-01 00:30:00', 4, 2, NULL, 'finalizada', '2026-10-31 23:30:00', '2026-10-31 23:30:09', '2026-10-31 23:42:11');

-- ---------- suscripciones_push: 0 registros ----------

-- ---------- alertas_enviadas: 5 registros ----------
INSERT INTO `alertas_enviadas` (`medicamento_id`, `fecha`, `tipo`, `enviada_en`) VALUES
    (1, '2026-10-26', 'toma_omitida', '2026-10-26 13:32:00'),
    (1, '2026-10-27', 'toma_omitida', '2026-10-27 13:32:00'),
    (1, '2026-10-28', 'toma_omitida', '2026-10-28 13:32:00'),
    (2, '2026-10-27', 'toma_omitida', '2026-10-27 18:32:00'),
    (3, '2026-10-31', 'toma_omitida', '2026-11-01 01:32:00');

SET FOREIGN_KEY_CHECKS = 1;
