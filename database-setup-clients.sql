-- Client-relationship schema (clients, unit_clients, invitations)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    notes text,
    auth_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_email ON public.clients(email);

-- UNIT_CLIENTS (links clients to units)
CREATE TABLE IF NOT EXISTS public.unit_clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'purchaser' CHECK (role IN ('purchaser','secondary')),
    status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','inactive')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_unit_clients_unique ON public.unit_clients(unit_id, client_id);
CREATE INDEX IF NOT EXISTS idx_unit_clients_unit_id ON public.unit_clients(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_clients_client_id ON public.unit_clients(client_id);

-- INVITATIONS (tracks invitations and tokens)
CREATE TABLE IF NOT EXISTS public.invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    token text NOT NULL,
    expires_at timestamptz,
    accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_client_id ON public.invitations(client_id);
CREATE INDEX IF NOT EXISTS idx_invitations_unit_id ON public.invitations(unit_id); 