-- Create Hubs Table
create table if not exists public.hubs (
    id uuid not null default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    address text not null,
    latitude double precision,
    longitude double precision,
    created_at timestamptz default now(),
    primary key (id)
);

-- RLS Policies
alter table public.hubs enable row level security;

create policy "Users can view hubs for their company"
    on public.hubs for select
    using (
        company_id in (
            select company_id from public.users
            where users.id = auth.uid()
        )
    );

create policy "Managers can insert hubs for their company"
    on public.hubs for insert
    with check (
        company_id in (
            select company_id from public.users
            where users.id = auth.uid()
            and users.role in ('manager', 'admin')
        )
    );

create policy "Managers can update hubs for their company"
    on public.hubs for update
    using (
        company_id in (
            select company_id from public.users
            where users.id = auth.uid()
            and users.role in ('manager', 'admin')
        )
    );

create policy "Managers can delete hubs for their company"
    on public.hubs for delete
    using (
        company_id in (
            select company_id from public.users
            where users.id = auth.uid()
            and users.role in ('manager', 'admin')
        )
    );
