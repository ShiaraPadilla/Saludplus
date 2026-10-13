-- =========================================================
--  SALUD+  ·  COPIA DE RESPALDO (estructura + datos de ejemplo)
--  Generado: 2026-10-12 22:54
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
    rol             ENUM('usuario', 'admin') NOT NULL DEFAULT 'usuario',
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
    actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id),
    CONSTRAINT fk_preferencias_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- usuarios: 3 registros ----------
INSERT INTO `usuarios` (`id`, `nombre`, `correo`, `clave_hash`, `rol`, `creado_en`, `actualizado_en`) VALUES
    (1, 'Administrador Salud+', 'admin@saludplus.com', 'scrypt:32768:8:1$OfRN5g2qsy2dpPtJ$9922e97700897365b3e0a786c24d7eb2320ed65f166d0a0c7986886674e8b34295ceee6d2dfa22e90a888f3adbb531579436b4c3eea3d1fd79779cc03397431c', 'admin', '2026-09-12 14:00:00', '2026-10-12 22:54:26'),
    (2, 'María Rodríguez', 'maria@saludplus.com', 'scrypt:32768:8:1$WIFaJvN0Ka7WNam8$2c40b5beaefb9a45ed0e9fd0726bb9fdd889a5a28ba416883a267b8deeab0b3c9dfb1e8cbbf7d2eea34b4797e092ca532e20db7cb1ff9c5389ec103186808a9b', 'usuario', '2026-09-12 14:00:00', '2026-10-12 22:54:26'),
    (3, 'Jorge Pérez', 'jorge@saludplus.com', 'scrypt:32768:8:1$vV38aGPtpf7YwkUL$57a15da0fd91a305089f53f61497fa9c878d971f55036330d9c68d72429ca6766c98b99f9ec99ea5f3446b9b7607d783f71aa63274c640561cf9b8139c32786a', 'usuario', '2026-09-12 14:00:00', '2026-10-12 22:54:26');

-- ---------- preferencias: 3 registros ----------
INSERT INTO `preferencias` (`usuario_id`, `avisos_app`, `notificaciones`, `minutos_cita`, `actualizado_en`) VALUES
    (1, 1, 0, 60, '2026-10-12 22:54:26'),
    (2, 1, 0, 60, '2026-10-12 22:54:26'),
    (3, 1, 0, 60, '2026-10-12 22:54:26');

-- ---------- medicamentos: 4 registros ----------
INSERT INTO `medicamentos` (`id`, `usuario_id`, `nombre`, `dosis`, `cantidad`, `hora`, `activo`, `creado_en`, `actualizado_en`) VALUES
    (1, 2, 'Losartán', '50 mg', '1 tableta', '08:00:00', 1, '2026-09-22 14:00:00', '2026-10-12 22:54:26'),
    (2, 2, 'Metformina', '850 mg', '1 tableta', '13:00:00', 1, '2026-09-22 14:00:00', '2026-10-12 22:54:26'),
    (3, 2, 'Atorvastatina', '20 mg', '1 tableta', '20:00:00', 1, '2026-09-22 14:00:00', '2026-10-12 22:54:26'),
    (4, 3, 'Enalapril', '10 mg', '1 tableta', '07:30:00', 1, '2026-10-12 22:54:26', '2026-10-12 22:54:26');

