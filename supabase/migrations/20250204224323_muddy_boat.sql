/*
  # Add cash drawer amount to shifts

  1. Changes
    - Add cash_in_drawer column to shifts table
    - Set default value to 0
    - Make it NOT NULL
*/

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS cash_in_drawer decimal(10,2) NOT NULL DEFAULT 0;