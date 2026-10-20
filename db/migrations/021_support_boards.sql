alter table crm_boards drop constraint crm_boards_kind_check;
alter table crm_boards add constraint crm_boards_kind_check check(kind in ('sales','management','support'));
