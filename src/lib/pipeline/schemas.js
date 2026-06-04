// Schema validator and dependency analyzer for the AI compiler pipeline

export const IR_SCHEMA = {
  type: "OBJECT",
  properties: {
    app_type: { type: "STRING", description: "The type of the application (e.g. crm, ecommerce, saas)" },
    entities: {
      type: "ARRAY",
      description: "List of entities identified in the description",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "Singular name of the entity in snake_case (e.g. contact, invoice)" },
          description: { type: "STRING", description: "Description of what this entity represents and its fields" }
        },
        required: ["name", "description"]
      }
    },
    roles: {
      type: "ARRAY",
      description: "List of user roles identified (e.g. admin, customer, staff)",
      items: { type: "STRING" }
    },
    features: {
      type: "ARRAY",
      description: "List of core features identified (e.g. authentication, dashboard, reporting)",
      items: { type: "STRING" }
    },
    goals: {
      type: "ARRAY",
      description: "List of inferred goals or key requirements",
      items: { type: "STRING" }
    }
  },
  required: ["app_type", "entities", "roles", "features", "goals"]
};

export const ARCHITECTURE_SCHEMA = {
  type: "OBJECT",
  properties: {
    user_flows: {
      type: "ARRAY",
      description: "Sequence of user steps for core actions",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "Name of the flow (e.g., user_signup_flow)" },
          steps: { type: "ARRAY", items: { type: "STRING" } },
          entities_involved: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["name", "steps", "entities_involved"]
      }
    },
    role_permissions: {
      type: "ARRAY",
      description: "Mapping of roles to permitted actions",
      items: {
        type: "OBJECT",
        properties: {
          role: { type: "STRING" },
          permissions: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["role", "permissions"]
      }
    },
    module_map: {
      type: "ARRAY",
      description: "Mapping of application modules to their sub-features",
      items: {
        type: "OBJECT",
        properties: {
          module: { type: "STRING" },
          features: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["module", "features"]
      }
    }
  },
  required: ["user_flows", "role_permissions", "module_map"]
};

export const FULL_SCHEMA = {
  type: "OBJECT",
  properties: {
    ui_schema: {
      type: "OBJECT",
      properties: {
        pages: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              route: { type: "STRING" },
              accessible_by: { type: "ARRAY", items: { type: "STRING" } },
              components: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["name", "route", "accessible_by", "components"]
          }
        }
      },
      required: ["pages"]
    },
    api_schema: {
      type: "OBJECT",
      properties: {
        endpoints: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              path: { type: "STRING" },
              method: { type: "STRING" },
              request_fields: { type: "ARRAY", items: { type: "STRING" } },
              response_fields: { type: "ARRAY", items: { type: "STRING" } },
              auth_required: { type: "BOOLEAN" },
              roles: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["path", "method", "request_fields", "response_fields", "auth_required"]
          }
        }
      },
      required: ["endpoints"]
    },
    db_schema: {
      type: "OBJECT",
      properties: {
        tables: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              columns: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    type: { type: "STRING" },
                    primary_key: { type: "BOOLEAN" },
                    nullable: { type: "BOOLEAN" }
                  },
                  required: ["name", "type"]
                }
              },
              relations: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    foreign_key: { type: "STRING" },
                    references: { type: "STRING" }
                  },
                  required: ["foreign_key", "references"]
                }
              }
            },
            required: ["name", "columns"]
          }
        }
      },
      required: ["tables"]
    },
    auth_schema: {
      type: "OBJECT",
      properties: {
        strategy: { type: "STRING" },
        roles: { type: "ARRAY", items: { type: "STRING" } },
        restricted_routes: { type: "ARRAY", items: { type: "STRING" } }
      },
      required: ["strategy", "roles", "restricted_routes"]
    },
    business_logic_rules: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          feature: { type: "STRING" },
          rule: { type: "STRING" },
          gating_condition: { type: "STRING" }
        },
        required: ["feature", "rule"]
      }
    },
    assumptions: { type: "ARRAY", items: { type: "STRING" } },
    validation_status: { type: "STRING" },
    repair_log: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          issue_type: { type: "STRING" },
          target_layer: { type: "STRING" },
          field: { type: "STRING" },
          action_taken: { type: "STRING" }
        },
        required: ["issue_type", "target_layer", "field", "action_taken"]
      }
    }
  },
  required: ["ui_schema", "api_schema", "db_schema", "auth_schema", "assumptions", "validation_status", "repair_log"]
};

/**
 * Validate a data object against a Gemini schema object
 * @param {Object} data
 * @param {Object} schema
 * @param {string} path
 * @returns {Array<{field: string, message: string}>}
 */
