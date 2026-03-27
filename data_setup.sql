-- This script creates a perfect clone of your 'dmt_users' database,
-- including all table structures and data.
--
-- How to use:
-- 1. Make sure PostgreSQL is installed and running.
-- 2. Open your terminal or command prompt (CMD).
-- 3. Run this file using psql:
--    psql -U postgres -f data_setup.sql
--

-- ---
-- 1. CREATE DATABASE
-- ---
-- This command creates your 'dmt_users' database.
CREATE DATABASE dmt_users WITH ENCODING = 'UTF8';


-- ---
-- 2. CONNECT TO THE NEW DATABASE & CREATE EXTENSIONS/TABLES
-- ---
-- You must connect to the new database to run the next commands.
-- This command will connect to 'dmt_users' and run the rest of the script.
\c dmt_users

-- This extension is REQUIRED for the uuid_generate_v4() function
-- in your 'users' table.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---
-- 3. CREATE TABLES
-- ---

-- CLEANUP: Drop tables to ensure fresh data load
DROP TABLE IF EXISTS user_saved_vehicles CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Table 3.1: The 'users' table (matches your \d users)
CREATE TABLE IF NOT EXISTS users (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    role VARCHAR(50) NOT NULL
);

-- Table 3.2: The 'vehicles' table (matches your \d vehicles)
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_number VARCHAR(20) PRIMARY KEY,
    licence_number VARCHAR(50) NOT NULL UNIQUE,
    vehicle_class VARCHAR(100),
    fuel_type VARCHAR(50),
    owner_name VARCHAR(255),
    owner_address VARCHAR(500),
    licence_valid_from DATE,
    licence_expiry_date DATE NOT NULL,
    district VARCHAR(100),
    owner_nic VARCHAR(12)
);


-- ---
-- 4. INSERT ALL DATA
-- ---

-- 4.1 Insert Users (Cloned from your log)
-- We explicitly insert the IDs to create a perfect clone.
INSERT INTO users (id, email, password_hash, role) VALUES
('7ca80102-b53c-475c-bf91-045a43c15a22', 'dmt@gov.lk', '$argon2id$v=19$m=65536,t=3,p=4$/v+/17q3VsrZO4cwRsiZ8w$fZnrQa2tdf7y/QJ0IRaYdXxS/G6xSBsynDGpq4o0bBs', 'dmt'),
('85f0e296-a57b-432c-9590-2df4066cede3', 'police@gov.lk', '$argon2id$v=19$m=65536,t=3,p=4$/v+/17q3VsrZO4cwRsiZ8w$fZnrQa2tdf7y/QJ0IRaYdXxS/G6xSBsynDGpq4o0bBs', 'police'),
('7ddd39aa-e849-4867-8e1a-350ebe36cfcd', 'public@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$/v+/17q3VsrZO4cwRsiZ8w$fZnrQa2tdf7y/QJ0IRaYdXxS/G6xSBsynDGpq4o0bBs', 'public'),
('1f452854-83fb-4caf-a1a1-a5f56fc0b82f', 'muneefa2002@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$iVFqTWmtldL6f8/5H2NsrQ$1FWSZQAyEETOACvyNXThm8H4W+E06DopJpTrVK08Gzs', 'public')
ON CONFLICT (id) DO NOTHING; -- This prevents errors if you run the script twice


-- 4.2 Insert Vehicles (Cloned from your log)
INSERT INTO vehicles (
    vehicle_number, licence_number, vehicle_class, fuel_type,
    owner_name, owner_address, licence_valid_from, licence_expiry_date,
    district, owner_nic
) VALUES
('KMS6479', 'LN-2018-0345', 'Motor Car', 'Petrol', 'Senaka Perera', '12, Galle Road, Colombo 03', '2024-10-01', '2025-09-30', 'Colombo', '199204503456'),
('XYZ8391', 'LN-2020-1109', 'Three-wheeler', 'Petrol', 'Mohamed Farook', 'No. 8, Main St, Negombo', '2024-02-15', '2025-12-26', 'Gampaha', '198912001234'),
('MNP9807', 'LN-2019-0782', 'Motorcycle', 'Petrol', 'N. Thivakaran', '45/2, Kandy Rd, Peradeniya', '2023-07-01', '2024-06-30', 'Kandy', '199507403210'),
('KL6036', 'LN-2022-0056', 'Motor Car', 'Diesel', 'Aisha Mohamed', '6B, Hospital Rd, Vavuniya', '2024-11-01', '2025-11-04', 'Vavuniya', '199252202789'),
('CBN2765', 'LN-2017-2233', 'Goods Vehicle', 'Diesel', 'Ruwan Silva', '22, Market St, Kurunegala', '2025-09-12', '2026-09-11', 'Kurunegala', '198706102345'),
('VHJ2512', 'LN-2021-4410', 'Motor Car', 'Petrol', 'Nirupa Jayasinghe', '3/1, Lake View, Matara', '2025-03-08', '2026-03-07', 'Matara', '199354704112'),
('MND7893', 'LN-2016-3321', 'Motorcycle', 'Petrol', 'S. Kumar', '101, Beach Rd, Jaffna', '2024-11-30', '2025-11-29', 'Jaffna', '198412352678'),
('ALK7772', 'LN-2015-9900', 'Three-wheeler', 'Petrol', 'Abdul Rahman', '14A, Kurunegala Rd, Anuradhapura', '2025-01-25', '2026-01-24', 'Anuradhapura', '197901000987'),
('CPI6352', 'LN-2023-1475', 'Motor Car', 'Hybrid', 'Chathuri Wijesinghe', '88/4, Temple St, Galle', '2025-08-11', '2026-08-10', 'Galle', '199362007654'),
('MLP3256', 'LN-2014-5566', 'Goods Vehicle', 'Diesel', 'Dinesh Fernando', '5, Industrial Ave, Batticaloa', '2025-05-05', '2026-05-04', 'Batticaloa', '198005012300'),
('QUM5546', 'LN-2020-6677', 'Motorcycle', 'Petrol', 'Pradeep Silva', '27, Station Rd, Trincomalee', '2024-12-20', '2025-12-19', 'Trincomalee', '199009912111'),
('WNP2002', 'LN-2022-8801', 'M-Car', 'CNG', 'Yasmin Hameed', '2C, Mosque Lane, Ampara', '2024-12-01', '2026-11-30', 'Ampara', '199450812999')
ON CONFLICT (vehicle_number) DO NOTHING;


-- ---
-- 5. FINAL CONFIRMATION
-- ---
SELECT 'Database setup complete.' AS status;