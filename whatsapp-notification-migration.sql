-- Notification tracking for audition applications.
alter table public.audition_applications
    add column if not exists notification_status text not null default 'pending',
    add column if not exists notification_attempted_at timestamptz,
    add column if not exists notification_error text;

-- Normalize existing rows.
update public.audition_applications
set notification_status = case
    when notification_sent_at is not null then 'sent'
    else 'pending'
end
where notification_status is null
   or notification_status not in ('pending', 'processing', 'sent', 'failed');

alter table public.audition_applications
    drop constraint if exists audition_applications_notification_status_check;

alter table public.audition_applications
    add constraint audition_applications_notification_status_check
    check (notification_status in ('pending', 'processing', 'sent', 'failed'));

notify pgrst, 'reload schema';
