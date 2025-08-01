const { initializeDatabase, getConnection, closeDatabase } = require('../config/database');

const storedProcedures = [
  {
    name: 'sp_GetServiceConfiguration',
    sql: `
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
END`
  },
  {
    name: 'sp_ListChannelServices',
    sql: `
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
END`
  },
  {
    name: 'sp_LogConversion',
    sql: `
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
    
    SELECT id INTO v_channel_id 
    FROM channels 
    WHERE channel_code = p_channel_code 
    LIMIT 1;
    
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
    
    CALL sp_UpdateUsageStatistics(
        v_channel_id,
        p_service_number,
        p_conversion_type,
        p_status,
        p_processing_time_ms,
        LENGTH(COALESCE(p_input_data, '')) + LENGTH(COALESCE(p_output_data, ''))
    );
    
    SELECT LAST_INSERT_ID() as log_id;
END`
  },
  {
    name: 'sp_UpdateUsageStatistics',
    sql: `
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
END`
  },
  {
    name: 'sp_GetConversionStatistics',
    sql: `
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
END`
  }
];

async function createStoredProcedures() {
  console.log('🚀 Creating stored procedures in SimImporter database...\n');
  
  let connection;
  
  try {
    await initializeDatabase();
    connection = await getConnection();
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const proc of storedProcedures) {
      try {
        console.log(`📝 Creating procedure: ${proc.name}`);
        await connection.query(proc.sql);
        successCount++;
        console.log(`✅ ${proc.name} created successfully`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error creating ${proc.name}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Summary: ${successCount} successful, ${errorCount} errors`);
    
    // Verify procedures
    const [procedures] = await connection.query("SHOW PROCEDURE STATUS WHERE Db = 'SimImporter'");
    console.log(`\n📋 Found ${procedures.length} stored procedures in database:`);
    procedures.forEach(proc => {
      console.log(`  - ${proc.Name}`);
    });
    
  } catch (error) {
    console.error('\n❌ Failed to create stored procedures:', error.message);
  } finally {
    if (connection) connection.release();
    await closeDatabase();
    process.exit(0);
  }
}

createStoredProcedures();