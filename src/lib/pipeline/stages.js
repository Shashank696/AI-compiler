import { invokeLLM } from "@/api/geminiClient";
import { IR_SCHEMA, ARCHITECTURE_SCHEMA, FULL_SCHEMA, validateAgainstSchema, buildDependencyGraph } from "./schemas";

// ─── Stage 1: Intent Extractor ───────────────────────────────────────────────
export async function runStage1(prompt) {
  const result = await invokeLLM({
    prompt: `You are a compiler's front-end: a precise Intent Extractor.
Analyze the following natural language app description and extract a canonical Intermediate Representation (IR).

USER PROMPT: "${prompt}"

Rules:
- Extract ALL entities mentioned or implied
- Extract ALL roles (explicit or inferred from context like "admin can see analytics" → admin role)
- Extract ALL features (login, dashboard, payments, etc.)
- Infer app_type from context (crm, ecommerce, saas, social, analytics, etc.)
- Be exhaustive. Missing an entity or role is a compile error.
- Assumptions must be documented in goals[] if you infer something not explicit.

Output ONLY valid JSON matching this exact schema. No explanation, no markdown, pure JSON.`,
    response_json_schema: IR_SCHEMA
  });

  // Defensive defaults
  if (result) {
    if (!result.entities) result.entities = [];
    if (!result.roles) result.roles = [];
    if (!result.features) result.features = [];
    if (!result.goals) result.goals = [];
    if (!result.app_type) result.app_type = "web_app";
  }

  const errors = validateAgainstSchema(result, IR_SCHEMA);
  return { output: result, errors };
}

// ─── Stage 2: Architecture Generator ─────────────────────────────────────────
export async function runStage2(irOutput) {
  const result = await invokeLLM({
    prompt: `You are a system architect. Given this canonical IR, generate the application architecture.

IR INPUT: ${JSON.stringify(irOutput, null, 2)}

Rules:
- Define all user flows (e.g. login_flow, checkout_flow, admin_dashboard_flow)
- Map permissions: each role → list of allowed actions
- Define module_map: each module → list of sub-features
- Every entity from the IR must appear in at least one flow
- Every role from the IR must have permissions defined

Output ONLY valid JSON. Pure JSON, no markdown.`,
    response_json_schema: ARCHITECTURE_SCHEMA
  });

  // Defensive defaults
  if (result) {
    if (!result.user_flows) result.user_flows = [];
    if (!result.role_permissions) result.role_permissions = [];
    if (!result.module_map) result.module_map = [];
  }

  const errors = validateAgainstSchema(result, ARCHITECTURE_SCHEMA);
  return { output: result, errors };
}

// ─── Stage 3: Schema Generator ───────────────────────────────────────────────
export async function runStage3(irOutput, architectureOutput) {
  const schemaResult = await invokeLLM({
    prompt: `You are a schema compiler. Generate complete typed schemas from IR and Architecture.

IR: ${JSON.stringify(irOutput, null, 2)}
ARCHITECTURE: ${JSON.stringify(architectureOutput, null, 2)}

CRITICAL RULES:
1. Every entity in IR → must become a DB table with columns matching IR field definitions
2. Every UI page must have an API endpoint backing it
3. API request/response fields MUST use exact field names from DB schema columns (no aliases, no new fields)
4. Auth guards must cover every page marked with restricted access
5. Business logic rules must implement every feature with a gating condition (e.g. premium gating)
6. assumptions[] must list every inference you made (e.g. "Assumed PostgreSQL", "Assumed JWT for auth")
7. validation_status must be "pending" (will be updated by validation engine)
8. repair_log must be empty array []

FIELD CONSISTENCY MANDATE: 
- If DB table 'users' has column 'email', API endpoints must reference 'email' exactly
- No hallucinated field names allowed

Output ONLY valid JSON matching the full schema. Pure JSON.`,
    response_json_schema: FULL_SCHEMA
  });

  // Defensive defaults
  if (schemaResult) {
    if (!schemaResult.auth_schema) {
      schemaResult.auth_schema = {
        strategy: "JWT",
        roles: irOutput?.roles || ["user"],
        restricted_routes: []
      };
    }
    if (!schemaResult.assumptions) {
      schemaResult.assumptions = [];
    }
    if (!schemaResult.validation_status) {
      schemaResult.validation_status = "pending";
    }
    if (!schemaResult.repair_log) {
      schemaResult.repair_log = [];
    }
  }

  const errors = validateAgainstSchema(schemaResult, FULL_SCHEMA);
  return { output: schemaResult, errors };
}

