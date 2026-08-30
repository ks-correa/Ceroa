CREATE TABLE users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    phone VARCHAR(30),
    birth_date DATE,
    password_hash VARCHAR(100),
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('CERO', 'PLUS')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE financial_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    monthly_income NUMERIC(19, 2) NOT NULL CHECK (monthly_income > 0),
    essential_expenses NUMERIC(19, 2) NOT NULL CHECK (essential_expenses >= 0),
    available_for_debts NUMERIC(19, 2) NOT NULL CHECK (available_for_debts >= 0),
    total_declared_debts INTEGER NOT NULL CHECK (total_declared_debts >= 1),
    active_strategy VARCHAR(20) NOT NULL CHECK (active_strategy IN ('SNOWBALL', 'AVALANCHE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE debts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    entity VARCHAR(160) NOT NULL,
    type VARCHAR(40) NOT NULL CHECK (type IN (
        'CREDIT_CARD', 'PERSONAL_LOAN', 'MORTGAGE', 'AUTO_LOAN', 'STUDENT_LOAN',
        'RETAIL_CREDIT', 'INSTALLMENT_PURCHASE', 'OVERDUE_BILL', 'FAMILY_LOAN', 'OTHER'
    )),
    category_label VARCHAR(100) NOT NULL,
    original_amount NUMERIC(19, 2) NOT NULL CHECK (original_amount > 0),
    current_balance NUMERIC(19, 2) NOT NULL CHECK (current_balance >= 0 AND current_balance <= original_amount),
    interest_rate NUMERIC(10, 4) CHECK (interest_rate >= 0),
    rate_type VARCHAR(30) NOT NULL CHECK (rate_type IN (
        'EA', 'MV', 'NAMV', 'INDEXED', 'IBR_MARGIN', 'IPC_MARGIN', 'UVR_MARGIN', 'NONE'
    )),
    monthly_payment NUMERIC(19, 2) CHECK (monthly_payment >= 0),
    minimum_payment NUMERIC(19, 2) CHECK (minimum_payment >= 0),
    due_date_day INTEGER CHECK (due_date_day BETWEEN 1 AND 31),
    next_due_date DATE,
    disbursement_date DATE,
    term_remaining_months INTEGER CHECK (term_remaining_months >= 0),
    account_number VARCHAR(80),
    status VARCHAR(20) NOT NULL CHECK (status IN ('CURRENT', 'DUE_TODAY', 'OVERDUE', 'PAID')),
    notes VARCHAR(1000),
    color VARCHAR(20),
    details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_debts_user_id ON debts(user_id);

CREATE TABLE payments (
    id UUID PRIMARY KEY,
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('MINIMUM', 'INSTALLMENT', 'EXTRA_PRINCIPAL', 'FULL')),
    amount NUMERIC(19, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL CHECK (payment_date <= CURRENT_DATE),
    notes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_debt_id ON payments(debt_id);

-- Usuario técnico temporal para integrar el prototipo antes de la autenticación de la fase 2.
INSERT INTO users (id, full_name, email, phone, birth_date, plan)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Usuario Ceroa',
    'demo@ceroa.local',
    '+57 300 000 0000',
    DATE '1990-01-01',
    'PLUS'
);

INSERT INTO financial_profiles (
    id, user_id, monthly_income, essential_expenses, available_for_debts,
    total_declared_debts, active_strategy
)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    1, 0, 0, 1, 'SNOWBALL'
);
