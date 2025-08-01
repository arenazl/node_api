-- SimImporter Stored Procedures
-- Procedures for MQ Importer API operations

USE SimImporter;

-- =============================================
-- 1. SERVICE LOOKUP PROCEDURES
-- =============================================

-- Procedure to get active service configuration
CREATE PROCEDURE IF NOT EXISTS sp_GetServiceConfiguration(
    IN p_channel_code VARCHAR(50),
    IN p_service_number VARCHAR(50)
)
BEGIN
    SELECT 
        sc.id as config_id,
        c.channel_code,
        c.channel_name,
        sc.service_number,
        ms.service_name,
        ms.version,
        ms.structure_json,
        ms.headers_json,
        sc.config_json,
        ms.field_count,
        ms.total_length
    FROM service_configurations sc
    INNER JOIN channels c ON sc.channel_id = c.id
    INNER JOIN message_structures ms ON sc.structure_id = ms.id
    WHERE c.channel_code = p_channel_code
        AND sc.service_number = p_service_number
        AND sc.is_active = TRUE
        AND c.is_active = TRUE
        AND (sc.valid_until IS NULL OR sc.valid_until > NOW())
    ORDER BY sc.valid_from DESC
    LIMIT 1;
END$$

-- Procedure to list all services for a channel
CREATE PROCEDURE IF NOT EXISTS sp_ListChannelServices(
    IN p_channel_code VARCHAR(50)
)
BEGIN
    SELECT DISTINCT
        sc.service_number,
        ms.service_name,
        ms.version,
        ms.field_count,
        ms.total_length,
        COUNT(DISTINCT sc.id) as config_count,
        MAX(sc.updated_at) as last_updated
    FROM service_configurations sc
    INNER JOIN channels c ON sc.channel_id = c.id
    INNER JOIN message_structures ms ON sc.structure_id = ms.id
    WHERE c.channel_code = p_channel_code
        AND c.is_active = TRUE
    GROUP BY sc.service_number, ms.service_name, ms.version, ms.field_count, ms.total_length
    ORDER BY sc.service_number;
END$$

-- =============================================
-- 2. CONVERSION LOGGING PROCEDURES
-- =============================================

-- Procedure to log conversion request
CREATE PROCEDURE IF NOT EXISTS sp_LogConversion(
    IN p_request_id VARCHAR(100),
    IN p_channel_code VARCHAR(50),
    IN p_service_number VARCHAR(50),
    IN p_conversion_type ENUM('IDA', 'VUELTA'),
    IN p_input_data TEXT,
    IN p_output_data TEXT,
    IN p_status ENUM('success', 'error', 'validation_error'),
    IN p_error_message TEXT,
    IN p_error_details JSON,
    IN p_processing_time_ms INT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent VARCHAR(500)
)
BEGIN
    DECLARE v_channel_id INT;
    
    -- Get channel ID
    SELECT id INTO v_channel_id 
    FROM channels 
    WHERE channel_code = p_channel_code 
    LIMIT 1;
    
    -- Insert conversion log
    INSERT INTO conversion_logs (
        request_id,
        channel_id,
        service_number,
        conversion_type,
        input_data,
        output_data,
        status,
        error_message,
        error_details,
        processing_time_ms,
        ip_address,
        user_agent
    ) VALUES (
        p_request_id,
        v_channel_id,
        p_service_number,
        p_conversion_type,
        p_input_data,
        p_output_data,
        p_status,
        p_error_message,
        p_error_details,
        p_processing_time_ms,
        p_ip_address,
        p_user_agent
    );
    
    -- Update daily statistics
    CALL sp_UpdateUsageStatistics(
        v_channel_id,
        p_service_number,
        p_conversion_type,
        p_status,
        p_processing_time_ms,
        LENGTH(COALESCE(p_input_data, '')) + LENGTH(COALESCE(p_output_data, ''))
    );
    
    SELECT LAST_INSERT_ID() as log_id;
END$$

-- Procedure to update usage statistics
CREATE PROCEDURE IF NOT EXISTS sp_UpdateUsageStatistics(
    IN p_channel_id INT,
    IN p_service_number VARCHAR(50),
    IN p_conversion_type ENUM('IDA', 'VUELTA'),
    IN p_status ENUM('success', 'error', 'validation_error'),
    IN p_processing_time_ms INT,
    IN p_data_size_bytes BIGINT
)
BEGIN
    INSERT INTO usage_statistics (
        stat_date,
        channel_id,
        service_number,
        conversion_type,
        request_count,
        success_count,
        error_count,
        avg_processing_time_ms,
        total_data_size_kb
    ) VALUES (
        CURDATE(),
        p_channel_id,
        p_service_number,
        p_conversion_type,
        1,
        IF(p_status = 'success', 1, 0),
        IF(p_status != 'success', 1, 0),
        p_processing_time_ms,
        CEIL(p_data_size_bytes / 1024)
    )
    ON DUPLICATE KEY UPDATE
        request_count = request_count + 1,
        success_count = success_count + IF(p_status = 'success', 1, 0),
        error_count = error_count + IF(p_status != 'success', 1, 0),
        avg_processing_time_ms = (
            (avg_processing_time_ms * (request_count - 1) + p_processing_time_ms) / request_count
        ),
        total_data_size_kb = total_data_size_kb + CEIL(p_data_size_bytes / 1024);