// ─── Stage 4: Validation Engine + Dependency Graph ───────────────────────────
export async function runStage4(schemas) {
  const { ui_schema, api_schema, db_schema } = schemas;
  const graph = buildDependencyGraph(api_schema, db_schema, ui_schema);

  const schemaErrors = validateAgainstSchema(schemas, FULL_SCHEMA);

  const allIssues = [
    ...graph.mismatches.map(m => ({ ...m, severity: "error" })),
    ...schemaErrors.map(e => ({ ...e, type: "schema_violation", severity: "error", description: `Missing required field: ${e.field}` }))
  ];

  return {
    dependency_graph: graph,
    issues: allIssues,
    is_valid: allIssues.length === 0
  };
}

// ─── Stage 5: Repair Engine ───────────────────────────────────────────────────
export async function runStage5(schemas, issues) {
  if (issues.length === 0) return { output: schemas, repair_log: [], repairs_applied: 0 };

  const result = await invokeLLM({
    prompt: `You are a compiler's repair engine. Fix ONLY the detected schema mismatches below.

CURRENT SCHEMAS: ${JSON.stringify(schemas, null, 2)}

DETECTED ISSUES: ${JSON.stringify(issues, null, 2)}

REPAIR RULES:
1. Fix each issue with the MINIMAL change possible
2. For 'api_field_missing_in_db': add the missing column to the correct DB table
3. For 'missing_required_field': add the required field with a sensible default
4. For 'api_db_mismatch': rename the API field to match the DB column name exactly
5. Do NOT regenerate anything not related to the issues
6. repair_log must contain one entry per fix: {issue_type, target_layer, field, action_taken}
7. validation_status must be "repaired"
8. Keep ALL other fields identical to input

Output ONLY the complete corrected JSON with all schemas intact. Pure JSON.`,
    response_json_schema: FULL_SCHEMA
  });

  return { output: result, repair_log: result.repair_log || [], repairs_applied: (result.repair_log || []).length };
}

// ─── Stage 6: Refinement ─────────────────────────────────────────────────────
export async function runStage6(irOutput, schemas) {
  const result = await invokeLLM({
    prompt: `You are the final refinement pass of a compiler. Perform a cross-layer consistency check.

IR (source of truth): ${JSON.stringify(irOutput, null, 2)}
CURRENT SCHEMAS: ${JSON.stringify(schemas, null, 2)}

REFINEMENT CHECKLIST:
1. Every IR entity appears in db_schema.tables ✓
2. Every IR role appears in auth_schema.roles ✓  
3. Every IR feature has a corresponding UI page ✓
4. Every UI page has an API endpoint ✓
5. Every gated feature has an auth guard ✓
6. Business logic rules cover all premium/role gates ✓
7. assumptions[] is complete and accurate
8. Set validation_status to "valid" if all checks pass, "repaired" if you made fixes

Return the complete final schema with validation_status set correctly. Pure JSON only.`,
    response_json_schema: FULL_SCHEMA
  });
  return { output: result };
}

// ─── Stage 7: Runtime Engine ──────────────────────────────────────────────────
export async function runStage7(finalSchemas) {
  const { ui_schema, api_schema, db_schema } = finalSchemas;

  const htmlFiles = (ui_schema?.pages || []).map(page => ({
    filename: `${page.route.replace(/\//g, "").replace(/:/g, "") || "index"}.html`,
    type: "html",
    content: generateHTMLStub(page)
  }));

  const apiFile = {
    filename: "routes.py",
    type: "python",
    content: generateFastAPIRoutes(api_schema?.endpoints || [])
  };

  const dbFile = {
    filename: "schema.sql",
    type: "sql",
    content: generateSQLSchema(db_schema?.tables || [])
  };

  const dockerFile = {
    filename: "Dockerfile",
    type: "dockerfile",
    content: generateDockerfile()
  };

  const readmeFile = {
    filename: "README.md",
    type: "markdown",
    content: generateReadme(finalSchemas)
  };

  return {
    files: [dbFile, apiFile, ...htmlFiles, dockerFile, readmeFile],
    entry_point: "routes.py",
    runtime: "FastAPI + PostgreSQL",
    pages_generated: htmlFiles.length,
    endpoints_generated: api_schema?.endpoints?.length || 0,
    tables_generated: db_schema?.tables?.length || 0
  };
}