export function validateAgainstSchema(data, schema, path = "") {
  const errors = [];
  if (data === undefined || data === null) {
    errors.push({ field: path || "root", message: "Value is null or undefined" });
    return errors;
  }

  const expectedType = (schema.type || "").toUpperCase();
  let actualType = "";
  if (Array.isArray(data)) {
    actualType = "ARRAY";
  } else if (typeof data === "object") {
    actualType = "OBJECT";
  } else if (typeof data === "string") {
    actualType = "STRING";
  } else if (typeof data === "number") {
    actualType = "NUMBER";
  } else if (typeof data === "boolean") {
    actualType = "BOOLEAN";
  }

  if (expectedType && expectedType !== actualType) {
    errors.push({ field: path || "root", message: `Expected type ${expectedType}, got ${actualType}` });
    return errors;
  }

  if (expectedType === "OBJECT" && schema.properties) {
    // Check required properties
    if (schema.required) {
      for (const req of schema.required) {
        if (data[req] === undefined) {
          errors.push({ field: path ? `${path}.${req}` : req, message: `Missing required field: ${req}` });
        }
      }
    }

    // Validate each property
    for (const key of Object.keys(schema.properties)) {
      if (data[key] !== undefined) {
        const propErrors = validateAgainstSchema(data[key], schema.properties[key], path ? `${path}.${key}` : key);
        errors.push(...propErrors);
      }
    }
  } else if (expectedType === "ARRAY" && schema.items) {
    for (let i = 0; i < data.length; i++) {
      const itemErrors = validateAgainstSchema(data[i], schema.items, `${path}[${i}]`);
      errors.push(...itemErrors);
    }
  }

  return errors;
}

/**
 * Analyze dependencies between schemas and detect mismatches
 * @param {Object} api_schema
 * @param {Object} db_schema
 * @param {Object} ui_schema
 * @returns {Object} Dependency graph and list of mismatches
 */
export function buildDependencyGraph(api_schema, db_schema, ui_schema) {
  const mismatches = [];

  const tables = db_schema?.tables || [];
  const endpoints = api_schema?.endpoints || [];
  const pages = ui_schema?.pages || [];

  // Helper to find table for a given endpoint path
  function findTableForPath(path) {
    const segments = path.toLowerCase().split('/').filter(s => s && !s.startsWith('{') && !s.startsWith(':'));
    for (const segment of segments) {
      // Direct match
      let match = tables.find(t => t.name.toLowerCase() === segment);
      if (match) return match;

      // Singular/plural match
      const singular = segment.endsWith('ies') ? segment.slice(0, -3) + 'y' 
                     : segment.endsWith('s') ? segment.slice(0, -1) 
                     : segment;
      match = tables.find(t => t.name.toLowerCase() === singular);
      if (match) return match;

      const plural = segment.endsWith('y') ? segment.slice(0, -1) + 'ies'
                   : segment + 's';
      match = tables.find(t => t.name.toLowerCase() === plural);
      if (match) return match;
    }
    return null;
  }

  // Helper to calculate similarity or detect typos
  function findSimilarColumn(fieldName, table) {
    const cols = table.columns || [];
    const lowerField = fieldName.toLowerCase();
    for (const col of cols) {
      const lowerCol = col.name.toLowerCase();
      if (lowerCol === lowerField) return col.name;
      // Simple similarity check
      if (lowerCol.includes(lowerField) || lowerField.includes(lowerCol)) {
        return col.name;
      }
      // Check for removed underscores
      if (lowerCol.replace(/_/g, '') === lowerField.replace(/_/g, '')) {
        return col.name;
      }
    }
    return null;
  }

  // 1. Check API fields vs DB Columns
  for (const ep of endpoints) {
    const table = findTableForPath(ep.path);
    if (!table) continue;

    const allFields = new Set([
      ...(ep.request_fields || []),
      ...(ep.response_fields || [])
    ]);

    const columns = new Set((table.columns || []).map(c => c.name));

    for (const field of allFields) {
      if (["id", "created_at", "updated_at"].includes(field)) continue;

      if (!columns.has(field)) {
        const similar = findSimilarColumn(field, table);
        if (similar) {
          mismatches.push({
            type: "api_db_mismatch",
            layer: "api-db",
            field: field,
            description: `Field name mismatch: API endpoint '${ep.method} ${ep.path}' uses '${field}' but DB table '${table.name}' has similar column '${similar}'`,
            suggested_fix: `Rename API field '${field}' to '${similar}' to match the DB column`,
            severity: "error"
          });
        } else {
          mismatches.push({
            type: "api_field_missing_in_db",
            layer: "db",
            field: field,
            description: `Field '${field}' in API endpoint '${ep.method} ${ep.path}' is missing as a column in DB table '${table.name}'`,
            suggested_fix: `Add column '${field}' to DB table '${table.name}'`,
            severity: "error"
          });
        }
      }
    }
  }

  // 2. Check UI pages have backing API endpoints
  for (const page of pages) {
    if (["/", "/history", "/evaluation", "/runtime"].includes(page.route)) {
      continue;
    }

    const segments = page.route.toLowerCase().split('/').filter(s => s && !s.startsWith(':'));
    let hasBackingEndpoint = false;

    for (const ep of endpoints) {
      const epSegments = ep.path.toLowerCase().split('/').filter(s => s && !s.startsWith('{') && !s.startsWith(':'));
      if (segments.some(s => epSegments.includes(s) || epSegments.some(es => es.includes(s) || s.includes(es)))) {
        hasBackingEndpoint = true;
        break;
      }
    }

    if (!hasBackingEndpoint) {
      mismatches.push({
        type: "missing_api_endpoint",
        layer: "api",
        field: page.route,
        description: `UI page '${page.name}' at route '${page.route}' has no backing API endpoint`,
        suggested_fix: `Create API endpoint GET /api${page.route}`,
        severity: "warning"
      });
    }
  }

  return {
    mismatches,
    nodes: [
      { id: "ui", label: "UI Layer", count: pages.length },
      { id: "api", label: "API Layer", count: endpoints.length },
      { id: "db", label: "Database Layer", count: tables.length }
    ]
  };
}
