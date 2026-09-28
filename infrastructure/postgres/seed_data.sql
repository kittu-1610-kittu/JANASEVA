-- JANASEVA OS Demo Seed Data Script
-- Populates demo district, departments, wards, categories, demo users, roles, and sample complaints

BEGIN;

-- 1. Districts
INSERT INTO districts (id, name, code, state, country, population, area_sq_km, headquarters, is_demo)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Ballari District',
    'KA-BLR',
    'Karnataka',
    'India',
    1450000,
    8450.5,
    'Ballari City',
    true
) ON CONFLICT (code) DO NOTHING;

-- 2. Departments
INSERT INTO departments (id, district_id, name, code, description, phone, email, is_emergency_lead, is_active, color_hex)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Roads & Infrastructure',
    'ROADS',
    'Maintenance and repair of district municipal roads, flyovers, and pavements.',
    '+91-8392-277101',
    'roads@ballari.gov.in',
    false,
    true,
    '#f97316'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Water Supply & Sewerage',
    'WATER',
    'Drinking water distribution pipelines and sewage network operations.',
    '+91-8392-277102',
    'water@ballari.gov.in',
    true,
    true,
    '#0ea5e9'
),
(
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Solid Waste Management',
    'WASTE',
    'Garbage collection, processing, and public cleanliness management.',
    '+91-8392-277103',
    'waste@ballari.gov.in',
    false,
    true,
    '#22c55e'
),
(
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Streetlights & Electrical',
    'ELECTRICAL',
    'Street illumination, public lighting grids, and electrical safety.',
    '+91-8392-277104',
    'lights@ballari.gov.in',
    false,
    true,
    '#eab308'
),
(
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'District Emergency Operations Centre',
    'EOC',
    '24/7 disaster response, flood mitigation, and life-safety dispatch.',
    '+91-8392-107700',
    'eoc@ballari.gov.in',
    true,
    true,
    '#e11d48'
) ON CONFLICT (code) DO NOTHING;

-- 3. Wards
INSERT INTO wards (id, district_id, name, ward_number, population, is_demo)
VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Gandhi Nagar (Ward 1)', 1, 35000, true),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Cantonment (Ward 2)', 2, 42000, true),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Cowlbazaar (Ward 3)', 3, 28000, true),
('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Brucepet (Ward 4)', 4, 31000, true),
('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Millerpet (Ward 5)', 5, 29000, true)
ON CONFLICT DO NOTHING;

-- 4. Complaint Categories
INSERT INTO complaint_categories (id, code, name, description, default_department_id, base_sla_hours, base_priority, is_emergency_eligible, display_order, is_active)
VALUES
('d0000000-0000-0000-0000-000000000001', 'POTHOLE', 'Pothole & Road Damage', 'Road surface cracks, craters, or potholes.', 'b0000000-0000-0000-0000-000000000001', 48, 'HIGH', false, 1, true),
('d0000000-0000-0000-0000-000000000002', 'WATER_LEAK', 'Pipeline Leakage / Contamination', 'Drinking water pipeline bursts, contamination, or no water supply.', 'b0000000-0000-0000-0000-000000000002', 24, 'HIGH', true, 2, true),
('d0000000-0000-0000-0000-000000000003', 'GARBAGE', 'Uncollected Garbage Dump', 'Public waste overflow, unattended street dustbins.', 'b0000000-0000-0000-0000-000000000003', 24, 'MEDIUM', false, 3, true),
('d0000000-0000-0000-0000-000000000004', 'STREETLIGHT', 'Broken Streetlight', 'Non-functioning street lamps, dark public paths.', 'b0000000-0000-0000-0000-000000000004', 72, 'LOW', false, 4, true),
('d0000000-0000-0000-0000-000000000005', 'FLOOD', 'Waterlogging & Flood Distress', 'Inundation of streets, houses, or monsoon drainage overflow.', 'b0000000-0000-0000-0000-000000000005', 4, 'CRITICAL', true, 5, true)
ON CONFLICT (code) DO NOTHING;

