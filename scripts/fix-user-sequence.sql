-- Fix User ID Sequence
-- Dieses Skript synchronisiert die PostgreSQL-Sequenz für die User-ID
-- mit dem höchsten vorhandenen ID-Wert

-- Setze die Sequenz auf den höchsten vorhandenen ID-Wert
SELECT setval('"User_id_seq"', COALESCE((SELECT MAX(id) FROM "User"), 1), true);

-- Zeige die aktuelle Sequenz-Position
SELECT currval('"User_id_seq"') as current_sequence_value;