END$$

-- =============================================
-- 3. EXCEL FILE MANAGEMENT PROCEDURES
-- =============================================

-- Procedure to register new Excel file and its structure
CREATE PROCEDURE IF NOT EXISTS sp_RegisterExcelStructure(
    IN p_filename VARCHAR(255),
    IN p_original_filename VARCHAR(255),
    IN p_file_path VARCHAR(500),
    IN p_file_size BIGINT,
    IN p_service_number VARCHAR(50),
    IN p_service_name VARCHAR(255),
    IN p_version VARCHAR(50),
    IN p_structure_json JSON,
    IN p_headers_json JSON,
    IN p_field_count INT,
    IN p_total_length INT,
    IN p_uploaded_by VARCHAR(100)
)
BEGIN
    DECLARE v_excel_file_id INT;
    DECLARE v_structure_id INT;
    
    START TRANSACTION;
    
    -- Insert Excel file record
    INSERT INTO excel_files (
        filename,
        original_filename,
        file_path,
        file_size,
        uploaded_by
    ) VALUES (
        p_filename,
        p_original_filename,
        p_file_path,
        p_file_size,
        p_uploaded_by
    );
    
    SET v_excel_file_id = LAST_INSERT_ID();
    
    -- Insert message structure
    INSERT INTO message_structures (
        excel_file_id,
        service_number,
        service_name,
        version,
        structure_json,
        headers_json,
        field_count,
        total_length
    ) VALUES (
        v_excel_file_id,
        p_service_number,
        p_service_name,
        p_version,
        p_structure_json,
        p_headers_json,
        p_field_count,
        p_total_length
    );
    
    SET v_structure_id = LAST_INSERT_ID();
    
    -- Parse and insert field definitions
    CALL sp_ParseFieldDefinitions(v_structure_id, p_structure_json);
    
    COMMIT;
    
    SELECT v_excel_file_id as excel_file_id, v_structure_id as structure_id;
END$$

-- Procedure to parse field definitions from JSON structure
CREATE PROCEDURE IF NOT EXISTS sp_ParseFieldDefinitions(
    IN p_structure_id INT,
    IN p_structure_json JSON
)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE field_count INT;
    
    SET field_count = JSON_LENGTH(p_structure_json);
    
    WHILE i < field_count DO
        INSERT INTO field_definitions (
            structure_id,
            field_name,
            field_type,
            field_length,
            position_start,
            position_end,
            is_required,
            default_value,
            field_order
        ) VALUES (
            p_structure_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_structure_json, CONCAT('$[', i, '].CAMPO'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_structure_json, CONCAT('$[', i, '].TIPO'))),
            JSON_EXTRACT(p_structure_json, CONCAT('$[', i, '].LONGITUD')),
            JSON_EXTRACT(p_structure_json, CONCAT('$[', i, '].INICIO')),
            JSON_EXTRACT(p_structure_json, CONCAT('$[', i, '].FIN')),
            COALESCE(JSON_EXTRACT(p_structure_json, CONCAT('$[', i, '].REQUERIDO')), FALSE),
            JSON_UNQUOTE(JSON_EXTRACT(p_structure_json, CONCAT('$[', i, '].VALOR_POR_DEFECTO'))),
            i + 1
        );
        
        SET i = i + 1;
    END WHILE;
END$$

-- =============================================
-- 4. CACHE MANAGEMENT PROCEDURES
-- =============================================