-- ---------- tomas_medicamento: 47 registros ----------
INSERT INTO `tomas_medicamento` (`id`, `medicamento_id`, `fecha`, `hora_programada`, `estado`, `registrado_en`) VALUES
    (1, 1, '2026-09-28', '08:00:00', 'tomado', '2026-09-28 13:32:00'),
    (2, 2, '2026-09-28', '13:00:00', 'no_tomado', '2026-09-28 18:41:00'),
    (3, 3, '2026-09-28', '20:00:00', 'no_tomado', '2026-09-29 01:06:00'),
    (4, 1, '2026-09-29', '08:00:00', 'no_tomado', '2026-09-29 13:38:00'),
    (5, 2, '2026-09-29', '13:00:00', 'tomado', '2026-09-29 18:26:00'),
    (6, 3, '2026-09-29', '20:00:00', 'tomado', '2026-09-30 01:35:00'),
    (7, 1, '2026-09-30', '08:00:00', 'tomado', '2026-09-30 13:31:00'),
    (8, 2, '2026-09-30', '13:00:00', 'tomado', '2026-09-30 18:37:00'),
    (9, 3, '2026-09-30', '20:00:00', 'tomado', '2026-10-01 01:00:00'),
    (10, 1, '2026-10-01', '08:00:00', 'tomado', '2026-10-01 13:07:00'),
    (11, 2, '2026-10-01', '13:00:00', 'tomado', '2026-10-01 18:06:00'),
    (12, 3, '2026-10-01', '20:00:00', 'tomado', '2026-10-02 01:43:00'),
    (13, 1, '2026-10-02', '08:00:00', 'tomado', '2026-10-02 13:20:00'),
    (14, 2, '2026-10-02', '13:00:00', 'tomado', '2026-10-02 18:16:00'),
    (15, 3, '2026-10-02', '20:00:00', 'tomado', '2026-10-03 01:22:00'),
    (16, 1, '2026-10-03', '08:00:00', 'tomado', '2026-10-03 13:32:00'),
    (17, 2, '2026-10-03', '13:00:00', 'tomado', '2026-10-03 18:21:00'),
    (18, 3, '2026-10-03', '20:00:00', 'tomado', '2026-10-04 01:34:00'),
    (19, 1, '2026-10-04', '08:00:00', 'tomado', '2026-10-04 13:29:00'),
    (20, 2, '2026-10-04', '13:00:00', 'tomado', '2026-10-04 18:41:00'),
    (21, 3, '2026-10-04', '20:00:00', 'tomado', '2026-10-05 01:36:00'),
    (22, 1, '2026-10-05', '08:00:00', 'tomado', '2026-10-05 13:45:00'),
    (23, 2, '2026-10-05', '13:00:00', 'tomado', '2026-10-05 18:29:00'),
    (24, 3, '2026-10-05', '20:00:00', 'tomado', '2026-10-06 01:25:00'),
    (25, 1, '2026-10-06', '08:00:00', 'no_tomado', '2026-10-06 13:35:00'),
    (26, 2, '2026-10-06', '13:00:00', 'tomado', '2026-10-06 18:07:00'),
    (27, 3, '2026-10-06', '20:00:00', 'tomado', '2026-10-07 01:38:00'),
    (28, 1, '2026-10-07', '08:00:00', 'no_tomado', '2026-10-07 13:25:00'),
    (29, 2, '2026-10-07', '13:00:00', 'no_tomado', '2026-10-07 18:16:00'),
    (30, 3, '2026-10-07', '20:00:00', 'tomado', '2026-10-08 01:36:00'),
    (31, 1, '2026-10-08', '08:00:00', 'no_tomado', '2026-10-08 13:30:00'),
    (32, 2, '2026-10-08', '13:00:00', 'tomado', '2026-10-08 18:01:00'),
    (33, 3, '2026-10-08', '20:00:00', 'tomado', '2026-10-09 01:08:00'),
    (34, 1, '2026-10-09', '08:00:00', 'tomado', '2026-10-09 13:45:00'),
    (35, 2, '2026-10-09', '13:00:00', 'tomado', '2026-10-09 18:42:00'),
    (36, 3, '2026-10-09', '20:00:00', 'tomado', '2026-10-10 01:39:00'),
    (37, 1, '2026-10-10', '08:00:00', 'tomado', '2026-10-10 13:09:00'),
    (38, 2, '2026-10-10', '13:00:00', 'tomado', '2026-10-10 18:14:00'),
    (39, 3, '2026-10-10', '20:00:00', 'tomado', '2026-10-11 01:07:00'),
    (40, 1, '2026-10-11', '08:00:00', 'tomado', '2026-10-11 13:29:00'),
    (41, 2, '2026-10-11', '13:00:00', 'tomado', '2026-10-11 18:45:00'),
    (42, 3, '2026-10-11', '20:00:00', 'no_tomado', '2026-10-12 01:34:00'),
    (43, 4, '2026-10-07', '07:30:00', 'tomado', '2026-10-07 12:40:00'),
    (44, 4, '2026-10-08', '07:30:00', 'tomado', '2026-10-08 12:40:00'),
    (45, 4, '2026-10-09', '07:30:00', 'no_tomado', '2026-10-09 12:40:00'),
    (46, 4, '2026-10-10', '07:30:00', 'tomado', '2026-10-10 12:40:00'),
    (47, 4, '2026-10-11', '07:30:00', 'tomado', '2026-10-11 12:40:00');

-- ---------- citas: 6 registros ----------
INSERT INTO `citas` (`id`, `usuario_id`, `medico`, `especialidad`, `fecha`, `hora`, `lugar`, `estado`, `creado_en`, `actualizado_en`) VALUES
    (1, 2, 'Dr. Andrés Martínez', 'Medicina general', '2026-09-30', '09:30:00', 'Clínica Santa María', 'cumplida', '2026-10-12 22:54:26', '2026-10-12 22:54:26'),
    (2, 2, 'Dra. Laura Gómez', 'Cardiología', '2026-10-06', '15:00:00', 'Clínica Santa María', 'cumplida', '2026-10-12 22:54:26', '2026-10-12 22:54:26'),
    (3, 2, 'Dr. Felipe Castro', 'Odontología', '2026-10-09', '10:00:00', 'Consultorio Dental Sonrisas', 'cancelada', '2026-10-12 22:54:26', '2026-10-12 22:54:26'),
    (4, 2, 'Dra. Laura Gómez', 'Cardiología', '2026-10-14', '10:30:00', 'Clínica Santa María', 'pendiente', '2026-10-12 22:54:26', '2026-10-12 22:54:26'),
    (5, 2, 'Dr. Carlos Ruiz', 'Oftalmología', '2026-10-21', '08:00:00', 'Centro de Visión del Caribe', 'pendiente', '2026-10-12 22:54:26', '2026-10-12 22:54:26'),
    (6, 3, 'Dr. Andrés Martínez', 'Medicina general', '2026-10-16', '14:00:00', 'Clínica Santa María', 'pendiente', '2026-10-12 22:54:26', '2026-10-12 22:54:26');

