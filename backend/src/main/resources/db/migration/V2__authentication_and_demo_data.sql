CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_auth_sessions_token_hash ON auth_sessions(token_hash);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);

-- Cuenta de demostración persistente. Contraseña local: Demo123!
UPDATE users
SET full_name = 'Mateo Mendoza',
    email = 'demo@ceroa.local',
    password_hash = '$2a$10$oGxMGrtNvw2eeVPTFBq4/.jmb8lKNeEb/qv0QFFGlVemNQcUmM10K',
    updated_at = CURRENT_TIMESTAMP
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE financial_profiles
SET monthly_income = 5200000,
    essential_expenses = 2850000,
    available_for_debts = 1250000,
    total_declared_debts = 3,
    active_strategy = 'AVALANCHE',
    updated_at = CURRENT_TIMESTAMP
WHERE id = '00000000-0000-0000-0000-000000000002';

INSERT INTO debts (
    id, user_id, name, entity, type, category_label, original_amount, current_balance,
    interest_rate, rate_type, monthly_payment, minimum_payment, due_date_day, next_due_date,
    disbursement_date, term_remaining_months, account_number, status, notes, color, details_json
)
VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Tarjeta principal', 'Banco Andino', 'CREDIT_CARD', 'Tarjeta de crédito',
    6800000, 5240000, 28.7000, 'EA', 460000, 310000, 12, DATE '2026-09-12',
    DATE '2024-03-18', 18, '**** 4821', 'CURRENT',
    'Datos de demostración editables y persistentes.', '#008FA6', '{"cupoTotal": 9000000}'::jsonb
),
(
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Crédito de libre inversión', 'Cooperativa Horizonte', 'PERSONAL_LOAN', 'Préstamo personal',
    12000000, 8900000, 19.5000, 'EA', 620000, 620000, 20, DATE '2026-09-20',
    DATE '2025-01-10', 17, 'LIB-2048', 'CURRENT',
    'Crédito simulado para probar la estrategia.', '#7C3AED', '{"tipoCuota":"fija"}'::jsonb
),
(
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Compra de computador', 'Tienda Digital', 'INSTALLMENT_PURCHASE', 'Compra a cuotas',
    3200000, 1280000, 0.0000, 'NONE', 320000, 320000, 5, DATE '2026-09-05',
    DATE '2026-02-05', 4, 'TD-7719', 'CURRENT',
    'Compra sin intereses.', '#F59E0B', '{"producto":"Computador portátil"}'::jsonb
);

INSERT INTO payments (id, debt_id, type, amount, payment_date, notes)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'MINIMUM', 310000, DATE '2026-08-12', 'Pago mensual de demostración'
),
(
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'INSTALLMENT', 620000, DATE '2026-08-20', 'Cuota registrada de demostración'
),
(
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'EXTRA_PRINCIPAL', 150000, DATE '2026-08-05', 'Abono adicional de demostración'
);
