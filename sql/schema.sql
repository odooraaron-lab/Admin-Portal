-- Run this once in your Neon / Supabase SQL editor.
-- Safe to re-run: it only creates what's missing.

create table if not exists products (
  code             text primary key,               -- short id, e.g. 'story'
  name             text not null,
  domain           text not null,                  -- e.g. 'yourbrand.nz' or 'resthome.yourbrand.nz'
  pricing_type     text not null check (pricing_type in ('one_time','subscription')),
  status           text not null default 'live' check (status in ('live','hidden','sold_out')),
  features         jsonb not null default '{}'::jsonb,
  hq_base_url      text,                           -- where the product app lives, for admin actions
  hq_secret        text not null,                  -- shared signing secret for this product
  stripe_price_ids text[] not null default '{}',
  color            text not null default '#1F6F6B',
  sort             int not null default 100,
  created_at       timestamptz not null default now()
);

create table if not exists orders (
  id                    text primary key,          -- Stripe checkout session or invoice id
  product_code          text references products(code),
  site_slug             text,
  customer_email        text,
  customer_name         text,
  amount_cents          int not null default 0,
  currency              text not null default 'nzd',
  status                text not null default 'paid',   -- paid | refunded | partially_refunded
  kind                  text not null default 'one_time',-- one_time | subscription | renewal
  stripe_payment_intent text,
  stripe_subscription_id text,
  created_at            timestamptz not null default now()
);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_product_idx on orders (product_code, created_at desc);

create table if not exists sites (
  product_code          text not null references products(code),
  slug                  text not null,
  url                   text,
  owner_email           text,
  owner_name            text,
  theme                 text,
  status                text not null default 'live',    -- live | disabled | expired
  expires_at            timestamptz,
  storage_bytes         bigint not null default 0,
  order_id              text,
  last_seen_at          timestamptz,                     -- TV heartbeat
  offline_alert_sent_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  primary key (product_code, slug)
);

create table if not exists subscriptions (
  id                   text primary key,                -- Stripe subscription id
  product_code         text references products(code),
  site_slug            text,
  customer_email       text,
  status               text not null,                   -- active | trialing | past_due | canceled | unpaid ...
  amount_cents         int not null default 0,
  interval             text,                            -- month | year
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists pageviews (
  id            bigserial primary key,
  product_code  text not null,
  site_slug     text,
  path          text,
  referrer_host text,
  country       text,
  device        text,                                   -- mobile | desktop | tv
  visitor_hash  text,
  created_at    timestamptz not null default now()
);
create index if not exists pageviews_created_idx on pageviews (created_at);
create index if not exists pageviews_product_idx on pageviews (product_code, created_at);

create table if not exists events (
  id           bigserial primary key,
  product_code text not null,
  site_slug    text,
  name         text not null,                           -- e.g. checkout_started, upload, message_sent
  data         jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists events_idx on events (product_code, name, created_at);

create table if not exists audit_log (
  id         bigserial primary key,
  action     text not null,
  target     text,
  detail     jsonb,
  created_at timestamptz not null default now()
);

-- Starting products. Change the domains once your brand name is chosen
-- (or edit them on the Products page). The three party apps all run from
-- party-kit on the main domain (<slug>.yourbrand.nz), so they share it.
insert into products (code, name, domain, pricing_type, status, features, color, sort, hq_secret) values
 ('story',     'Kids TV storybook', 'yourbrand.nz',          'one_time',     'live',
   '{"host_page":true,"guest_uploads":true,"themes":true,"expiry":true}', '#D4502F', 10,
   replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
 ('photos',    'Party photo wall',  'yourbrand.nz',          'one_time',     'live',
   '{"host_page":true,"guest_uploads":true,"themes":true,"expiry":true}', '#6D4BC3', 20,
   replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
 ('slideshow', 'TV slideshow',      'yourbrand.nz',          'one_time',     'live',
   '{"expiry":true}', '#1F6F6B', 30,
   replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
 ('resthome',  'Resthome TV',       'resthome.yourbrand.nz', 'subscription', 'hidden',
   '{"guest_uploads":true,"heartbeat":true}', '#B7791F', 40,
   replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''))
on conflict (code) do nothing;
