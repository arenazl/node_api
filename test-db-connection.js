const { initializeDatabase, query, closeDatabase } = require('./config/database');

async function testConnection() {
  console.log('🔄 Testing database connection...\n');
  
  try {
    await initializeDatabase();
    
    console.log('\n📊 Testing basic query...');
    const result = await query('SELECT 1 as test');
    console.log('Query result:', result);
    
    console.log('\n📊 Checking database version...');
    const version = await query('SELECT VERSION() as version');
    console.log('MySQL version:', version[0].version);
    
    console.log('\n📊 Listing tables...');
    const tables = await query('SHOW TABLES');
    console.log('Tables in database:', tables);
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

testConnection();