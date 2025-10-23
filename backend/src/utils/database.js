import pg from 'pg';
import logger from './logger.js';

const { Pool } = pg;

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'vms_onvif',
  user: process.env.DB_USER || 'vms_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  logger.debug('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
});

// Initialize database schema
export async function initDatabase() {
  const client = await pool.connect();
  
  try {
    // Create cameras table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cameras (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        port INTEGER DEFAULT 80,
        username VARCHAR(100),
        password VARCHAR(100),
        manufacturer VARCHAR(100),
        model VARCHAR(100),
        firmware_version VARCHAR(50),
        onvif_url TEXT,
        rtsp_url TEXT,
        status VARCHAR(20) DEFAULT 'offline',
        enabled BOOLEAN DEFAULT true,
        position_preset JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create streams table
    await client.query(`
      CREATE TABLE IF NOT EXISTS streams (
        id SERIAL PRIMARY KEY,
        camera_id INTEGER REFERENCES cameras(id) ON DELETE CASCADE,
        stream_url TEXT NOT NULL,
        hls_url TEXT,
        stream_type VARCHAR(20) DEFAULT 'main',
        resolution VARCHAR(20),
        fps INTEGER,
        bitrate INTEGER,
        codec VARCHAR(20),
        status VARCHAR(20) DEFAULT 'stopped',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create recordings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS recordings (
        id SERIAL PRIMARY KEY,
        camera_id INTEGER REFERENCES cameras(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        file_size BIGINT,
        duration INTEGER,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        recording_type VARCHAR(20) DEFAULT 'continuous',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        camera_id INTEGER REFERENCES cameras(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'info',
        description TEXT,
        snapshot_path TEXT,
        metadata JSONB,
        acknowledged BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email VARCHAR(255),
        role VARCHAR(20) DEFAULT 'viewer',
        permissions JSONB,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cameras_enabled ON cameras(enabled)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_streams_camera_id ON streams(camera_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_recordings_camera_id ON recordings(camera_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_recordings_start_time ON recordings(start_time)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_events_camera_id ON events(camera_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)');

    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Query helper
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error:', { text, error: error.message });
    throw error;
  }
}

// Transaction helper
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { pool };
export default { pool, query, transaction, initDatabase };
