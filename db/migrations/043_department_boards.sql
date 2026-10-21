alter table crm_boards drop constraint if exists crm_boards_kind_check;
alter table crm_boards add constraint crm_boards_kind_check check(kind in ('sales','support','management','finance'));
