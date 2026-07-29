import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import * as xlsx from "xlsx";
import initSqlJs, { Database } from "sql.js";
import { createServer as createViteServer } from "vite";
import { parseExcelDate, isTicketOverdue, isTicketUncompleted, getFormattedDateStr } from "./src/utils/dateParser.js";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

let db: Database | null = null;
const DB_FILE = path.join(process.cwd(), "tickets.db");

function saveDb(database: Database) {
  try {
    const data = database.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error("Error saving SQLite database file:", err);
  }
}

function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE,
      subject TEXT,
      status TEXT,
      department TEXT,
      type TEXT,
      owner TEXT,
      assigned_agent TEXT,
      creator TEXT,
      is_purchase_over_2000 TEXT,
      created_at TEXT,
      created_year INTEGER,
      created_month INTEGER,
      deadline_date TEXT,
      finished_date TEXT,
      pending_verification_date TEXT,
      closed_at TEXT,
      upload_batch_month INTEGER,
      upload_batch_year INTEGER,
      created_at_timestamp INTEGER,
      deadline_timestamp INTEGER,
      finished_timestamp INTEGER,
      is_overdue INTEGER,
      is_uncompleted INTEGER
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL,
      created_at TEXT
    );
  `);

  try {
    const userCheck = database.prepare("SELECT COUNT(*) as count FROM users WHERE username = 'bdouglas'");
    userCheck.step();
    const userCount = (userCheck.getAsObject().count as number) || 0;
    userCheck.free();

    if (userCount === 0) {
      const defaultHash = crypto.createHash('sha256').update('bdg123').digest('hex');
      database.run(
        "INSERT INTO users (username, password, name, role, created_at) VALUES (?, ?, ?, ?, ?)",
        ['bdouglas', defaultHash, 'Bayron Douglas', 'administrator', new Date().toISOString()]
      );
      console.log("Seeded default administrator user 'bdouglas'");
    }
  } catch (e) {
    console.error("Error seeding default user:", e);
  }
}

// Map flexible column headers from Excel
function getHeaderValue(row: Record<string, any>, possibleNames: string[]): any {
  if (!row) return null;
  const rowKeys = Object.keys(row);
  for (const name of possibleNames) {
    const cleanTarget = name.toLowerCase().replace(/[^a-z0-9áéíóú]/g, "");
    for (const key of rowKeys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9áéíóú]/g, "");
      if (cleanKey === cleanTarget) {
        return row[key];
      }
    }
  }
  return null;
}

// Helper to process and insert Excel rows into SQLite with formatting & optional discrimination
function processAndInsertExcelRows(
  database: Database,
  rawRows: Record<string, any>[],
  targetMonth?: number | null,
  targetYear?: number | null
) {
  let importedCount = 0;
  let discriminatedCount = 0;
  let sampleRows: any[] = [];

  const stmt = database.prepare(`
    INSERT INTO tickets (
      ticket_number, subject, status, department, type, owner, assigned_agent, creator,
      is_purchase_over_2000, created_at, created_year, created_month, deadline_date,
      finished_date, pending_verification_date, closed_at, upload_batch_month, upload_batch_year,
      created_at_timestamp, deadline_timestamp, finished_timestamp, is_overdue, is_uncompleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ticket_number) DO UPDATE SET
      subject=excluded.subject,
      status=excluded.status,
      department=excluded.department,
      type=excluded.type,
      owner=excluded.owner,
      assigned_agent=excluded.assigned_agent,
      creator=excluded.creator,
      is_purchase_over_2000=excluded.is_purchase_over_2000,
      created_at=excluded.created_at,
      created_year=excluded.created_year,
      created_month=excluded.created_month,
      deadline_date=excluded.deadline_date,
      finished_date=excluded.finished_date,
      pending_verification_date=excluded.pending_verification_date,
      closed_at=excluded.closed_at,
      upload_batch_month=excluded.upload_batch_month,
      upload_batch_year=excluded.upload_batch_year,
      created_at_timestamp=excluded.created_at_timestamp,
      deadline_timestamp=excluded.deadline_timestamp,
      finished_timestamp=excluded.finished_timestamp,
      is_overdue=excluded.is_overdue,
      is_uncompleted=excluded.is_uncompleted
  `);

  for (const row of rawRows) {
    const ticketNumber = getHeaderValue(row, ["Ticket Number", "Ticket", "Número de ticket", "Numero Ticket"]) || "";
    const createdAtRaw = getHeaderValue(row, ["Created At", "Fecha de Creación", "Fecha Creacion", "Creado"]);

    if (!ticketNumber || createdAtRaw === null || createdAtRaw === undefined) {
      discriminatedCount++;
      continue;
    }

    const parsedCreatedAt = parseExcelDate(createdAtRaw);
    if (!parsedCreatedAt) {
      discriminatedCount++;
      continue;
    }

    // DISCRIMINATION RULE: Only filter if targetMonth and targetYear are positive numbers
    if (targetMonth && targetYear && targetMonth > 0 && targetYear > 0) {
      if (parsedCreatedAt.month !== targetMonth || parsedCreatedAt.year !== targetYear) {
        discriminatedCount++;
        continue;
      }
    }

    const subject = getHeaderValue(row, ["Subject", "Asunto", "Título"]) || "Sin Asunto";
    const status = getHeaderValue(row, ["Status", "Estado"]) || "Abierto";
    const department = getHeaderValue(row, ["Department", "Departamento", "Área"]) || "No Especificado";
    const type = getHeaderValue(row, ["Type", "Tipo", "Tipo de Solicitud"]) || "Solicitud de Compra";
    const owner = getHeaderValue(row, ["Owner", "Propietario", "Solicitante"]) || "Desconocido";
    const assignedAgent = getHeaderValue(row, ["Assigned Agent", "Agente Asignado", "Agente"]) || "Sin Asignar";
    const creator = getHeaderValue(row, ["Creator", "Creador"]) || owner;
    const isOver2000 = String(getHeaderValue(row, ["¿La compra es mayor a $2000?", "es mayor", "Compra > $2000", "Mayor a 2000"]) || "No").trim();

    const deadlineRaw = getHeaderValue(row, ["Fecha Límite para realizar la compra", "Fecha Límite", "Fecha Limite", "Deadline"]);
    const finishedRaw = getHeaderValue(row, ["fecha_finalizada", "Fecha Finalizada", "Fecha de Finalización"]);
    const pendingRaw = getHeaderValue(row, ["fecha_pendiente_verificacion", "Fecha Pendiente Verificación"]);
    const closedRaw = getHeaderValue(row, ["Closed At", "Fecha Cierre", "Cerrado El"]);

    const parsedDeadline = parseExcelDate(deadlineRaw);
    const parsedFinished = parseExcelDate(finishedRaw);

    const createdAtDisplay = getFormattedDateStr(createdAtRaw);
    const deadlineDisplay = getFormattedDateStr(deadlineRaw);
    const finishedDisplay = getFormattedDateStr(finishedRaw);
    const pendingDisplay = getFormattedDateStr(pendingRaw);
    const closedDisplay = getFormattedDateStr(closedRaw);

    const overdueFlag = isTicketOverdue(deadlineRaw, finishedRaw) ? 1 : 0;
    const uncompletedFlag = isTicketUncompleted(finishedRaw, status) ? 1 : 0;

    stmt.run([
      String(ticketNumber).trim(),
      String(subject).trim(),
      String(status).trim(),
      String(department).trim(),
      String(type).trim(),
      String(owner).trim(),
      String(assignedAgent).trim(),
      String(creator).trim(),
      isOver2000,
      createdAtDisplay,
      parsedCreatedAt.year,
      parsedCreatedAt.month,
      deadlineDisplay || null,
      finishedDisplay || null,
      pendingDisplay || null,
      closedDisplay || null,
      targetMonth || parsedCreatedAt.month,
      targetYear || parsedCreatedAt.year,
      parsedCreatedAt.timestamp,
      parsedDeadline ? parsedDeadline.timestamp : null,
      parsedFinished ? parsedFinished.timestamp : null,
      overdueFlag,
      uncompletedFlag
    ]);

    importedCount++;
    if (sampleRows.length < 5) {
      sampleRows.push({
        ticket_number: String(ticketNumber).trim(),
        subject: String(subject).trim(),
        department: String(department).trim(),
        status: String(status).trim(),
        created_at: createdAtDisplay
      });
    }
  }

  stmt.free();
  saveDb(database);

  return { importedCount, discriminatedCount, totalRows: rawRows.length, sampleRows };
}

function loadExampleExcel(database: Database) {
  const examplePath = path.join(process.cwd(), "example", "report.xlsx");
  if (!fs.existsSync(examplePath)) {
    console.warn("No example report file found at:", examplePath);
    return { importedCount: 0, discriminatedCount: 0, totalRows: 0, sampleRows: [] };
  }

  const fileBuffer = fs.readFileSync(examplePath);
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet);

  return processAndInsertExcelRows(database, rawRows, null, null);
}

function autoLoadExampleExcel(database: Database) {
  try {
    const stmt = database.prepare("SELECT COUNT(*) as cnt FROM tickets");
    stmt.step();
    const count = (stmt.getAsObject().cnt as number) || 0;
    stmt.free();

    if (count === 0) {
      console.log("Database empty. Auto-loading example Faveo tickets from example/report.xlsx...");
      const result = loadExampleExcel(database);
      console.log(`Auto-loaded ${result.importedCount} tickets into SQLite.`);
    }
  } catch (err) {
    console.error("Error checking or auto-loading example excel:", err);
  }
}

// Initialize SQLite database via sql.js
async function getDb(): Promise<Database> {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }
  initSchema(db);
  autoLoadExampleExcel(db);
  saveDb(db);
  return db;
}

// --- AUTH & SESSIONS ---
interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: 'administrator' | 'gestor' | 'visor';
}

const activeSessions = new Map<string, SessionUser>();

function getSessionUser(req: express.Request): SessionUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  return activeSessions.get(token) || null;
}

// --- API ENDPOINTS ---

// AUTH: Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Nombre de usuario y contraseña requeridos." });
    }

    const database = await getDb();
    const passwordHash = crypto.createHash('sha256').update(String(password)).digest('hex');

    const stmt = database.prepare("SELECT id, username, name, role FROM users WHERE username = ? AND password = ?");
    stmt.bind([String(username).trim(), passwordHash]);

    let user: SessionUser | null = null;
    if (stmt.step()) {
      const obj = stmt.getAsObject();
      user = {
        id: obj.id as number,
        username: obj.username as string,
        name: (obj.name as string) || (obj.username as string),
        role: obj.role as 'administrator' | 'gestor' | 'visor',
      };
    }
    stmt.free();

    if (!user) {
      return res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos." });
    }

    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, user);

    return res.json({
      success: true,
      token,
      user
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Error interno del servidor en inicio de sesión." });
  }
});

// AUTH: Check session
app.get("/api/me", (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "No autenticado" });
  }
  return res.json({ success: true, user });
});

// AUTH: Logout
app.post("/api/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    activeSessions.delete(token);
  }
  return res.json({ success: true });
});

// USER MANAGEMENT: Get users (Administrator only)
app.get("/api/users", async (req, res) => {
  try {
    const user = getSessionUser(req);
    if (!user || user.role !== "administrator") {
      return res.status(403).json({ success: false, message: "Se requieren permisos de Administrador." });
    }

    const database = await getDb();
    const stmt = database.prepare("SELECT id, username, name, role, created_at FROM users ORDER BY id ASC");
    const users: any[] = [];
    while (stmt.step()) {
      users.push(stmt.getAsObject());
    }
    stmt.free();

    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// USER MANAGEMENT: Create user (Administrator only)
app.post("/api/users", async (req, res) => {
  try {
    const user = getSessionUser(req);
    if (!user || user.role !== "administrator") {
      return res.status(403).json({ success: false, message: "Se requieren permisos de Administrador." });
    }

    const { username, password, name, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: "Nombre de usuario, contraseña y rol son obligatorios." });
    }

    if (!['administrator', 'gestor', 'visor'].includes(role)) {
      return res.status(400).json({ success: false, message: "Rol no válido. Debe ser administrator, gestor o visor." });
    }

    const database = await getDb();

    // Check existing username
    const checkStmt = database.prepare("SELECT COUNT(*) as cnt FROM users WHERE username = ?");
    checkStmt.bind([String(username).trim()]);
    checkStmt.step();
    const count = (checkStmt.getAsObject().cnt as number) || 0;
    checkStmt.free();

    if (count > 0) {
      return res.status(400).json({ success: false, message: "El usuario ya existe en la base de datos." });
    }

    const passwordHash = crypto.createHash('sha256').update(String(password)).digest('hex');
    database.run(
      "INSERT INTO users (username, password, name, role, created_at) VALUES (?, ?, ?, ?, ?)",
      [String(username).trim(), passwordHash, name || String(username).trim(), role, new Date().toISOString()]
    );
    saveDb(database);

    return res.json({ success: true, message: "Usuario creado exitosamente." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// USER MANAGEMENT: Delete user (Administrator only)
app.delete("/api/users/:id", async (req, res) => {
  try {
    const user = getSessionUser(req);
    if (!user || user.role !== "administrator") {
      return res.status(403).json({ success: false, message: "Se requieren permisos de Administrador." });
    }

    const targetId = parseInt(req.params.id, 10);
    if (user.id === targetId) {
      return res.status(400).json({ success: false, message: "No puedes eliminar tu propio usuario en sesión activa." });
    }

    const database = await getDb();
    database.run("DELETE FROM users WHERE id = ?", [targetId]);
    saveDb(database);

    return res.json({ success: true, message: "Usuario eliminado con éxito." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// USER MANAGEMENT: Change password (Administrator only)
app.put("/api/users/:id/password", async (req, res) => {
  try {
    const user = getSessionUser(req);
    if (!user || user.role !== "administrator") {
      return res.status(403).json({ success: false, message: "Se requieren permisos de Administrador." });
    }

    const targetId = parseInt(req.params.id, 10);
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "Nueva contraseña requerida." });
    }

    const database = await getDb();
    const passwordHash = crypto.createHash('sha256').update(String(password)).digest('hex');
    database.run("UPDATE users SET password = ? WHERE id = ?", [passwordHash, targetId]);
    saveDb(database);

    return res.json({ success: true, message: "Contraseña actualizada exitosamente." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 1. Upload Excel and Filter by Month/Year
app.post("/api/upload-excel", upload.single("excel_file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No se adjuntó ningún archivo de Excel." });
    }

    const targetMonth = req.body.target_month ? parseInt(req.body.target_month, 10) : 0;
    const targetYear = req.body.target_year ? parseInt(req.body.target_year, 10) : 0;

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet);
    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ success: false, message: "El archivo de Excel está vacío o no contiene filas con datos." });
    }

    const database = await getDb();
    const result = processAndInsertExcelRows(database, rawRows, targetMonth, targetYear);

    return res.json({
      success: true,
      message: `Procesamiento completado con éxito.`,
      target_month: targetMonth,
      target_year: targetYear,
      total_excel_rows: result.totalRows,
      imported_count: result.importedCount,
      discriminated_count: result.discriminatedCount,
      sample_rows: result.sampleRows
    });
  } catch (error: any) {
    console.error("Error uploading excel:", error);
    return res.status(500).json({ success: false, message: error.message || "Error al procesar el archivo Excel." });
  }
});

// 2. Seed Sample Data (Imports example/report.xlsx)
app.post("/api/seed-sample-data", async (req, res) => {
  try {
    const database = await getDb();
    const result = loadExampleExcel(database);

    return res.json({
      success: true,
      message: `Se importaron exitosamente ${result.importedCount} tickets provenientes del archivo de reporte Faveo (example/report.xlsx) en la base de datos SQLite.`,
      imported_count: result.importedCount,
      total_rows: result.totalRows
    });
  } catch (error: any) {
    console.error("Error seeding sample data:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Get All Tickets (with optional filters)
app.get("/api/tickets", async (req, res) => {
  try {
    const database = await getDb();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : null;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : null;
    const department = req.query.department as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let whereClause: string[] = [];
    let params: any[] = [];

    if (month) {
      whereClause.push("created_month = ?");
      params.push(month);
    }
    if (year) {
      whereClause.push("created_year = ?");
      params.push(year);
    }
    if (department && department !== "ALL") {
      whereClause.push("department = ?");
      params.push(department);
    }
    if (status && status !== "ALL") {
      whereClause.push("status = ?");
      params.push(status);
    }
    if (search) {
      whereClause.push("(ticket_number LIKE ? OR subject LIKE ? OR owner LIKE ? OR assigned_agent LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const query = `
      SELECT * FROM tickets
      ${whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : ""}
      ORDER BY id DESC
    `;

    const stmt = database.prepare(query);
    stmt.bind(params);

    const tickets: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      tickets.push(row);
    }
    stmt.free();

    return res.json({ success: true, tickets });
  } catch (error: any) {
    console.error("Error fetching tickets:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Get Dashboard Statistics
app.get("/api/stats", async (req, res) => {
  try {
    const database = await getDb();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : null;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : null;

    let whereSql = "";
    let params: any[] = [];
    if (month && year) {
      whereSql = "WHERE created_month = ? AND created_year = ?";
      params = [month, year];
    } else if (year) {
      whereSql = "WHERE created_year = ?";
      params = [year];
    }

    // Overall database total (all months/years)
    const dbTotalStmt = database.prepare("SELECT COUNT(*) as db_total FROM tickets");
    dbTotalStmt.step();
    const dbTotalCount = (dbTotalStmt.getAsObject().db_total as number) || 0;
    dbTotalStmt.free();

    // Total tickets for selected month/year
    const totalStmt = database.prepare(`SELECT COUNT(*) as total FROM tickets ${whereSql}`);
    totalStmt.bind(params);
    totalStmt.step();
    const totalCount = totalStmt.getAsObject().total as number || 0;
    totalStmt.free();

    // Open & Closed counts
    const openStmt = database.prepare(`SELECT COUNT(*) as open_cnt FROM tickets ${whereSql ? whereSql + " AND " : "WHERE "} status = 'Abierto'`);
    openStmt.bind(params);
    openStmt.step();
    const openCount = openStmt.getAsObject().open_cnt as number || 0;
    openStmt.free();

    const closedStmt = database.prepare(`SELECT COUNT(*) as closed_cnt FROM tickets ${whereSql ? whereSql + " AND " : "WHERE "} status = 'Cerrado'`);
    closedStmt.bind(params);
    closedStmt.step();
    const closedCount = closedStmt.getAsObject().closed_cnt as number || 0;
    closedStmt.free();

    const paymentStmt = database.prepare(`SELECT COUNT(*) as pay_cnt FROM tickets ${whereSql ? whereSql + " AND " : "WHERE "} status LIKE '%pago%'`);
    paymentStmt.bind(params);
    paymentStmt.step();
    const inPaymentCount = paymentStmt.getAsObject().pay_cnt as number || 0;
    paymentStmt.free();

    // Overdue (fecha_finalizada > deadline)
    const overdueStmt = database.prepare(`SELECT COUNT(*) as overdue_cnt FROM tickets ${whereSql ? whereSql + " AND " : "WHERE "} is_overdue = 1`);
    overdueStmt.bind(params);
    overdueStmt.step();
    const overdueCount = overdueStmt.getAsObject().overdue_cnt as number || 0;
    overdueStmt.free();

    // Uncompleted (no fecha_finalizada)
    const uncompletedStmt = database.prepare(`SELECT COUNT(*) as uncomp_cnt FROM tickets ${whereSql ? whereSql + " AND " : "WHERE "} is_uncompleted = 1`);
    uncompletedStmt.bind(params);
    uncompletedStmt.step();
    const uncompletedCount = uncompletedStmt.getAsObject().uncomp_cnt as number || 0;
    uncompletedStmt.free();

    // Purchase > 2000
    const over2000Stmt = database.prepare(`SELECT COUNT(*) as cnt FROM tickets ${whereSql ? whereSql + " AND " : "WHERE "} (is_purchase_over_2000 = 'Si' OR is_purchase_over_2000 = 'SI' OR is_purchase_over_2000 = 'True')`);
    over2000Stmt.bind(params);
    over2000Stmt.step();
    const over2000Count = over2000Stmt.getAsObject().cnt as number || 0;
    over2000Stmt.free();

    // By Department
    const deptStmt = database.prepare(`
      SELECT department, COUNT(*) as count,
        SUM(CASE WHEN status = 'Abierto' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'Cerrado' THEN 1 ELSE 0 END) as closed
      FROM tickets ${whereSql}
      GROUP BY department
      ORDER BY count DESC
    `);
    deptStmt.bind(params);
    const byDepartment: any[] = [];
    while (deptStmt.step()) {
      byDepartment.push(deptStmt.getAsObject());
    }
    deptStmt.free();

    // By Status
    const statusStmt = database.prepare(`
      SELECT status, COUNT(*) as count
      FROM tickets ${whereSql}
      GROUP BY status
      ORDER BY count DESC
    `);
    statusStmt.bind(params);
    const byStatus: any[] = [];
    while (statusStmt.step()) {
      byStatus.push(statusStmt.getAsObject());
    }
    statusStmt.free();

    // By Type
    const typeStmt = database.prepare(`
      SELECT type, COUNT(*) as count
      FROM tickets ${whereSql}
      GROUP BY type
      ORDER BY count DESC
    `);
    typeStmt.bind(params);
    const byType: any[] = [];
    while (typeStmt.step()) {
      byType.push(typeStmt.getAsObject());
    }
    typeStmt.free();

    // By Agent
    const agentStmt = database.prepare(`
      SELECT assigned_agent as agent, COUNT(*) as count,
        SUM(CASE WHEN status = 'Abierto' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'Cerrado' THEN 1 ELSE 0 END) as closed
      FROM tickets ${whereSql}
      GROUP BY assigned_agent
      ORDER BY count DESC
    `);
    agentStmt.bind(params);
    const byAgent: any[] = [];
    while (agentStmt.step()) {
      byAgent.push(agentStmt.getAsObject());
    }
    agentStmt.free();

    // Distinct months/years available in DB with ticket counts
    const monthsStmt = database.prepare(`
      SELECT created_month as month, created_year as year, COUNT(*) as count
      FROM tickets
      WHERE created_month IS NOT NULL AND created_year IS NOT NULL
      GROUP BY created_year, created_month
      ORDER BY year DESC, month DESC
    `);
    const monthsAvailable: any[] = [];
    while (monthsStmt.step()) {
      monthsAvailable.push(monthsStmt.getAsObject());
    }
    monthsStmt.free();

    return res.json({
      success: true,
      stats: {
        db_total_tickets: dbTotalCount,
        total_tickets: totalCount,
        open_tickets: openCount,
        closed_tickets: closedCount,
        in_payment_tickets: inPaymentCount,
        overdue_tickets: overdueCount,
        uncompleted_tickets: uncompletedCount,
        over_2000_tickets: over2000Count,
        under_2000_tickets: Math.max(0, totalCount - over2000Count),
        by_department: byDepartment,
        by_status: byStatus,
        by_type: byType,
        by_agent: byAgent,
        on_time_compliance: {
          on_time: Math.max(0, totalCount - overdueCount - uncompletedCount),
          late: overdueCount,
          pending_no_date: uncompletedCount
        },
        months_available: monthsAvailable
      }
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Get Special Tickets (Overdue & Uncompleted)
app.get("/api/special-tickets", async (req, res) => {
  try {
    const database = await getDb();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : null;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : null;

    let monthFilter = "";
    let params: any[] = [];
    if (month && year) {
      monthFilter = " AND created_month = ? AND created_year = ?";
      params = [month, year];
    } else if (year) {
      monthFilter = " AND created_year = ?";
      params = [year];
    }

    // Overdue tickets (fecha_limite < fecha_finalizada)
    const overdueQuery = `SELECT * FROM tickets WHERE is_overdue = 1 ${monthFilter} ORDER BY id DESC`;
    const overdueStmt = database.prepare(overdueQuery);
    overdueStmt.bind(params);
    const overdueTickets: any[] = [];
    while (overdueStmt.step()) {
      overdueTickets.push(overdueStmt.getAsObject());
    }
    overdueStmt.free();

    // Uncompleted tickets (sin fecha_finalizada)
    const uncompQuery = `SELECT * FROM tickets WHERE is_uncompleted = 1 ${monthFilter} ORDER BY id DESC`;
    const uncompStmt = database.prepare(uncompQuery);
    uncompStmt.bind(params);
    const uncompletedTickets: any[] = [];
    while (uncompStmt.step()) {
      uncompletedTickets.push(uncompStmt.getAsObject());
    }
    uncompStmt.free();

    return res.json({
      success: true,
      overdue_tickets: overdueTickets,
      uncompleted_tickets: uncompletedTickets,
      all_special_count: overdueTickets.length + uncompletedTickets.length
    });
  } catch (error: any) {
    console.error("Error fetching special tickets:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Reset or Clear DB data (by month or all)
app.delete("/api/tickets/reset", async (req, res) => {
  try {
    const sessionUser = getSessionUser(req);
    if (sessionUser && sessionUser.role !== 'administrator') {
      return res.status(403).json({ success: false, message: "Se requieren permisos de Administrador para gestionar o eliminar datos." });
    }

    const database = await getDb();
    
    // Parse query params or body parameters
    let month = req.query.month ? parseInt(req.query.month as string, 10) : null;
    let year = req.query.year ? parseInt(req.query.year as string, 10) : null;
    
    if (!month && req.body && req.body.month) {
      month = parseInt(req.body.month, 10);
    }
    if (!year && req.body && req.body.year) {
      year = parseInt(req.body.year, 10);
    }

    if (month && year && month > 0 && year > 0) {
      // Count records to be deleted for this month/year
      const countStmt = database.prepare("SELECT COUNT(*) as cnt FROM tickets WHERE (created_month = ? AND created_year = ?) OR (upload_batch_month = ? AND upload_batch_year = ?)");
      countStmt.bind([month, year, month, year]);
      countStmt.step();
      const count = (countStmt.getAsObject().cnt as number) || 0;
      countStmt.free();

      database.run("DELETE FROM tickets WHERE (created_month = ? AND created_year = ?) OR (upload_batch_month = ? AND upload_batch_year = ?);", [month, year, month, year]);
      saveDb(database);
      return res.json({
        success: true,
        deleted_count: count,
        message: `Se eliminaron exitosamente ${count} registros correspondientes a ${month}/${year}.`
      });
    } else {
      // Delete ALL records
      const countStmt = database.prepare("SELECT COUNT(*) as cnt FROM tickets");
      countStmt.step();
      const count = (countStmt.getAsObject().cnt as number) || 0;
      countStmt.free();

      database.run("DELETE FROM tickets;");
      saveDb(database);
      return res.json({
        success: true,
        deleted_count: count,
        message: `Base de datos vaciada por completo. Se eliminaron ${count} tickets.`
      });
    }
  } catch (error: any) {
    console.error("Error resetting DB:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Vite & Static file handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
