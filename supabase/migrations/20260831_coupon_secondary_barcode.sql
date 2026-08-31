alter table public.coupons
  add column if not exists secondary_code_value text not null default '',
  add column if not exists secondary_barcode_format text not null default 'code128'
    check (secondary_barcode_format in ('code128', 'ean13', 'ean8', 'upca'));
