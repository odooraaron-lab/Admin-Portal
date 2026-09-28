-- One-time: only if you ran schema.sql before the product codes were renamed.
-- Renames storybook → story, photowall → photos, familyscreen → resthome,
-- keeping each product's secret, settings and any orders/sites already recorded.
-- Safe to re-run: it does nothing once the old codes are gone.
begin;

insert into products (code, name, domain, pricing_type, status, features, hq_base_url, hq_secret, stripe_price_ids, color, sort, created_at)
select m.new_code, m.new_name, m.new_domain, p.pricing_type, p.status, p.features || m.extra::jsonb,
       p.hq_base_url, p.hq_secret, p.stripe_price_ids, p.color, p.sort, p.created_at
from products p
join (values
  ('storybook',    'story',    'Kids TV storybook', 'yourbrand.nz',          '{}'),
  ('photowall',    'photos',   'Party photo wall',  'yourbrand.nz',          '{"host_page":true,"themes":true}'),
  ('familyscreen', 'resthome', 'Resthome TV',       'resthome.yourbrand.nz', '{}')
) as m(old_code, new_code, new_name, new_domain, extra) on p.code = m.old_code
on conflict (code) do nothing;

create temp table rename_map (old_code text, new_code text) on commit drop;
insert into rename_map values ('storybook','story'), ('photowall','photos'), ('familyscreen','resthome');

update orders        t set product_code = m.new_code from rename_map m where t.product_code = m.old_code;
update sites         t set product_code = m.new_code from rename_map m where t.product_code = m.old_code;
update subscriptions t set product_code = m.new_code from rename_map m where t.product_code = m.old_code;
update pageviews     t set product_code = m.new_code from rename_map m where t.product_code = m.old_code;
update events        t set product_code = m.new_code from rename_map m where t.product_code = m.old_code;

delete from products where code in (select old_code from rename_map);

-- The slideshow keeps its code; it now lives on the main domain like the other party apps.
update products set domain = 'yourbrand.nz' where code = 'slideshow' and domain = 'slideshow.yourbrand.nz';

commit;

select code, name, domain, status from products order by sort;
