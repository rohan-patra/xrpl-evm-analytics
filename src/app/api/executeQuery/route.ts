import { NextResponse } from "next/server";
import { Pool } from "pg";
import { config } from "dotenv";

config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_CONNECTION_STRING,
});

export async function POST(request: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { query } = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const res = await pool.query(query);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return NextResponse.json(res.rows);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.error("Error executing query", err.stack);
    return NextResponse.error();
  }
}