// ─── Runtime file generators ──────────────────────────────────────────────────
function generateHTMLStub(page) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.name}</title>
  <style>
    body { font-family: Inter, sans-serif; margin: 0; padding: 2rem; background: #F8FAFC; }
    .page-header { font-size: 1.5rem; font-weight: 600; color: #1E293B; margin-bottom: 1rem; }
    .components { display: grid; gap: 1rem; }
    .component { background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1.5rem; }
    .badge { display: inline-block; background: #EEF2FF; color: #6366F1; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
  </style>
</head>
<body>
  <div class="page-header">${page.name}</div>
  <p>Route: <code>${page.route}</code> 
     ${(page.accessible_by || []).map(r => `<span class="badge">${r}</span>`).join(" ")}</p>
  <div class="components">
    ${(page.components || []).map(c => `
    <div class="component">
      <strong>${c}</strong>
      <p style="color:#64748B; font-size:0.875rem; margin:0.5rem 0 0">Component stub — wire to API endpoint</p>
    </div>`).join("")}
  </div>
</body>
</html>`;
}

function generateFastAPIRoutes(endpoints) {
  const imports = `from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

app = FastAPI(title="Generated App API", version="1.0.0")

`;

  const routes = endpoints.map(ep => {
    const methodLower = (ep.method || "GET").toLowerCase();
    const funcName = ep.path.replace(/\//g, "_").replace(/[{}:]/g, "").replace(/^_/, "").replace(/-/g, "_") || "root";
    const bodyModel = ep.request_fields?.length > 0
      ? `\nclass ${funcName.charAt(0).toUpperCase() + funcName.slice(1)}Request(BaseModel):\n${ep.request_fields.map(f => `    ${f}: str`).join("\n")}\n`
      : "";
    const bodyParam = (ep.request_fields?.length > 0 && ["post", "put", "patch"].includes(methodLower)) ? `, body: ${funcName.charAt(0).toUpperCase() + funcName.slice(1)}Request` : "";

    return `${bodyModel}
@app.${methodLower}("${ep.path}")
async def ${funcName}(${bodyParam.replace(/^, /, "")}) -> dict:
    """${ep.auth_required ? "Auth required. Roles: " + (ep.roles || []).join(", ") : "Public endpoint"}"""
    return {"status": "ok", "data": {${(ep.response_fields || []).map(f => `"${f}": None`).join(", ")}}}
`;
  }).join("\n");

  return imports + routes + `\nif __name__ == "__main__":\n    uvicorn.run(app, host="0.0.0.0", port=8000)\n`;
}

function generateSQLSchema(tables) {
  const preamble = `-- Generated DB Schema\n-- AppCompiler Runtime Output\n\n`;
  const sql = tables.map(table => {
    const cols = (table.columns || []).map(col => {
      const pk = col.primary_key ? " PRIMARY KEY" : "";
      const nullable = col.nullable === false ? " NOT NULL" : "";
      const sqlType = col.type === "string" ? "VARCHAR(255)"
        : col.type === "integer" ? "INTEGER"
        : col.type === "boolean" ? "BOOLEAN"
        : col.type === "timestamp" ? "TIMESTAMP"
        : col.type === "text" ? "TEXT"
        : col.type === "float" ? "FLOAT"
        : "VARCHAR(255)";
      return `    ${col.name} ${sqlType}${pk}${nullable}`;
    });
    const relations = (table.relations || []).map(r =>
      r.foreign_key ? `    FOREIGN KEY (${r.foreign_key}) REFERENCES ${r.references}(id)` : ""
    ).filter(Boolean);

    return `CREATE TABLE IF NOT EXISTS ${table.name} (\n${[...cols, ...relations].join(",\n")}\n);\n`;
  }).join("\n");

  return preamble + sql;
}

function generateDockerfile() {
  return `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "routes:app", "--host", "0.0.0.0", "--port", "8000"]
`;
}

function generateReadme(schemas) {
  return `# Generated Application
> Output of AppCompiler — Natural Language → Executable App

## Stack
- **API**: FastAPI (Python)
- **Database**: PostgreSQL
- **Auth**: ${schemas.auth_schema?.strategy || "JWT"}
- **Roles**: ${(schemas.auth_schema?.roles || []).join(", ")}

## Pages (${(schemas.ui_schema?.pages || []).length})
${(schemas.ui_schema?.pages || []).map(p => `- \`${p.route}\` — ${p.name}`).join("\n")}

## API Endpoints (${(schemas.api_schema?.endpoints || []).length})
${(schemas.api_schema?.endpoints || []).map(e => `- \`${e.method} ${e.path}\``).join("\n")}

## DB Tables (${(schemas.db_schema?.tables || []).length})
${(schemas.db_schema?.tables || []).map(t => `- ${t.name} (${(t.columns || []).map(c => c.name).join(", ")})`).join("\n")}

## Assumptions
${(schemas.assumptions || []).map(a => `- ${a}`).join("\n")}

## Validation Status
**${schemas.validation_status || "unknown"}**
`;
}