alter table users add column known_by text not null default '' check(length(known_by)<=80);
alter table users add column avatar_image text not null default '';
alter table users add column signature_text text not null default '' check(length(signature_text)<=500);
alter table users add column signature_image text not null default '';
alter table conversations add column presentation_user_id int;