-- ---------- estados_emocionales: 13 registros ----------
INSERT INTO `estados_emocionales` (`id`, `usuario_id`, `emocion`, `comentario`, `registrado_en`) VALUES
    (1, 2, 'Bien', 'Fui a la cita y todo salió bien.', '2026-09-29 20:25:00'),
    (2, 2, 'Muy bien', 'Fui a la cita y todo salió bien.', '2026-09-30 20:51:00'),
    (3, 2, 'Regular', 'Extraño a mis amigas del grupo de baile.', '2026-10-02 00:56:00'),
    (4, 2, 'Bien', 'Un día tranquilo en casa.', '2026-10-02 18:12:00'),
    (5, 2, 'Mal', 'Fui a la cita y todo salió bien.', '2026-10-03 16:00:00'),
    (6, 2, 'Bien', 'Dormí bien y salí a caminar con mi nieta.', '2026-10-04 14:41:00'),
    (7, 2, 'Muy bien', 'Extraño a mis amigas del grupo de baile.', '2026-10-06 00:33:00'),
    (8, 2, 'Regular', 'Extraño a mis amigas del grupo de baile.', '2026-10-06 17:58:00'),
    (9, 2, 'Bien', 'Me sentí algo cansada en la tarde.', '2026-10-07 16:44:00'),
    (10, 2, 'Muy bien', 'Extraño a mis amigas del grupo de baile.', '2026-10-08 19:32:00'),
    (11, 3, 'Regular', NULL, '2026-10-08 23:00:00'),
    (12, 3, 'Bien', NULL, '2026-10-10 23:00:00'),
    (13, 3, 'Bien', NULL, '2026-10-11 23:00:00');

-- ---------- actividad_fisica: 5 registros ----------
INSERT INTO `actividad_fisica` (`id`, `usuario_id`, `fecha`, `tipo`, `minutos`, `registrado_en`) VALUES
    (1, 2, '2026-10-06', 'Caminar', 30, '2026-10-12 22:54:26'),
    (2, 2, '2026-10-07', 'Ejercicios suaves', 20, '2026-10-12 22:54:26'),
    (3, 2, '2026-10-09', 'Caminar', 45, '2026-10-12 22:54:26'),
    (4, 2, '2026-10-10', 'Bicicleta', 25, '2026-10-12 22:54:26'),
    (5, 2, '2026-10-11', 'Caminar', 35, '2026-10-12 22:54:26');

-- ---------- agua: 15 registros ----------
INSERT INTO `agua` (`id`, `usuario_id`, `fecha`, `vasos`, `actualizado_en`) VALUES
    (1, 2, '2026-09-28', 7, '2026-10-12 22:54:26'),
    (2, 2, '2026-09-29', 7, '2026-10-12 22:54:26'),
    (3, 2, '2026-09-30', 8, '2026-10-12 22:54:26'),
    (4, 2, '2026-10-01', 4, '2026-10-12 22:54:26'),
    (5, 2, '2026-10-02', 6, '2026-10-12 22:54:26'),
    (6, 2, '2026-10-03', 6, '2026-10-12 22:54:26'),
    (7, 2, '2026-10-04', 7, '2026-10-12 22:54:26'),
    (8, 2, '2026-10-05', 4, '2026-10-12 22:54:26'),
    (9, 2, '2026-10-06', 7, '2026-10-12 22:54:26'),
    (10, 2, '2026-10-07', 8, '2026-10-12 22:54:26'),
    (11, 2, '2026-10-08', 6, '2026-10-12 22:54:26'),
    (12, 2, '2026-10-09', 7, '2026-10-12 22:54:26'),
    (13, 2, '2026-10-10', 5, '2026-10-12 22:54:26'),
    (14, 2, '2026-10-11', 7, '2026-10-12 22:54:26'),
    (15, 2, '2026-10-12', 3, '2026-10-12 22:54:26');

-- ---------- sueno: 7 registros ----------
INSERT INTO `sueno` (`id`, `usuario_id`, `fecha`, `horas`, `registrado_en`) VALUES
    (1, 2, '2026-10-06', 8.5, '2026-10-12 22:54:26'),
    (2, 2, '2026-10-07', 7.5, '2026-10-12 22:54:26'),
    (3, 2, '2026-10-08', 6.0, '2026-10-12 22:54:26'),
    (4, 2, '2026-10-09', 8.5, '2026-10-12 22:54:26'),
    (5, 2, '2026-10-10', 7.0, '2026-10-12 22:54:26'),
    (6, 2, '2026-10-11', 7.5, '2026-10-12 22:54:26'),
    (7, 2, '2026-10-12', 7.0, '2026-10-12 22:54:26');

SET FOREIGN_KEY_CHECKS = 1;
