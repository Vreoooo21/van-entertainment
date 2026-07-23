-- VAN ENTERTAINMENT: editable website content
-- Safe to run more than once. Existing edited content_value values are preserved.

create or replace function public.is_van_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.admin_users
        where user_id = auth.uid()
          and coalesce(is_active, true) = true
    );
$$;

revoke all on function public.is_van_admin() from public;
grant execute on function public.is_van_admin() to anon, authenticated;

create table if not exists public.site_content (
    content_key text primary key,
    page_name text not null,
    label text not null,
    content_value text not null default '',
    default_value text not null default '',
    field_type text not null default 'text' check (field_type in ('text','textarea','url','html')),
    display_order integer not null default 0,
    is_public boolean not null default true,
    updated_at timestamptz not null default now()
);

alter table public.site_content
    add column if not exists page_name text,
    add column if not exists label text,
    add column if not exists content_value text default '',
    add column if not exists default_value text default '',
    add column if not exists field_type text default 'text',
    add column if not exists display_order integer default 0,
    add column if not exists is_public boolean default true,
    add column if not exists updated_at timestamptz default now();

update public.site_content
set default_value = content_value
where coalesce(default_value, '') = '';

alter table public.site_content enable row level security;
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

drop policy if exists "van_public_read_site_content" on public.site_content;
drop policy if exists "van_admin_manage_site_content" on public.site_content;

create policy "van_public_read_site_content"
on public.site_content
for select
to anon, authenticated
using (coalesce(is_public, true) = true or public.is_van_admin());

create policy "van_admin_manage_site_content"
on public.site_content
for all
to authenticated
using (public.is_van_admin())
with check (public.is_van_admin());

create or replace function public.van_site_content_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists van_site_content_updated_at on public.site_content;
create trigger van_site_content_updated_at
before update on public.site_content
for each row execute function public.van_site_content_updated_at();

