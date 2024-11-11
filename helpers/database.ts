import dotenv from 'dotenv'; // only for local dev
import pkg from 'pg';
import { v4 as uuidv4 } from 'uuid';

dotenv.config(); // only for local dev
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.PGUSER,  
  host: process.env.PGUSERHOST,
  database: process.env.PGDATABASE, 
  password: process.env.PGPASSWORD, 
  port: Number(process.env.PGPORT), 
});

interface ErrorData {
  project_id: string;
  error: {
    name?: string;
    message?: string;
    stack?: string;
  };
  timestamp: string;
  line_number?: number;
  col_number?: number;
  handled: boolean;
}

interface RejectionData {
  value: string;
  timestamp: string;
  project_id: string;
  handled: boolean;
}

export const saveErrorData = async (data: ErrorData) => {
  try {
    const project = await pool.query('SELECT id FROM projects WHERE uuid = $1', [data.project_id])
    // TODO: Validate that project exists?
    const projectId = project.rows[0].id ? project.rows[0].id : null;

    if (!projectId) return { success: false, error: "Project not found."}

    const error_uuid = uuidv4();
    const query = `INSERT INTO error_logs (uuid, name, message, created_at,
    line_number, col_number, project_id, stack_trace, handled) VALUES 
    ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`;
  
    const result = await pool.query(
      query,
      [
        error_uuid,
        data.error.name || 'UnknownError',
        data.error.message || 'No message provided',
        data.timestamp,
        data.line_number || null,
        data.col_number || null,
        projectId,
        data.error.stack || 'No stack trace available',
        data.handled,
      ]
    );
  
    return { success: true, result };
  } catch (e) {
    console.error("Error saving error data to PostgreSQL", e);
    return { success: false, error: e };
  }

}

export const saveRejectionData = async (data: RejectionData) => {
  try {
    const project = await pool.query('SELECT id FROM projects WHERE uuid = $1', [data.project_id])
    // TODO: Validate that project exists?
    const projectId = project.rows[0].id ? project.rows[0].id : null;

    if (!projectId) return { success: false, error: "Project not found."}

    const query = `INSERT INTO rejection_logs (value, created_at, 
    project_id, handled) VALUES ($1, $2, $3, $4) RETURNING id`;

    const result = await pool.query(
      query,
      [
        data.value,
        data.timestamp,
        projectId,
        data.handled,
      ]
    );

    return { success: true, result };
  } catch (e) {
    console.error("Error saving promise data to PostgreSQL", e);
    return { success: false, error: e };
  }
}