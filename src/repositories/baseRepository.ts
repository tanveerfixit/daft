import mysql from 'mysql2/promise';
import { pool } from '../mysql.js';

/**
 * Executes a callback inside a managed MySQL ACID transaction.
 * Automatically commits on success, rolls back on any thrown error,
 * and guarantees connection release back to the pool.
 */
export async function withTransaction<T>(
  work: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // Ignore rollback error if connection dropped
    }
    throw err;
  } finally {
    conn.release();
  }
}