insert into public.site_content (
    content_key, page_name, label, content_value, default_value, field_type, display_order, is_public
) values
('global.brand.name', 'Global', 'Agency name', 'VAN ENTERTAINMENT', 'VAN ENTERTAINMENT', 'text', 10, true),
('global.footer.motto', 'Global', 'Footer motto', 'Old but Gold', 'Old but Gold', 'text', 20, true),
('global.footer.navigation_title', 'Global', 'Footer navigation heading', 'Navigation', 'Navigation', 'text', 30, true),
('global.footer.social_title', 'Global', 'Footer social heading', 'Follow Us', 'Follow Us', 'text', 40, true),
('global.footer.copyright', 'Global', 'Footer copyright', '© 2026 VAN ENTERTAINMENT. All Rights Reserved.', '© 2026 VAN ENTERTAINMENT. All Rights Reserved.', 'text', 50, true),
('home.hero.eyebrow', 'Home', 'Hero eyebrow', 'VIRTUAL ENTERTAINMENT AGENCY', 'VIRTUAL ENTERTAINMENT AGENCY', 'text', 100, true),
('home.hero.title', 'Home', 'Hero title', 'VAN ENTERTAINMENT', 'VAN ENTERTAINMENT', 'text', 110, true),
('home.hero.motto', 'Home', 'Hero motto', 'Old but Gold', 'Old but Gold', 'text', 120, true),
('home.hero.tagline', 'Home', 'Hero tagline', 'Let’s Begin the Journey Together', 'Let’s Begin the Journey Together', 'text', 130, true),
('home.hero.description', 'Home', 'Hero description', 'Creating timeless artists, music, and unforgettable digital stages.', 'Creating timeless artists, music, and unforgettable digital stages.', 'textarea', 140, true),
('home.hero.artists_button', 'Home', 'Hero artists button', 'Explore Artists', 'Explore Artists', 'text', 150, true),
('home.hero.audition_button', 'Home', 'Hero audition button', 'Global Audition', 'Global Audition', 'text', 160, true),
('home.about.eyebrow', 'Home', 'About eyebrow', 'WHO WE ARE', 'WHO WE ARE', 'text', 170, true),
('home.about.title', 'Home', 'About title', 'ABOUT VAN ENTERTAINMENT', 'ABOUT VAN ENTERTAINMENT', 'text', 180, true),
('home.about.subtitle', 'Home', 'About subtitle', 'Old but Gold', 'Old but Gold', 'text', 190, true),
('home.about.p1', 'Home', 'About paragraph 1', 'VAN ENTERTAINMENT is a virtual entertainment agency dedicated to building digital artists, unforgettable music, and immersive entertainment experiences.', 'VAN ENTERTAINMENT is a virtual entertainment agency dedicated to building digital artists, unforgettable music, and immersive entertainment experiences.', 'textarea', 200, true),
('home.about.p2', 'Home', 'About paragraph 2', 'We believe great music never fades. Through creativity, innovation, and storytelling, we create artists who can inspire audiences worldwide.', 'We believe great music never fades. Through creativity, innovation, and storytelling, we create artists who can inspire audiences worldwide.', 'textarea', 210, true),
('home.about.button', 'Home', 'About button', 'Discover Our Story →', 'Discover Our Story →', 'text', 220, true),
('home.hub.eyebrow', 'Home', 'Explore VAN eyebrow', 'EXPLORE VAN', 'EXPLORE VAN', 'text', 230, true),
('home.hub.title', 'Home', 'Explore VAN title', 'MORE FROM VAN', 'MORE FROM VAN', 'text', 240, true),
('home.hub.description', 'Home', 'Explore VAN description', 'Discover the stories, leadership, and community behind VAN ENTERTAINMENT.', 'Discover the stories, leadership, and community behind VAN ENTERTAINMENT.', 'textarea', 250, true),
('home.universe.title', 'Home', 'VAN Universe card title', 'VAN UNIVERSE', 'VAN UNIVERSE', 'text', 260, true),
('home.universe.description', 'Home', 'VAN Universe card description', 'Explore the connected stories, eras, projects, and lore of VAN artists.', 'Explore the connected stories, eras, projects, and lore of VAN artists.', 'textarea', 270, true),
('home.universe.button', 'Home', 'VAN Universe card button', 'Enter VAN Universe →', 'Enter VAN Universe →', 'text', 280, true),
('home.leadership.title', 'Home', 'Leadership card title', 'VAN LEADERSHIP', 'VAN LEADERSHIP', 'text', 290, true),
('home.leadership.description', 'Home', 'Leadership card description', 'Meet the Founder, Co-Founder, CEOs, and executive team guiding VAN.', 'Meet the Founder, Co-Founder, CEOs, and executive team guiding VAN.', 'textarea', 300, true),
('home.leadership.button', 'Home', 'Leadership card button', 'View Leadership →', 'View Leadership →', 'text', 310, true),
('home.voice.title', 'Home', 'VAN Voice card title', 'VAN VOICE', 'VAN VOICE', 'text', 320, true),
('home.voice.description', 'Home', 'VAN Voice card description', 'Join the community chat or send a private concern directly to VAN.', 'Join the community chat or send a private concern directly to VAN.', 'textarea', 330, true),
('home.voice.button', 'Home', 'VAN Voice card button', 'Open VAN Voice →', 'Open VAN Voice →', 'text', 340, true),
('home.stats.artists', 'Home', 'Artists statistic label', 'Artists', 'Artists', 'text', 350, true),
('home.stats.survival', 'Home', 'Survival statistic label', 'Survival Projects', 'Survival Projects', 'text', 360, true),
('home.stats.creative', 'Home', 'Creative statistic label', 'Creative Possibilities', 'Creative Possibilities', 'text', 370, true),
('home.artists.eyebrow', 'Home', 'Artists section eyebrow', 'OUR ROSTER', 'OUR ROSTER', 'text', 380, true),
('home.artists.title', 'Home', 'Artists section title', 'FEATURED ARTISTS', 'FEATURED ARTISTS', 'text', 390, true),
('home.artists.description', 'Home', 'Artists section description', 'Meet selected artists under VAN ENTERTAINMENT.', 'Meet selected artists under VAN ENTERTAINMENT.', 'textarea', 400, true),
('home.artists.button', 'Home', 'Artists section button', 'View All Artists →', 'View All Artists →', 'text', 410, true),
('home.survival.eyebrow', 'Home', 'Survival section eyebrow', 'VAN ENTERTAINMENT', 'VAN ENTERTAINMENT', 'text', 420, true),
('home.survival.title', 'Home', 'Survival section title', 'SURVIVAL PROJECTS', 'SURVIVAL PROJECTS', 'text', 430, true),
('home.survival.description', 'Home', 'Survival section description', 'Explore the programs that discovered new talent and shaped every generation of VAN artists.', 'Explore the programs that discovered new talent and shaped every generation of VAN artists.', 'textarea', 440, true),
('home.survival.button', 'Home', 'Survival section button', 'View Survival Projects', 'View Survival Projects', 'text', 450, true),
('home.news.eyebrow', 'Home', 'News section eyebrow', 'ANNOUNCEMENTS', 'ANNOUNCEMENTS', 'text', 460, true),
('home.news.title', 'Home', 'News section title', 'LATEST NEWS', 'LATEST NEWS', 'text', 470, true),
('home.news.description', 'Home', 'News section description', 'Stay updated with releases, events, and agency announcements.', 'Stay updated with releases, events, and agency announcements.', 'textarea', 480, true),
('home.news.button', 'Home', 'News section button', 'View All News →', 'View All News →', 'text', 490, true),
('home.audition.eyebrow', 'Home', 'Audition section eyebrow', 'YOUR STAGE STARTS HERE', 'YOUR STAGE STARTS HERE', 'text', 500, true),
('home.audition.title', 'Home', 'Audition section title', 'GLOBAL AUDITION', 'GLOBAL AUDITION', 'text', 510, true),
('home.audition.description', 'Home', 'Audition section description', 'Show your voice, rap, dance, creativity, or production skills and begin a new journey with VAN ENTERTAINMENT.', 'Show your voice, rap, dance, creativity, or production skills and begin a new journey with VAN ENTERTAINMENT.', 'textarea', 520, true),
('home.audition.button', 'Home', 'Audition section button', 'Audition Information', 'Audition Information', 'text', 530, true),
('about.hero.eyebrow', 'About', 'Hero eyebrow', 'OUR STORY', 'OUR STORY', 'text', 10, true),
('about.hero.title', 'About', 'Hero title', 'ABOUT VAN', 'ABOUT VAN', 'text', 20, true),
('about.hero.description', 'About', 'Hero description', 'A virtual entertainment agency built around timeless music, strong identities, and meaningful creative journeys.', 'A virtual entertainment agency built around timeless music, strong identities, and meaningful creative journeys.', 'textarea', 30, true),
('about.story.eyebrow', 'About', 'Story eyebrow', 'OLD BUT GOLD', 'OLD BUT GOLD', 'text', 40, true),
('about.story.title', 'About', 'Story title', 'Music That Stays', 'Music That Stays', 'text', 50, true),
('about.story.p1', 'About', 'Story paragraph 1', 'VAN ENTERTAINMENT develops virtual artists through music, storytelling, performance, and community. Every artist is designed to have a clear identity and a journey audiences can follow.', 'VAN ENTERTAINMENT develops virtual artists through music, storytelling, performance, and community. Every artist is designed to have a clear identity and a journey audiences can follow.', 'textarea', 60, true),
('about.story.p2', 'About', 'Story paragraph 2', 'Our motto, Old but Gold, reflects our belief that strong concepts and memorable music can remain meaningful long after a trend ends.', 'Our motto, Old but Gold, reflects our belief that strong concepts and memorable music can remain meaningful long after a trend ends.', 'textarea', 70, true),
('about.values.eyebrow', 'About', 'Values eyebrow', 'WHAT WE VALUE', 'WHAT WE VALUE', 'text', 80, true),
('about.values.title', 'About', 'Values title', 'OUR CREATIVE PRINCIPLES', 'OUR CREATIVE PRINCIPLES', 'text', 90, true),
('about.values.identity.title', 'About', 'Identity value title', 'Identity', 'Identity', 'text', 100, true),
('about.values.identity.description', 'About', 'Identity value description', 'Every artist needs a distinct voice, visual language, and story.', 'Every artist needs a distinct voice, visual language, and story.', 'textarea', 110, true),
('about.values.growth.title', 'About', 'Growth value title', 'Growth', 'Growth', 'text', 120, true),
('about.values.growth.description', 'About', 'Growth value description', 'Talent is developed through consistent practice, feedback, and new challenges.', 'Talent is developed through consistent practice, feedback, and new challenges.', 'textarea', 130, true),
('about.values.community.title', 'About', 'Community value title', 'Community', 'Community', 'text', 140, true),
('about.values.community.description', 'About', 'Community value description', 'Artists and audiences grow stronger when they share the journey together.', 'Artists and audiences grow stronger when they share the journey together.', 'textarea', 150, true),
('artists.hero.eyebrow', 'Artists', 'Hero eyebrow', 'VAN ENTERTAINMENT ROSTER', 'VAN ENTERTAINMENT ROSTER', 'text', 10, true),
('artists.hero.title', 'Artists', 'Hero title', 'OUR ARTISTS', 'OUR ARTISTS', 'text', 20, true),
('artists.hero.description', 'Artists', 'Hero description', 'Meet the virtual artists creating music, stories, and stages under VAN ENTERTAINMENT.', 'Meet the virtual artists creating music, stories, and stages under VAN ENTERTAINMENT.', 'textarea', 30, true),
('artists.filter.all', 'Artists', 'Filter: All', 'All', 'All', 'text', 40, true),
('artists.filter.girl_group', 'Artists', 'Filter: Girl Group', 'Girl Group', 'Girl Group', 'text', 50, true),
('artists.filter.boy_group', 'Artists', 'Filter: Boy Group', 'Boy Group', 'Boy Group', 'text', 60, true),
('artists.filter.solo', 'Artists', 'Filter: Solo', 'Solo', 'Solo', 'text', 70, true),
('artists.filter.coed', 'Artists', 'Filter: Co-ed', 'Co-ed', 'Co-ed', 'text', 80, true),
('survival.hero.eyebrow', 'Survival', 'Hero eyebrow', 'NINE GENERATIONS', 'NINE GENERATIONS', 'text', 10, true),
('survival.hero.title', 'Survival', 'Hero title', 'SURVIVAL PROJECTS', 'SURVIVAL PROJECTS', 'text', 20, true),
('survival.hero.description', 'Survival', 'Hero description', 'Explore every program created by VAN ENTERTAINMENT to discover and develop new virtual talent.', 'Explore every program created by VAN ENTERTAINMENT to discover and develop new virtual talent.', 'textarea', 30, true),
('news.hero.eyebrow', 'News', 'Hero eyebrow', 'OFFICIAL UPDATES', 'OFFICIAL UPDATES', 'text', 10, true),
('news.hero.title', 'News', 'Hero title', 'LATEST NEWS', 'LATEST NEWS', 'text', 20, true),
('news.hero.description', 'News', 'Hero description', 'Official announcements, artist updates, releases, and events from VAN ENTERTAINMENT.', 'Official announcements, artist updates, releases, and events from VAN ENTERTAINMENT.', 'textarea', 30, true),
('leadership.hero.eyebrow', 'Leadership', 'Hero eyebrow', 'EXECUTIVE TEAM', 'EXECUTIVE TEAM', 'text', 10, true),
('leadership.hero.title', 'Leadership', 'Hero title', 'VAN LEADERSHIP', 'VAN LEADERSHIP', 'text', 20, true),
('leadership.hero.description', 'Leadership', 'Hero description', 'Meet the people responsible for guiding VAN ENTERTAINMENT, its artists, and its creative projects.', 'Meet the people responsible for guiding VAN ENTERTAINMENT, its artists, and its creative projects.', 'textarea', 30, true),
('universe.hero.eyebrow', 'Universe', 'Hero eyebrow', 'CONNECTED STORIES', 'CONNECTED STORIES', 'text', 10, true),
('universe.hero.title', 'Universe', 'Hero title', 'VAN UNIVERSE', 'VAN UNIVERSE', 'text', 20, true),
('universe.hero.description', 'Universe', 'Hero description', 'Explore the stories, eras, and creative worlds connected across VAN ENTERTAINMENT.', 'Explore the stories, eras, and creative worlds connected across VAN ENTERTAINMENT.', 'textarea', 30, true),
('contact.hero.eyebrow', 'Contact', 'Hero eyebrow', 'OFFICIAL CHANNELS', 'OFFICIAL CHANNELS', 'text', 10, true),
('contact.hero.title', 'Contact', 'Hero title', 'CONNECT WITH VAN', 'CONNECT WITH VAN', 'text', 20, true),
('contact.hero.description', 'Contact', 'Hero description', 'Follow official accounts for announcements, releases, auditions, and new projects.', 'Follow official accounts for announcements, releases, auditions, and new projects.', 'textarea', 30, true),
('contact.youtube.description', 'Contact', 'YouTube description', 'Music & Video Content', 'Music & Video Content', 'text', 40, true),
('contact.youtube.button', 'Contact', 'YouTube link text', 'Open Channel →', 'Open Channel →', 'text', 50, true),
('contact.instagram.description', 'Contact', 'Instagram description', 'Photos & Announcements', 'Photos & Announcements', 'text', 60, true),
('contact.instagram.button', 'Contact', 'Instagram link text', 'Open Profile →', 'Open Profile →', 'text', 70, true),
('contact.tiktok.description', 'Contact', 'TikTok description', 'Short-form Content', 'Short-form Content', 'text', 80, true),
('contact.tiktok.button', 'Contact', 'TikTok link text', 'Open Profile →', 'Open Profile →', 'text', 90, true),
('contact.whatsapp.description', 'Contact', 'WhatsApp description', 'Channel Updates', 'Channel Updates', 'text', 100, true),
('contact.whatsapp.button', 'Contact', 'WhatsApp link text', 'Open Channel →', 'Open Channel →', 'text', 110, true),
('audition.hero.eyebrow', 'Audition', 'Hero eyebrow', 'GLOBAL AUDITION', 'GLOBAL AUDITION', 'text', 10, true),
('audition.hero.title', 'Audition', 'Hero title', 'YOUR STAGE STARTS HERE', 'YOUR STAGE STARTS HERE', 'text', 20, true),
('audition.hero.description', 'Audition', 'Hero description', 'Vocal, rap, dance, performance, songwriting, production, design, and other creative talents are welcome.', 'Vocal, rap, dance, performance, songwriting, production, design, and other creative talents are welcome.', 'textarea', 30, true),
('audition.programs.eyebrow', 'Audition', 'Programs eyebrow', 'CURRENT PROGRAMS', 'CURRENT PROGRAMS', 'text', 40, true),
('audition.programs.title', 'Audition', 'Programs title', 'OPEN & UPCOMING AUDITIONS', 'OPEN & UPCOMING AUDITIONS', 'text', 50, true),
('audition.form.eyebrow', 'Audition', 'Form eyebrow', 'APPLICATION', 'APPLICATION', 'text', 60, true),
('audition.form.title', 'Audition', 'Application form title', 'SUBMIT YOUR AUDITION', 'SUBMIT YOUR AUDITION', 'text', 70, true),
('audition.form.description', 'Audition', 'Application form description', 'Choose an active audition and send your strongest material. VAN may contact selected applicants through WhatsApp or email.', 'Choose an active audition and send your strongest material. VAN may contact selected applicants through WhatsApp or email.', 'textarea', 80, true),
('audition.form.consent', 'Audition', 'Consent statement', 'I confirm the information is accurate and allow VAN ENTERTAINMENT to contact me through WhatsApp or email regarding this audition.', 'I confirm the information is accurate and allow VAN ENTERTAINMENT to contact me through WhatsApp or email regarding this audition.', 'textarea', 90, true),
('audition.form.submit', 'Audition', 'Submit button', 'Submit Audition', 'Submit Audition', 'text', 100, true),
('voice.hero.eyebrow', 'VAN Voice', 'Hero eyebrow', 'COMMUNITY & FEEDBACK', 'COMMUNITY & FEEDBACK', 'text', 10, true),
('voice.hero.title', 'VAN Voice', 'Hero title', 'VAN VOICE', 'VAN VOICE', 'text', 20, true),
('voice.hero.description', 'VAN Voice', 'Hero description', 'Talk with the VAN community, share ideas instantly, or send a private report to the agency.', 'Talk with the VAN community, share ideas instantly, or send a private report to the agency.', 'textarea', 30, true),
('voice.tab.chat', 'VAN Voice', 'Community Chat tab', 'Community Chat', 'Community Chat', 'text', 40, true),
('voice.tab.private', 'VAN Voice', 'Private Report tab', 'Private Report', 'Private Report', 'text', 50, true),
('voice.tab.track', 'VAN Voice', 'Track Report tab', 'Track Report', 'Track Report', 'text', 60, true),
('voice.chat.notice', 'VAN Voice', 'Chat notice', 'Public messages appear immediately. Use Private Report for sensitive concerns.', 'Public messages appear immediately. Use Private Report for sensitive concerns.', 'textarea', 70, true),
('voice.chat.warning', 'VAN Voice', 'Chat conduct notice', 'Be respectful. Messages can be reported or removed by VAN moderators.', 'Be respectful. Messages can be reported or removed by VAN moderators.', 'textarea', 80, true),
('voice.chat.submit', 'VAN Voice', 'Send message button', 'Send Message', 'Send Message', 'text', 90, true),
('voice.private.eyebrow', 'VAN Voice', 'Private report eyebrow', 'CONFIDENTIAL CHANNEL', 'CONFIDENTIAL CHANNEL', 'text', 100, true),
('voice.private.title', 'VAN Voice', 'Private report title', 'PRIVATE REPORT', 'PRIVATE REPORT', 'text', 110, true),
('voice.private.description', 'VAN Voice', 'Private report description', 'This report will not appear in the community chat. Save the ticket code and PIN after submitting.', 'This report will not appear in the community chat. Save the ticket code and PIN after submitting.', 'textarea', 120, true),
('voice.private.submit', 'VAN Voice', 'Private report button', 'Send Private Report', 'Send Private Report', 'text', 130, true),
('voice.track.eyebrow', 'VAN Voice', 'Tracking eyebrow', 'REPORT TRACKING', 'REPORT TRACKING', 'text', 140, true),
('voice.track.title', 'VAN Voice', 'Tracking title', 'CHECK STATUS', 'CHECK STATUS', 'text', 150, true),
('voice.track.description', 'VAN Voice', 'Tracking description', 'Enter the ticket code and six-digit PIN from your private report.', 'Enter the ticket code and six-digit PIN from your private report.', 'textarea', 160, true),
('voice.track.submit', 'VAN Voice', 'Tracking button', 'Track Report', 'Track Report', 'text', 170, true)
on conflict (content_key) do update set
    page_name = excluded.page_name,
    label = excluded.label,
    default_value = excluded.default_value,
    field_type = excluded.field_type,
    display_order = excluded.display_order,
    is_public = excluded.is_public;

notify pgrst, 'reload schema';
