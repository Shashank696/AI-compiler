// localStorage-based entity storage — Free alternative to Base44 entities
// Mimics the Base44 entity API: .create(), .update(), .list(), .get(), .delete()

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

function createEntityStore(entityName) {
  const STORAGE_KEY = `app_${entityName}`;

  function getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveAll(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  return {
    /**
     * Create a new entity record
     * @param {Object} data - The entity data
     * @returns {Object} The created record with id and created_date
     */
    async create(data) {
      const items = getAll();
      const record = {
        ...data,
        id: generateId(),
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      items.unshift(record); // Add to beginning (newest first)
      saveAll(items);
      return record;
    },

    /**
     * Update an existing entity record by ID
     * @param {string} id - The record ID
     * @param {Object} updates - Fields to update
     * @returns {Object} The updated record
     */
    async update(id, updates) {
      const items = getAll();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new Error(`${entityName} with id ${id} not found`);
      }
      items[index] = {
        ...items[index],
        ...updates,
        updated_date: new Date().toISOString(),
      };
      saveAll(items);
      return items[index];
    },

    /**
     * List entity records with optional sorting and limit
     * @param {string} [sortField] - Field to sort by, prefix with '-' for descending
     * @param {number} [limit] - Maximum number of records to return
     * @returns {Array} Array of records
     */
    async list(sortField = "-created_date", limit = 100) {
      let items = getAll();

      // Sort
      if (sortField) {
        const desc = sortField.startsWith("-");
        const field = desc ? sortField.slice(1) : sortField;
        items.sort((a, b) => {
          const aVal = a[field] || "";
          const bVal = b[field] || "";
          if (desc) return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        });
      }

      // Limit
      if (limit) {
        items = items.slice(0, limit);
      }

      return items;
    },

    /**
     * Get a single entity record by ID
     * @param {string} id - The record ID
     * @returns {Object|null} The record or null
     */
    async get(id) {
      const items = getAll();
      return items.find((item) => item.id === id) || null;
    },

    /**
     * Delete an entity record by ID
     * @param {string} id - The record ID
     * @returns {boolean} Whether the record was deleted
     */
    async delete(id) {
      const items = getAll();
      const filtered = items.filter((item) => item.id !== id);
      if (filtered.length === items.length) return false;
      saveAll(filtered);
      return true;
    },

    /**
     * Delete all entity records
     */
    async deleteAll() {
      saveAll([]);
    },
  };
}

// Export entity stores matching the Base44 entity names
export const PipelineRun = createEntityStore("PipelineRun");
export const BenchmarkPrompt = createEntityStore("BenchmarkPrompt");
