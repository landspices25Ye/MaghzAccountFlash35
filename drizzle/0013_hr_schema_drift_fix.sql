-- ============================================================================
-- 0013: HR schema drift fix
-- ============================================================================
-- Add missing columns to employees (photo_url, attachments) used by EmployeesPage
-- Add missing column to payroll_runs (notes) — kept optional for future use
-- ============================================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS attachments jsonb;

-- Index for faster employee lookups by department
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees (company_id, department_id);
