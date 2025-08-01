-- SimImporter Database Schema
-- Database for MQ Importer API - JSON to Fixed-length string conversion

USE SimImporter;

-- =============================================
-- 1. CORE TABLES FOR MESSAGE STRUCTURES
-- =============================================

-- Table for storing Excel file metadata
CREATE TABLE IF NOT EXISTS excel_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100),
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    INDEX idx_filename (filename),
    INDEX idx_status (status),
    INDEX idx_uploaded_at (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing message structures parsed from Excel
CREATE TABLE IF NOT EXISTS message_structures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    excel_file_id INT NOT NULL,
    service_number VARCHAR(50) NOT NULL,
    service_name VARCHAR(255),
    version VARCHAR(50),
    structure_json JSON NOT NULL,
    headers_json JSON,
    field_count INT,
    total_length INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (excel_file_id) REFERENCES excel_files(id) ON DELETE CASCADE,
    UNIQUE KEY uk_service_version (service_number, version),
    INDEX idx_service_number (service_number),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for individual field definitions
CREATE TABLE IF NOT EXISTS field_definitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    structure_id INT NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50),
    field_length INT NOT NULL,
    position_start INT NOT NULL,
    position_end INT NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    default_value VARCHAR(500),
    validation_rules JSON,
    field_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (structure_id) REFERENCES message_structures(id) ON DELETE CASCADE,
    INDEX idx_structure_field (structure_id, field_name),
    INDEX idx_position (structure_id, position_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. SERVICE CONFIGURATION TABLES
-- =============================================

-- Table for channels/systems
CREATE TABLE IF NOT EXISTS channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_code VARCHAR(50) NOT NULL UNIQUE,
    channel_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_channel_code (channel_code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for service configurations per channel
CREATE TABLE IF NOT EXISTS service_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id INT NOT NULL,
    service_number VARCHAR(50) NOT NULL,
    structure_id INT NOT NULL,
    config_json JSON,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (structure_id) REFERENCES message_structures(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_channel_service_active (channel_id, service_number, is_active),
    INDEX idx_service_lookup (channel_id, service_number, is_active),
    INDEX idx_valid_dates (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. CONVERSION LOGS AND HISTORY
-- =============================================

-- Table for conversion requests and responses
CREATE TABLE IF NOT EXISTS conversion_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(100) UNIQUE,
    channel_id INT,
    service_number VARCHAR(50),
    conversion_type ENUM('IDA', 'VUELTA') NOT NULL,
    input_data TEXT,
    output_data TEXT,
    status ENUM('success', 'error', 'validation_error') NOT NULL,
    error_message TEXT,
    error_details JSON,
    processing_time_ms INT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
    INDEX idx_request_id (request_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status),
    INDEX idx_channel_service (channel_id, service_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for detailed field-level conversion errors
CREATE TABLE IF NOT EXISTS conversion_errors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    log_id BIGINT NOT NULL,
    field_name VARCHAR(255),
    field_position INT,
    error_type VARCHAR(100),
    error_message TEXT,
    expected_value VARCHAR(500),
    actual_value VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (log_id) REFERENCES conversion_logs(id) ON DELETE CASCADE,
    INDEX idx_log_id (log_id),
    INDEX idx_error_type (error_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. SYSTEM TABLES
-- =============================================

-- Table for API keys and authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_key VARCHAR(100) NOT NULL UNIQUE,
    api_secret_hash VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    channel_id INT,
    permissions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
    INDEX idx_api_key (api_key),
    INDEX idx_active (is_active),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for system events and audit log
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    ip_address VARCHAR(45),
    old_values JSON,
    new_values JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. PERFORMANCE AND CACHE TABLES
-- =============================================

-- Table for caching frequently used service lookups
CREATE TABLE IF NOT EXISTS service_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    channel_code VARCHAR(50) NOT NULL,
    service_number VARCHAR(50) NOT NULL,
    structure_json JSON NOT NULL,
    hit_count INT DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cache_key (cache_key),
    INDEX idx_expires (expires_at),
    INDEX idx_last_accessed (last_accessed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. STATISTICS AND METRICS
-- =============================================

-- Table for daily usage statistics
CREATE TABLE IF NOT EXISTS usage_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    channel_id INT,
    service_number VARCHAR(50),
    conversion_type ENUM('IDA', 'VUELTA'),
    request_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    avg_processing_time_ms DECIMAL(10,2),
    total_data_size_kb BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
    UNIQUE KEY uk_daily_stats (stat_date, channel_id, service_number, conversion_type),
    INDEX idx_stat_date (stat_date),
    INDEX idx_channel_service (channel_id, service_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;