-- 5. Demo Users (Password: Demo@1234)
INSERT INTO users (id, email, phone, full_name, password_hash, status, department_id, district_id, ward_id, is_demo)
VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'admin@demo.janaseva.in',
    '+919800000001',
    'District Magistrate (DC Ballari)',
    '$2b$12$XosDI4.NVsfYi56ZDeMIv.RwlGsUPu5s3Tu9RHrtYxrVFA7PPm3MS',
    'ACTIVE',
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    true
),
(
    'e0000000-0000-0000-0000-000000000002',
    'officer@demo.janaseva.in',
    '+919800000002',
    'K. Ramesh (AEE Roads)',
    '$2b$12$XosDI4.NVsfYi56ZDeMIv.RwlGsUPu5s3Tu9RHrtYxrVFA7PPm3MS',
    'ACTIVE',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    true
),
(
    'e0000000-0000-0000-0000-000000000003',
    'field@demo.janaseva.in',
    '+919800000003',
    'Suresh G. (Lead Field Worker)',
    '$2b$12$XosDI4.NVsfYi56ZDeMIv.RwlGsUPu5s3Tu9RHrtYxrVFA7PPm3MS',
    'ACTIVE',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    true
),
(
    'e0000000-0000-0000-0000-000000000004',
    'citizen@demo.janaseva.in',
    '+919800000004',
    'Aarav Sharma (Resident)',
    '$2b$12$XosDI4.NVsfYi56ZDeMIv.RwlGsUPu5s3Tu9RHrtYxrVFA7PPm3MS',
    'ACTIVE',
    NULL,
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    true
),
(
    'e0000000-0000-0000-0000-000000000005',
    'ngo@demo.janaseva.in',
    '+919800000005',
    'Sneha Patil (District NGO Lead)',
    '$2b$12$XosDI4.NVsfYi56ZDeMIv.RwlGsUPu5s3Tu9RHrtYxrVFA7PPm3MS',
    'ACTIVE',
    NULL,
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    true
)
ON CONFLICT (email) DO NOTHING;

-- 6. User Roles
INSERT INTO user_role_assignments (id, user_id, role, is_primary)
VALUES
('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'DISTRICT_ADMIN', true),
('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'EMERGENCY_COMMANDER', false),
('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'OFFICER', true),
('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', 'FIELD_WORKER', true),
('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', 'CITIZEN', true),
('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000005', 'NGO_COORDINATOR', true)
ON CONFLICT DO NOTHING;

-- 7. Sample Initial Complaints
INSERT INTO complaints (
    id, complaint_id, citizen_id, is_anonymous, title, description, category_code,
    department_id, ward_id, district_id, status, priority, priority_score,
    is_emergency, address, location, sla_breached, escalation_level, is_demo
)
VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'JS-2026-000001',
    'e0000000-0000-0000-0000-000000000004',
    false,
    'Dangerous pothole near Government Girls High School',
    'Deep crater formed on the main carriageway. Motorcyclists have skidded twice this morning.',
    'POTHOLE',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'ASSIGNED',
    'HIGH',
    80,
    false,
    'Main Road, Gandhi Nagar, Ballari',
    ST_SetSRID(ST_MakePoint(76.9214, 15.1394), 4326),
    false,
    0,
    true
),
(
    '10000000-0000-0000-0000-000000000002',
    'JS-2026-000002',
    'e0000000-0000-0000-0000-000000000004',
    false,
    'Drinking water pipeline burst near Cantonment Bus Stand',
    'High-pressure drinking water main line ruptured. Clean water gushing across entire roadway.',
    'WATER_LEAK',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'IN_PROGRESS',
    'CRITICAL',
    95,
    true,
    'Cantonment Circle, Ward 2, Ballari',
    ST_SetSRID(ST_MakePoint(76.9255, 15.1450), 4326),
    false,
    0,
    true
),
(
    '10000000-0000-0000-0000-000000000003',
    'JS-2026-000003',
    'e0000000-0000-0000-0000-000000000004',
    false,
    'Streetlight cluster broken for 4 days',
    'Total darkness on 3rd Cross Cowlbazaar road causing severe pedestrian safety concern.',
    'STREETLIGHT',
    'b0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'REPORTED',
    'MEDIUM',
    40,
    false,
    '3rd Cross, Cowlbazaar, Ballari',
    ST_SetSRID(ST_MakePoint(76.9180, 15.1320), 4326),
    false,
    0,
    true
)
ON CONFLICT (complaint_id) DO NOTHING;

-- 8. Sample Emergency Incident
INSERT INTO emergency_incidents (
    id, incident_id, title, description, type, severity, status,
    lead_agency_id, ward_id, reported_by, address, location,
    affected_people_count, casualties_count, is_demo
)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'EMG-2026-0001',
    'Flash Flood Distress in Low-Lying Wards 1 & 2',
    'Canal embankment overflow inundating residential ground floors. Evacuation boats requested.',
    'FLOOD',
    'CRITICAL',
    'ACTIVE',
    'b0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'Near Old Bridge, Gandhi Nagar',
    ST_SetSRID(ST_MakePoint(76.9230, 15.1410), 4326),
    150,
    0,
    true
)
ON CONFLICT (incident_id) DO NOTHING;

COMMIT;