-- Procedure to get or update service cache
CREATE PROCEDURE IF NOT EXISTS sp_GetServiceCache(
    IN p_channel_code VARCHAR(50),
    IN p_service_number VARCHAR(50)
)
BEGIN
    DECLARE v_cache_key VARCHAR(255);
    DECLARE v_structure_json JSON;
    DECLARE v_cache_exists BOOLEAN DEFAULT FALSE;
    
    SET v_cache_key = CONCAT(p_channel_code, ':', p_service_number);
    
    -- Check if valid cache exists
    SELECT 
        structure_json,
        TRUE
    INTO 
        v_structure_json,
        v_cache_exists
    FROM service_cache
    WHERE cache_key = v_cache_key
        AND expires_at > NOW()
    LIMIT 1;
    
    IF v_cache_exists THEN
        -- Update hit count and last accessed
        UPDATE service_cache
        SET hit_count = hit_count + 1,
            last_accessed = NOW()
        WHERE cache_key = v_cache_key;
        
        SELECT v_structure_json as structure_json, TRUE as from_cache;
    ELSE
        -- Get from main tables and cache it
        SELECT 
            ms.structure_json
        INTO v_structure_json
        FROM service_configurations sc
        INNER JOIN channels c ON sc.channel_id = c.id
        INNER JOIN message_structures ms ON sc.structure_id = ms.id
        WHERE c.channel_code = p_channel_code
            AND sc.service_number = p_service_number
            AND sc.is_active = TRUE
            AND c.is_active = TRUE
        LIMIT 1;
        
        IF v_structure_json IS NOT NULL THEN
            -- Insert or update cache
            INSERT INTO service_cache (
                cache_key,
                channel_code,
                service_number,
                structure_json,
                hit_count,
                expires_at
            ) VALUES (
                v_cache_key,
                p_channel_code,
                p_service_number,
                v_structure_json,
                1,
                DATE_ADD(NOW(), INTERVAL 1 HOUR)
            )
            ON DUPLICATE KEY UPDATE
                structure_json = v_structure_json,
                hit_count = 1,
                expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR);
        END IF;
        
        SELECT v_structure_json as structure_json, FALSE as from_cache;
    END IF;
END$$

-- Procedure to clean expired cache entries
CREATE PROCEDURE IF NOT EXISTS sp_CleanExpiredCache()
BEGIN
    DELETE FROM service_cache
    WHERE expires_at < NOW()
        OR last_accessed < DATE_SUB(NOW(), INTERVAL 24 HOUR);
    
    SELECT ROW_COUNT() as deleted_entries;
END$$

-- =============================================
-- 5. REPORTING PROCEDURES
-- =============================================

-- Procedure to get conversion statistics
CREATE PROCEDURE IF NOT EXISTS sp_GetConversionStatistics(
    IN p_channel_code VARCHAR(50),
    IN p_date_from DATE,
    IN p_date_to DATE
)
BEGIN
    SELECT 
        us.stat_date,
        c.channel_code,
        c.channel_name,
        us.service_number,
        us.conversion_type,
        us.request_count,
        us.success_count,
        us.error_count,
        ROUND((us.success_count / us.request_count) * 100, 2) as success_rate,
        us.avg_processing_time_ms,
        us.total_data_size_kb
    FROM usage_statistics us
    LEFT JOIN channels c ON us.channel_id = c.id
    WHERE (p_channel_code IS NULL OR c.channel_code = p_channel_code)
        AND us.stat_date BETWEEN p_date_from AND p_date_to
    ORDER BY us.stat_date DESC, c.channel_code, us.service_number;
END$$

-- Procedure to get recent errors
CREATE PROCEDURE IF NOT EXISTS sp_GetRecentErrors(
    IN p_channel_code VARCHAR(50),
    IN p_limit INT
)
BEGIN
    SELECT 
        cl.id,
        cl.request_id,
        c.channel_code,
        cl.service_number,
        cl.conversion_type,
        cl.status,
        cl.error_message,
        cl.error_details,
        cl.created_at
    FROM conversion_logs cl
    LEFT JOIN channels c ON cl.channel_id = c.id
    WHERE cl.status != 'success'
        AND (p_channel_code IS NULL OR c.channel_code = p_channel_code)
    ORDER BY cl.created_at DESC
    LIMIT p_limit;
END$$

-- =============================================
-- 6. MAINTENANCE PROCEDURES
-- =============================================

-- Procedure to archive old logs
CREATE PROCEDURE IF NOT EXISTS sp_ArchiveOldLogs(
    IN p_days_to_keep INT
)
BEGIN
    DECLARE v_archived_count BIGINT DEFAULT 0;
    
    -- Delete old conversion logs
    DELETE FROM conversion_logs
    WHERE created_at < DATE_SUB(NOW(), INTERVAL p_days_to_keep DAY);
    
    SET v_archived_count = ROW_COUNT();
    
    -- Delete old audit logs
    DELETE FROM audit_logs
    WHERE created_at < DATE_SUB(NOW(), INTERVAL p_days_to_keep DAY);
    
    SET v_archived_count = v_archived_count + ROW_COUNT();
    
    -- Clean old cache entries
    CALL sp_CleanExpiredCache();
    
    SELECT v_archived_count as total_archived;
END$$