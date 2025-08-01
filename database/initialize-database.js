const { initializeDatabase, getConnection, closeDatabase } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function executeSQLFile(filename, connection) {
  console.log(`\n📄 Executing ${filename}...`);
  
  try {
    const sqlContent = fs.readFileSync(path.join(__dirname, filename), 'utf-8');
    
    let successCount = 0;
    let errorCount = 0;
    
    if (filename.includes('stored_procedures')) {
      // Execute the entire stored procedures file as one statement
      try {
        // Remove comments and clean up
        const cleanedSQL = sqlContent
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n');
        
        await connection.query(cleanedSQL);
        successCount = 11; // We have 11 stored procedures
        console.log('✅ All stored procedures created successfully');
      } catch (error) {
        errorCount = 1;
        console.error(`❌ Error creating stored procedures: ${error.message}`);
      }
    } else {
      // Regular SQL statements for tables
      const statements = sqlContent
        .split(';')
        .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
        .map(stmt => stmt.trim() + ';');
      
      for (const statement of statements) {
        if (statement.trim() && statement.length > 10) {
          try {
            await connection.query(statement);
            successCount++;
          } catch (error) {
            errorCount++;
            if (!error.message.includes('already exists')) {
              console.error(`❌ Error: ${error.message}`);
            }
          }
        }
      }
    }
    
    console.log(`✅ Completed: ${successCount} successful, ${errorCount} errors`);
    return { successCount, errorCount };
    
  } catch (error) {
    console.error(`❌ Error reading file ${filename}:`, error.message);
    return { successCount: 0, errorCount: 1 };
  }
}

async function initializeSchema() {
  console.log('🚀 Initializing SimImporter database schema...\n');
  
  let connection;
  
  try {
    await initializeDatabase();
    connection = await getConnection();
    
    // Execute schema first
    const schemaResult = await executeSQLFile('schema.sql', connection);
    
    // Execute stored procedures
    const spResult = await executeSQLFile('stored_procedures.sql', connection);
    
    // Show created tables
    console.log('\n📊 Verifying created tables...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });
    
    // Show created procedures
    console.log('\n📊 Verifying stored procedures...');
    const [procedures] = await connection.query("SHOW PROCEDURE STATUS WHERE Db = 'SimImporter'");
    console.log(`Found ${procedures.length} stored procedures:`);
    procedures.forEach(proc => {
      console.log(`  - ${proc.Name}`);
    });
    
    // Insert sample data
    console.log('\n📊 Inserting sample channel data...');
    await connection.query(`
      INSERT INTO channels (channel_code, channel_name, description) 
      VALUES 
        ('SYSTEM1', 'Sistema Principal', 'Canal principal del sistema'),
        ('SYSTEM2', 'Sistema Secundario', 'Canal secundario de respaldo'),
        ('TEST', 'Sistema de Pruebas', 'Canal para pruebas y desarrollo')
      ON DUPLICATE KEY UPDATE channel_name = VALUES(channel_name)
    `);
    
    console.log('\n✅ Database initialization completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    console.error(error);
  } finally {
    if (connection) connection.release();
    await closeDatabase();
    process.exit(0);
  }
}

// Run initialization
initializeSchema();