INSERT INTO "User" (email, name, password, role, "farmerId")
VALUES ('admin@eferdinger.at', 'Admin', '12345', 'EG_ADMIN', NULL)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role;
