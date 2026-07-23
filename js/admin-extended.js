import { supabase } from './supabase.js';
import { uploadImage, removeImages } from './storage.js';
import { escapeHtml, fallbackImage, formatDate, slugify } from './utils.js';

const $ = (id) => document.getElementById(id);
const state = {
    profile: null,
    siteContent: [], navigation: [], pages: [], leadership: [], survival: [], programs: [], applications: [], voice: [], admins: [],
    editing: { navigation: null, page: null, leadership: null, survival: null, program: null, admin: null }
};
const roleManagerRoles = ['Founder','Co-Founder'];

function applyRoleUi(role) {
    const allTabs = ['artists','members','albums','videos','news','content','theme','navigation','pages','leadership','survival','auditions','applications','notifications','voice','roles'];
    const permissions = {
        'Founder': allTabs,
        'Co-Founder': allTabs,
        'CEO 1': allTabs.filter((item) => item !== 'roles'),
        'CEO 2': allTabs.filter((item) => item !== 'roles'),
        'Co-CEO 1': allTabs.filter((item) => item !== 'roles'),
        'Co-CEO 2': allTabs.filter((item) => item !== 'roles'),
        'Manager': allTabs.filter((item) => item !== 'roles'),
        'Artist Manager': ['artists','members','albums','videos','news'],
        'Survival Manager': ['survival','news'],
        'Audition Manager': ['auditions','applications','notifications','news'],
        'Judge': ['applications','notifications'],
        'Editor': ['news','content','theme','navigation','pages','leadership'],
        'Moderator': ['voice','news'],
        'Viewer': ['artists','members','albums','videos','news','content','leadership','survival']
    };
    const allowed = permissions[role] || ['artists'];
    document.querySelectorAll('[data-admin-tab]').forEach((button) => {
        button.hidden = !allowed.includes(button.dataset.adminTab);
    });
    if (role === 'Viewer') document.body.classList.add('admin-readonly');
    const current = document.querySelector('[data-admin-tab].active');
    if (!current || current.hidden) {
        const first = [...document.querySelectorAll('[data-admin-tab]')].find((button) => !button.hidden);
        first?.click();
    }
}

function message(id, text = '', type = 'info') {
    const el = $(id); if (!el) return; el.textContent = text; el.dataset.type = type;
}
function setBusy(button, busy, text = 'Saving...') {
    if (!button) return; if (!button.dataset.original) button.dataset.original = button.textContent;
    button.disabled = busy; button.textContent = busy ? text : button.dataset.original;
}
function openSection(id) { const el=$(id); if(el){el.hidden=false;el.scrollIntoView({behavior:'smooth',block:'start'});} }
function closeSection(id) { const el=$(id); if(el) el.hidden=true; }
function val(id) { return $(id)?.value?.trim() || ''; }
function check(id) { return Boolean($(id)?.checked); }
function nullableNumber(id) { const v=val(id); return v === '' ? null : Number(v); }
function toDbTime(value) { return value ? new Date(value).toISOString() : null; }
function toInputTime(value) { if (!value) return ''; const d=new Date(value); const local=new Date(d.getTime()-d.getTimezoneOffset()*60000); return local.toISOString().slice(0,16); }
function csvDownload(filename, rows) {
    if (!rows.length) return alert('No data to export.');
    const headers = Object.keys(rows[0]);
    const quote = (v) => `"${String(v ?? '').replaceAll('"','""')}"`;
    const csv = [headers.map(quote).join(','), ...rows.map(row => headers.map(h => quote(row[h])).join(','))].join('\n');
    const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
function imageCard(image, alt) { return `<img src="${escapeHtml(image || fallbackImage())}" alt="${escapeHtml(alt)}" onerror="this.src='${fallbackImage()}'">`; }

async function getProfile() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return null;
    const { data } = await supabase.from('admin_users').select('*').eq('user_id', user.id).maybeSingle();
    return data ? {...data,email:user.email||''} : null;
}

// ---------- SITE CONTENT ----------
function siteContentPageLabel(value = '') {
    return String(value || 'Other').trim() || 'Other';
}

function applySiteContentFilter() {
    const query = String($('siteContentSearch')?.value || '').trim().toLowerCase();
    const selectedPage = $('siteContentPageFilter')?.value || '';

    document.querySelectorAll('[data-content-editor-page]').forEach((pageSection) => {
        const pageName = pageSection.dataset.contentEditorPage || '';
        let visibleCount = 0;

        pageSection.querySelectorAll('[data-content-editor-item]').forEach((item) => {
            const searchable = String(item.dataset.contentSearch || '').toLowerCase();
            const visible = (!selectedPage || selectedPage === pageName) && (!query || searchable.includes(query));
            item.hidden = !visible;
            if (visible) visibleCount += 1;
        });

        pageSection.hidden = visibleCount === 0;
    });
}

async function loadSiteContent() {
    const box = $('siteContentEditor');
    box.innerHTML = '<p class="loading-message">Loading editable text...</p>';
    message('siteContentMessage');

    const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .order('page_name')
        .order('display_order');

    if (error) {
        box.innerHTML = `<p class="error-state">${escapeHtml(error.message)}</p>`;
        return;
    }

    const items = data || [];
    state.siteContent = items;
    const pages = [...new Set(items.map((item) => siteContentPageLabel(item.page_name)))];
    const pageFilter = $('siteContentPageFilter');
    if (pageFilter) {
        const previous = pageFilter.value;
        pageFilter.innerHTML = '<option value="">All pages</option>' + pages
            .map((page) => `<option value="${escapeHtml(page)}">${escapeHtml(page)}</option>`)
            .join('');
        if (pages.includes(previous)) pageFilter.value = previous;
    }

    const grouped = new Map();
    items.forEach((item) => {
        const page = siteContentPageLabel(item.page_name);
        if (!grouped.has(page)) grouped.set(page, []);
        grouped.get(page).push(item);
    });

    box.innerHTML = [...grouped.entries()].map(([page, pageItems]) => {
        const controls = pageItems.map((item) => {
            const input = item.field_type === 'textarea' || item.field_type === 'html'
                ? `<textarea data-content-input="${escapeHtml(item.content_key)}">${escapeHtml(item.content_value)}</textarea>`
                : `<input type="${item.field_type === 'url' ? 'url' : 'text'}" data-content-input="${escapeHtml(item.content_key)}" value="${escapeHtml(item.content_value)}">`;
            const searchable = [page, item.label, item.content_key, item.content_value].join(' ');
            return `<label class="content-editor-item" data-content-editor-item data-content-search="${escapeHtml(searchable)}">
                <span class="content-editor-item-heading"><strong>${escapeHtml(item.label)}</strong><button class="content-reset-btn" type="button" data-reset-content="${escapeHtml(item.content_key)}" data-default-value="${escapeHtml(item.default_value ?? item.content_value ?? '')}">Reset</button></span>
                <span class="content-key-label">${escapeHtml(item.content_key)}</span>
                ${input}
            </label>`;
        }).join('');

        return `<section class="content-editor-page" data-content-editor-page="${escapeHtml(page)}">
            <div class="content-editor-group"><h3>${escapeHtml(page)}</h3><span>${pageItems.length} fields</span></div>
            <div class="content-editor-page-fields">${controls}</div>
        </section>`;
    }).join('') || '<p class="admin-empty">No editable content found. Run the Website Content SQL migration first.</p>';

    applySiteContentFilter();
}

$('siteContentSearch')?.addEventListener('input', applySiteContentFilter);
$('siteContentPageFilter')?.addEventListener('change', applySiteContentFilter);
$('reloadSiteContentBtn')?.addEventListener('click', loadSiteContent);
$('siteContentEditor')?.addEventListener('click', (event) => {
    const reset = event.target.closest('[data-reset-content]');
    if (!reset) return;
    const input = document.querySelector(`[data-content-input="${CSS.escape(reset.dataset.resetContent)}"]`);
    if (input) {
        input.value = reset.dataset.defaultValue || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
});

$('saveSiteContentBtn')?.addEventListener('click', async (event) => {
    setBusy(event.currentTarget, true, 'Saving...');
    message('siteContentMessage');

    const sourceByKey = new Map(state.siteContent.map((item) => [item.content_key, item]));
    const updates = [...document.querySelectorAll('[data-content-input]')]
        .map((input) => {
            const current = sourceByKey.get(input.dataset.contentInput) || {};
            return {
                ...current,
                content_key: input.dataset.contentInput,
                content_value: input.value,
                updated_at: new Date().toISOString()
            };
        });

    const { error } = await supabase
        .from('site_content')
        .upsert(updates, { onConflict: 'content_key' });

    message(
        'siteContentMessage',
        error ? error.message : 'Website content saved. Refresh the public page to see the changes.',
        error ? 'error' : 'success'
    );
    setBusy(event.currentTarget, false);
});

// ---------- THEME ----------
async function loadTheme(){const {data,error}=await supabase.from('site_settings').select('*').eq('id',1).maybeSingle();if(error||!data)return;$('themePrimary').value=data.primary_color;$('themeAccent').value=data.accent_color;$('themeBackground').value=data.background_color;$('themeSurface').value=data.surface_color;$('themeText').value=data.text_color;$('themeMuted').value=data.muted_color;$('themeHeadingFont').value=data.heading_font;$('themeBodyFont').value=data.body_font;$('themeMaintenance').checked=data.maintenance_mode;$('themeMaintenanceMessage').value=data.maintenance_message||'';$('themeAdminWhatsapp').value=data.admin_whatsapp_display||'';}
$('themeForm')?.addEventListener('submit',async(event)=>{event.preventDefault();const button=event.submitter;setBusy(button,true);const payload={primary_color:val('themePrimary'),accent_color:val('themeAccent'),background_color:val('themeBackground'),surface_color:val('themeSurface'),text_color:val('themeText'),muted_color:val('themeMuted'),heading_font:val('themeHeadingFont'),body_font:val('themeBodyFont'),maintenance_mode:check('themeMaintenance'),maintenance_message:val('themeMaintenanceMessage'),admin_whatsapp_display:val('themeAdminWhatsapp')||null};const {error}=await supabase.from('site_settings').update(payload).eq('id',1);message('themeMessage',error?error.message:'Theme settings saved.',error?'error':'success');setBusy(button,false);});

// ---------- NAVIGATION ----------
function resetNavigation(){state.editing.navigation=null;$('navigationForm').reset();$('navigationVisible').checked=true;$('navigationOrder').value='0';message('navigationMessage');}
function editNavigation(item=null){resetNavigation();if(item){state.editing.navigation=item;$('navigationLabel').value=item.label;$('navigationHref').value=item.href;$('navigationLocation').value=item.location;$('navigationOrder').value=item.display_order;$('navigationVisible').checked=item.is_visible;$('navigationExternal').checked=item.is_external;}openSection('navigationFormSection');}
async function loadNavigation(){const {data,error}=await supabase.from('navigation_items').select('*').order('location').order('display_order');if(error){$('navigationList').innerHTML=`<p class="error-state">${escapeHtml(error.message)}</p>`;return;}state.navigation=data||[];$('navigationList').innerHTML=state.navigation.map(item=>`<article class="admin-list-row"><div class="admin-list-main"><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.href)}</p><div class="admin-list-meta"><span class="status-badge">${escapeHtml(item.location)}</span><span class="status-badge ${item.is_visible?'published':'draft'}">${item.is_visible?'Visible':'Hidden'}</span><span class="status-badge">Order ${item.display_order}</span></div></div><div class="admin-list-actions"><button class="secondary-btn" data-edit-navigation="${item.id}">Edit</button><button class="danger-btn" data-delete-navigation="${item.id}">Delete</button></div></article>`).join('')||'<p class="admin-empty">No menu items.</p>';}
$('addNavigationBtn')?.addEventListener('click',()=>editNavigation());$('cancelNavigationBtn')?.addEventListener('click',()=>{resetNavigation();closeSection('navigationFormSection');});
$('navigationForm')?.addEventListener('submit',async(event)=>{event.preventDefault();const button=event.submitter;setBusy(button,true);const payload={label:val('navigationLabel'),href:val('navigationHref'),location:val('navigationLocation'),display_order:Number(val('navigationOrder')||0),is_visible:check('navigationVisible'),is_external:check('navigationExternal')};const query=state.editing.navigation?supabase.from('navigation_items').update(payload).eq('id',state.editing.navigation.id):supabase.from('navigation_items').insert(payload);const {error}=await query;message('navigationMessage',error?error.message:'Menu item saved.',error?'error':'success');setBusy(button,false);if(!error){resetNavigation();closeSection('navigationFormSection');await loadNavigation();}});
$('navigationList')?.addEventListener('click',async(event)=>{const edit=event.target.closest('[data-edit-navigation]');if(edit)return editNavigation(state.navigation.find(x=>String(x.id)===edit.dataset.editNavigation));const del=event.target.closest('[data-delete-navigation]');if(del&&confirm('Delete this menu item?')){await supabase.from('navigation_items').delete().eq('id',del.dataset.deleteNavigation);await loadNavigation();}});

// ---------- CUSTOM PAGES ----------
function resetPage(){state.editing.page=null;$('pageForm').reset();message('pageMessage');delete $('pageSlug').dataset.touched;}
function editPage(item=null){resetPage();if(item){state.editing.page=item;$('pageTitle').value=item.title;$('pageSlug').value=item.slug;$('pageEyebrow').value=item.eyebrow||'';$('pageSummary').value=item.summary||'';$('pageBody').value=item.body_html||'';$('pagePublished').checked=item.is_published;}openSection('pageFormSection');}
$('pageTitle')?.addEventListener('input',()=>{if(!state.editing.page&&!$('pageSlug').dataset.touched)$('pageSlug').value=slugify(val('pageTitle'));});$('pageSlug')?.addEventListener('input',()=>{$('pageSlug').dataset.touched='1';});
async function loadPages(){const {data,error}=await supabase.from('custom_pages').select('*').order('created_at',{ascending:false});if(error){$('pageList').innerHTML=`<p class="error-state">${escapeHtml(error.message)}</p>`;return;}state.pages=data||[];$('pageList').innerHTML=state.pages.map(item=>`<article class="admin-card compact-card">${imageCard(item.cover_image,item.title)}<div class="admin-card-body"><div class="admin-card-heading"><div><h3>${escapeHtml(item.title)}</h3><p>page.html?slug=${escapeHtml(item.slug)}</p></div><span class="status-badge ${item.is_published?'published':'draft'}">${item.is_published?'Published':'Draft'}</span></div><div class="admin-card-actions"><a class="secondary-btn" href="page.html?slug=${encodeURIComponent(item.slug)}" target="_blank">Preview</a><button class="secondary-btn" data-edit-page="${item.id}">Edit</button><button class="danger-btn" data-delete-page="${item.id}">Delete</button></div></div></article>`).join('')||'<p class="admin-empty">No custom pages yet.</p>';}
$('addPageBtn')?.addEventListener('click',()=>editPage());$('cancelPageBtn')?.addEventListener('click',()=>{resetPage();closeSection('pageFormSection');});
$('pageForm')?.addEventListener('submit',async(event)=>{event.preventDefault();const button=event.submitter;setBusy(button,true);const old=state.editing.page;let image={publicUrl:old?.cover_image||null,path:old?.cover_image_path||null};try{const file=$('pageImageFile').files[0];if(file)image=await uploadImage(file,'pages');const payload={title:val('pageTitle'),slug:slugify(val('pageSlug')),eyebrow:val('pageEyebrow')||null,summary:val('pageSummary')||null,body_html:$('pageBody').value,cover_image:image.publicUrl,cover_image_path:image.path,is_published:check('pagePublished')};const {error}=old?await supabase.from('custom_pages').update(payload).eq('id',old.id):await supabase.from('custom_pages').insert(payload);if(error)throw error;if(file&&old?.cover_image_path)await removeImages([old.cover_image_path]);message('pageMessage','Page saved.','success');resetPage();closeSection('pageFormSection');await loadPages();}catch(error){message('pageMessage',error.message,'error');}finally{setBusy(button,false);}});
$('pageList')?.addEventListener('click',async(event)=>{const edit=event.target.closest('[data-edit-page]');if(edit)return editPage(state.pages.find(x=>String(x.id)===edit.dataset.editPage));const del=event.target.closest('[data-delete-page]');if(del&&confirm('Delete this custom page?')){const item=state.pages.find(x=>String(x.id)===del.dataset.deletePage);const {error}=await supabase.from('custom_pages').delete().eq('id',del.dataset.deletePage);if(!error){await removeImages([item?.cover_image_path]);await loadPages();}}});

// ---------- LEADERSHIP ----------
function resetLeadership(){state.editing.leadership=null;$('leadershipForm').reset();$('leadershipVisible').checked=true;$('leadershipOrder').value='0';message('leadershipMessage');}
function editLeadership(item=null){resetLeadership();if(item){state.editing.leadership=item;$('leadershipName').value=item.name;$('leadershipRole').value=item.role;$('leadershipDivision').value=item.division||'';$('leadershipStarted').value=item.started_at||'';$('leadershipStatus').value=item.status;$('leadershipOrder').value=item.display_order;$('leadershipEmail').value=item.email||'';$('leadershipInstagram').value=item.instagram_url||'';$('leadershipBio').value=item.bio||'';$('leadershipQuote').value=item.quote||'';$('leadershipProjects').value=item.projects||'';$('leadershipVisible').checked=item.is_visible;}openSection('leadershipFormSection');}
async function loadLeadership(){const {data,error}=await supabase.from('leadership_profiles').select('*').order('display_order');if(error){$('leadershipAdminList').innerHTML=`<p class="error-state">${escapeHtml(error.message)}</p>`;return;}state.leadership=data||[];$('leadershipAdminList').innerHTML=state.leadership.map(item=>`<article class="admin-card">${imageCard(item.profile_image,item.name)}<div class="admin-card-body"><div class="admin-card-heading"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.role)}</p></div><span class="status-badge ${item.is_visible?'published':'draft'}">${item.is_visible?'Visible':'Hidden'}</span></div><small>${escapeHtml(item.division||item.status)}</small><div class="admin-card-actions"><button class="secondary-btn" data-edit-leadership="${item.id}">Edit</button><button class="danger-btn" data-delete-leadership="${item.id}">Delete</button></div></div></article>`).join('')||'<p class="admin-empty">No leadership profiles yet.</p>';}
$('addLeadershipBtn')?.addEventListener('click',()=>editLeadership());$('cancelLeadershipBtn')?.addEventListener('click',()=>{resetLeadership();closeSection('leadershipFormSection');});
$('leadershipForm')?.addEventListener('submit',async(event)=>{event.preventDefault();const button=event.submitter;setBusy(button,true);const old=state.editing.leadership;let image={publicUrl:old?.profile_image||null,path:old?.profile_image_path||null};try{const file=$('leadershipImageFile').files[0];if(file)image=await uploadImage(file,'leadership');const payload={name:val('leadershipName'),role:val('leadershipRole'),division:val('leadershipDivision')||null,bio:val('leadershipBio')||null,quote:val('leadershipQuote')||null,started_at:val('leadershipStarted')||null,projects:val('leadershipProjects')||null,email:val('leadershipEmail')||null,instagram_url:val('leadershipInstagram')||null,profile_image:image.publicUrl,profile_image_path:image.path,status:val('leadershipStatus'),display_order:Number(val('leadershipOrder')||0),is_visible:check('leadershipVisible')};const {error}=old?await supabase.from('leadership_profiles').update(payload).eq('id',old.id):await supabase.from('leadership_profiles').insert(payload);if(error)throw error;if(file&&old?.profile_image_path)await removeImages([old.profile_image_path]);resetLeadership();closeSection('leadershipFormSection');await loadLeadership();}catch(error){message('leadershipMessage',error.message,'error');}finally{setBusy(button,false);}});
$('leadershipAdminList')?.addEventListener('click',async(event)=>{const edit=event.target.closest('[data-edit-leadership]');if(edit)return editLeadership(state.leadership.find(x=>String(x.id)===edit.dataset.editLeadership));const del=event.target.closest('[data-delete-leadership]');if(del&&confirm('Delete this leadership profile?')){const item=state.leadership.find(x=>String(x.id)===del.dataset.deleteLeadership);const {error}=await supabase.from('leadership_profiles').delete().eq('id',del.dataset.deleteLeadership);if(!error){await removeImages([item?.profile_image_path]);await loadLeadership();}}});

// ---------- SURVIVAL ----------
function resetSurvival(){state.editing.survival=null;$('survivalForm').reset();$('survivalVisible').checked=true;$('survivalStatus').value='Completed';$('survivalOrder').value='0';delete $('survivalSlug').dataset.touched;message('survivalMessage');}
function editSurvival(item=null){resetSurvival();if(item){state.editing.survival=item;$('survivalName').value=item.name;$('survivalSlug').value=item.slug;$('survivalGeneration').value=item.generation_label||'';$('survivalYear').value=item.year_label||'';$('survivalStatus').value=item.status;$('survivalOrder').value=item.display_order;$('survivalDetailUrl').value=item.detail_url||'';$('survivalDescription').value=item.description||'';$('survivalFeatured').checked=item.is_featured;$('survivalVisible').checked=item.is_visible;}openSection('survivalFormSection');}
$('survivalName')?.addEventListener('input',()=>{if(!state.editing.survival&&!$('survivalSlug').dataset.touched)$('survivalSlug').value=slugify(val('survivalName'));});$('survivalSlug')?.addEventListener('input',()=>{$('survivalSlug').dataset.touched='1';});
async function loadSurvival(){const {data,error}=await supabase.from('survival_projects').select('*').order('display_order');if(error){$('survivalAdminList').innerHTML=`<p class="error-state">${escapeHtml(error.message)}</p>`;return;}state.survival=data||[];$('survivalAdminList').innerHTML=state.survival.map(item=>`<article class="admin-card">${imageCard(item.poster_image,item.name)}<div class="admin-card-body"><div class="admin-card-heading"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.generation_label||item.status)}</p></div>${item.is_featured?'<span class="status-badge">Featured</span>':''}</div><small>${escapeHtml(item.year_label||'')}</small><div class="admin-card-actions"><a class="secondary-btn" href="${escapeHtml(item.detail_url||`survival-detail.html?slug=${encodeURIComponent(item.slug)}`)}" target="_blank" rel="noopener">View</a><button class="secondary-btn" data-edit-survival="${item.id}">Edit</button><button class="danger-btn" data-delete-survival="${item.id}">Delete</button></div></div></article>`).join('')||'<p class="admin-empty">No survival projects.</p>';}
$('addSurvivalBtn')?.addEventListener('click',()=>editSurvival());$('cancelSurvivalBtn')?.addEventListener('click',()=>{resetSurvival();closeSection('survivalFormSection');});
$('survivalForm')?.addEventListener('submit',async(event)=>{event.preventDefault();const button=event.submitter;setBusy(button,true);const old=state.editing.survival;let image={publicUrl:old?.poster_image||null,path:old?.poster_image_path||null};try{const file=$('survivalImageFile').files[0];if(file)image=await uploadImage(file,'survival');const payload={name:val('survivalName'),slug:slugify(val('survivalSlug')),generation_label:val('survivalGeneration')||null,year_label:val('survivalYear')||null,description:val('survivalDescription')||null,status:val('survivalStatus'),poster_image:image.publicUrl,poster_image_path:image.path,detail_url:val('survivalDetailUrl')||null,display_order:Number(val('survivalOrder')||0),is_featured:check('survivalFeatured'),is_visible:check('survivalVisible')};const {error}=old?await supabase.from('survival_projects').update(payload).eq('id',old.id):await supabase.from('survival_projects').insert(payload);if(error)throw error;if(file&&old?.poster_image_path)await removeImages([old.poster_image_path]);resetSurvival();closeSection('survivalFormSection');await loadSurvival();}catch(error){message('survivalMessage',error.message,'error');}finally{setBusy(button,false);}});
$('survivalAdminList')?.addEventListener('click',async(event)=>{const edit=event.target.closest('[data-edit-survival]');if(edit)return editSurvival(state.survival.find(x=>String(x.id)===edit.dataset.editSurvival));const del=event.target.closest('[data-delete-survival]');if(del&&confirm('Delete this survival project?')){const item=state.survival.find(x=>String(x.id)===del.dataset.deleteSurvival);const {error}=await supabase.from('survival_projects').delete().eq('id',del.dataset.deleteSurvival);if(!error){await removeImages([item?.poster_image_path]);await loadSurvival();}}});

// ---------- AUDITION PROGRAMS ----------
function resetProgram(){state.editing.program=null;$('auditionProgramForm').reset();$('auditionProgramCategories').value='Vocal, Rap, Dance, Performance, Songwriting, Production, Design, Other';delete $('auditionProgramSlug').dataset.touched;message('auditionProgramMessage');}
function editProgram(item=null){resetProgram();if(item){state.editing.program=item;$('auditionProgramTitle').value=item.title;$('auditionProgramSlug').value=item.slug;$('auditionProgramOpens').value=toInputTime(item.opens_at);$('auditionProgramCloses').value=toInputTime(item.closes_at);$('auditionMinAge').value=item.min_age??'';$('auditionMaxAge').value=item.max_age??'';$('auditionProgramStatus').value=item.status;$('auditionProgramCategories').value=(item.categories||[]).join(', ');$('auditionProgramSummary').value=item.summary||'';$('auditionProgramRequirements').value=item.requirements||'';$('auditionProgramPublished').checked=item.is_published;}openSection('auditionProgramFormSection');}
$('auditionProgramTitle')?.addEventListener('input',()=>{if(!state.editing.program&&!$('auditionProgramSlug').dataset.touched)$('auditionProgramSlug').value=slugify(val('auditionProgramTitle'));});$('auditionProgramSlug')?.addEventListener('input',()=>{$('auditionProgramSlug').dataset.touched='1';});
async function loadPrograms(){const {data,error}=await supabase.from('audition_programs').select('*').order('created_at',{ascending:false});if(error){$('auditionProgramList').innerHTML=`<p class="error-state">${escapeHtml(error.message)}</p>`;return;}state.programs=data||[];$('auditionProgramList').innerHTML=state.programs.map(item=>`<article class="admin-list-row"><div class="admin-list-main"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary||'')}</p><div class="admin-list-meta"><span class="status-badge ${item.status==='Open'?'published':'draft'}">${escapeHtml(item.status)}</span><span class="status-badge">${item.is_published?'Published':'Hidden'}</span>${item.closes_at?`<span class="status-badge">Closes ${escapeHtml(formatDate(item.closes_at.slice(0,10)))}</span>`:''}</div></div><div class="admin-list-actions"><button class="secondary-btn" data-edit-program="${item.id}">Edit</button><button class="danger-btn" data-delete-program="${item.id}">Delete</button></div></article>`).join('')||'<p class="admin-empty">No audition programs yet.</p>';}
$('addAuditionProgramBtn')?.addEventListener('click',()=>editProgram());$('cancelAuditionProgramBtn')?.addEventListener('click',()=>{resetProgram();closeSection('auditionProgramFormSection');});
$('auditionProgramForm')?.addEventListener('submit',async(event)=>{event.preventDefault();const button=event.submitter;setBusy(button,true);const payload={title:val('auditionProgramTitle'),slug:slugify(val('auditionProgramSlug')),summary:val('auditionProgramSummary')||null,requirements:val('auditionProgramRequirements')||null,categories:val('auditionProgramCategories').split(',').map(x=>x.trim()).filter(Boolean),opens_at:toDbTime(val('auditionProgramOpens')),closes_at:toDbTime(val('auditionProgramCloses')),min_age:nullableNumber('auditionMinAge'),max_age:nullableNumber('auditionMaxAge'),status:val('auditionProgramStatus'),is_published:check('auditionProgramPublished')};const {error}=state.editing.program?await supabase.from('audition_programs').update(payload).eq('id',state.editing.program.id):await supabase.from('audition_programs').insert(payload);message('auditionProgramMessage',error?error.message:'Audition program saved.',error?'error':'success');setBusy(button,false);if(!error){resetProgram();closeSection('auditionProgramFormSection');await loadPrograms();}});
$('auditionProgramList')?.addEventListener('click',async(event)=>{const edit=event.target.closest('[data-edit-program]');if(edit)return editProgram(state.programs.find(x=>String(x.id)===edit.dataset.editProgram));const del=event.target.closest('[data-delete-program]');if(del&&confirm('Delete this audition program? Existing applications will remain.')){await supabase.from('audition_programs').delete().eq('id',del.dataset.deleteProgram);await loadPrograms();}});

// ---------- APPLICATIONS ----------
function programName(id){return state.programs.find(x=>String(x.id)===String(id))?.title||'General Audition';}
function renderApplications(){const q=val('applicationSearch').toLowerCase();const status=val('applicationStatusFilter');const items=state.applications.filter(item=>(!status||item.status===status)&&(!q||[item.full_name,item.registration_code,item.category,item.whatsapp_e164,item.email].join(' ').toLowerCase().includes(q)));$('applicationList').innerHTML=items.map(item=>`<article class="admin-list-row"><div class="admin-list-main"><h3>${escapeHtml(item.full_name)} ${item.stage_name?`(${escapeHtml(item.stage_name)})`:''}</h3><p>${escapeHtml(item.registration_code)} · ${escapeHtml(programName(item.program_id))}</p><div class="admin-list-meta"><span class="status-badge ${item.status==='New'?'badge-new':''}">${escapeHtml(item.status)}</span><span class="status-badge">${escapeHtml(item.category)}</span><span class="status-badge">${escapeHtml(item.country)}</span></div><div class="detail-editor"><p><strong>Email:</strong> ${escapeHtml(item.email)} · <strong>WhatsApp:</strong> ${escapeHtml(item.whatsapp_e164)}</p><p><strong>Portfolio:</strong> <a href="${escapeHtml(item.portfolio_url)}" target="_blank" rel="noopener">Open submission ↗</a></p>${item.introduction?`<p>${escapeHtml(item.introduction)}</p>`:''}<div class="form-grid two-columns"><label>Status<select class="inline-control" data-application-status="${item.id}">${['New','Reviewing','Need Information','Next Stage','Accepted','Rejected','Withdrawn','Closed'].map(s=>`<option${s===item.status?' selected':''}>${s}</option>`).join('')}</select></label><label>Admin Notes<textarea data-application-notes="${item.id}">${escapeHtml(item.admin_notes||'')}</textarea></label></div></div></div><div class="admin-list-actions"><a class="secondary-btn" href="https://wa.me/${item.whatsapp_e164.replace(/\D/g,'')}" target="_blank" rel="noopener">WhatsApp</a><button class="primary-btn" data-save-application="${item.id}">Save</button><button class="danger-btn" data-delete-application="${item.id}">Delete</button></div></article>`).join('')||'<p class="admin-empty">No applications match this filter.</p>';}
async function loadApplications(){const {data,error}=await supabase.from('audition_applications').select('*').order('created_at',{ascending:false});if(error){$('applicationList').innerHTML=`<p class="error-state">${escapeHtml(error.message)}</p>`;return;}state.applications=data||[];renderApplications();}
$('applicationSearch')?.addEventListener('input',renderApplications);$('applicationStatusFilter')?.addEventListener('change',renderApplications);
$('applicationList')?.addEventListener('click',async(event)=>{const save=event.target.closest('[data-save-application]');if(save){setBusy(save,true);const id=save.dataset.saveApplication;const payload={status:document.querySelector(`[data-application-status="${id}"]`).value,admin_notes:document.querySelector(`[data-application-notes="${id}"]`).value};const {error}=await supabase.from('audition_applications').update(payload).eq('id',id);setBusy(save,false);if(error)alert(error.message);else await loadApplications();return;}const del=event.target.closest('[data-delete-application]');if(del&&confirm('Permanently delete this audition application?')){const {error}=await supabase.from('audition_applications').delete().eq('id',del.dataset.deleteApplication);if(error)alert(error.message);else await loadApplications();}});
$('exportApplicationsBtn')?.addEventListener('click',()=>csvDownload('van-audition-applications.csv',state.applications.map(x=>({registration_code:x.registration_code,program:programName(x.program_id),full_name:x.full_name,stage_name:x.stage_name,birth_date:x.birth_date,country:x.country,whatsapp:x.whatsapp_e164,email:x.email,category:x.category,portfolio_url:x.portfolio_url,status:x.status,admin_notes:x.admin_notes,created_at:x.created_at}))));

// ---------- VAN VOICE ----------
function renderVoice(){const q=val('voiceAdminSearch').toLowerCase();const status=val('voiceAdminStatus');const items=state.voice.filter(item=>(!status||item.status===status)&&(!q||[item.ticket_code,item.title,item.target_type,item.target_name,item.sender_name,item.sender_email].join(' ').toLowerCase().includes(q)));$('voiceAdminList').innerHTML=items.map(item=>`<article class="admin-list-row"><div class="admin-list-main"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.ticket_code)} · ${escapeHtml(item.sender_name||'Anonymous / unnamed')}</p><div class="admin-list-meta"><span class="status-badge ${item.priority==='Urgent'||item.priority==='High'?'badge-high':''}">${escapeHtml(item.priority)}</span><span class="status-badge">${escapeHtml(item.status)}</span><span class="status-badge">${escapeHtml(item.visibility)}</span><span class="status-badge">${escapeHtml(item.moderation_status)}</span></div><div class="detail-editor"><p><strong>To:</strong> ${escapeHtml(item.target_name||item.target_type)} · <strong>Category:</strong> ${escapeHtml(item.category)}</p><p>${escapeHtml(item.message)}</p><div class="form-grid two-columns"><label>Status<select class="inline-control" data-voice-status="${item.id}">${['New','Reviewing','Need Information','In Progress','Answered','Resolved','Rejected','Closed'].map(s=>`<option${s===item.status?' selected':''}>${s}</option>`).join('')}</select></label><label>Moderation<select class="inline-control" data-voice-moderation="${item.id}">${['Pending','Approved','Hidden','Rejected'].map(s=>`<option${s===item.moderation_status?' selected':''}>${s}</option>`).join('')}</select></label><label>Assigned To<input class="inline-control" data-voice-assigned="${item.id}" value="${escapeHtml(item.assigned_to||'')}"></label><label>Official Response<textarea data-voice-response="${item.id}">${escapeHtml(item.official_response||'')}</textarea></label></div><label>Internal Notes<textarea data-voice-notes="${item.id}">${escapeHtml(item.internal_notes||'')}</textarea></label></div></div><div class="admin-list-actions"><button class="primary-btn" data-save-voice="${item.id}">Save</button><button class="danger-btn" data-delete-voice="${item.id}">Delete</button></div></article>`).join('')||'<p class="admin-empty">No VAN Voice tickets match this filter.</p>';}
async function loadVoice(){const {data,error}=await supabase.from('feedback_tickets').select('*').order('created_at',{ascending:false});if(error){$('voiceAdminList').innerHTML=`<p class="error-state">${escapeHtml(error.message)}</p>`;return;}state.voice=data||[];renderVoice();}
$('voiceAdminSearch')?.addEventListener('input',renderVoice);$('voiceAdminStatus')?.addEventListener('change',renderVoice);
$('voiceAdminList')?.addEventListener('click',async(event)=>{const save=event.target.closest('[data-save-voice]');if(save){setBusy(save,true);const id=save.dataset.saveVoice;const payload={status:document.querySelector(`[data-voice-status="${id}"]`).value,moderation_status:document.querySelector(`[data-voice-moderation="${id}"]`).value,assigned_to:document.querySelector(`[data-voice-assigned="${id}"]`).value||null,official_response:document.querySelector(`[data-voice-response="${id}"]`).value||null,internal_notes:document.querySelector(`[data-voice-notes="${id}"]`).value||null};const {error}=await supabase.from('feedback_tickets').update(payload).eq('id',id);setBusy(save,false);if(error)alert(error.message);else await loadVoice();return;}const del=event.target.closest('[data-delete-voice]');if(del&&confirm('Permanently delete this VAN Voice ticket?')){const {error}=await supabase.from('feedback_tickets').delete().eq('id',del.dataset.deleteVoice);if(error)alert(error.message);else await loadVoice();}});
$('exportVoiceBtn')?.addEventListener('click',()=>csvDownload('van-voice-tickets.csv',state.voice.map(x=>({ticket_code:x.ticket_code,sender_name:x.sender_name,sender_email:x.sender_email,sender_whatsapp:x.sender_whatsapp,target:x.target_name||x.target_type,category:x.category,visibility:x.visibility,title:x.title,message:x.message,priority:x.priority,status:x.status,moderation:x.moderation_status,official_response:x.official_response,created_at:x.created_at}))));

// ---------- ADMIN ROLES ----------
function resetAdmin(){state.editing.admin=null;$('adminRoleForm').reset();$('adminRoleActive').checked=true;$('adminRoleUserId').disabled=false;message('adminRoleMessage');}
function editAdmin(item=null){resetAdmin();if(item){state.editing.admin=item;$('adminRoleUserId').value=item.user_id;$('adminRoleUserId').disabled=true;$('adminRoleDisplayName').value=item.display_name||'';$('adminRoleRole').value=item.role;$('adminRoleActive').checked=item.is_active;}openSection('adminRoleFormSection');}
async function loadAdmins(){if(!roleManagerRoles.includes(state.profile?.role)){const tab=$('rolesTabButton');if(tab)tab.hidden=true;$('panel-roles').innerHTML='<p class="admin-empty">Only Founder and Co-Founder may manage admin accounts.</p>';return;}const {data,error}=await supabase.from('admin_users').select('*').order('role');if(error){$('adminRoleList').innerHTML=`<p class="error-state">${escapeHtml(error.message)}</p>`;return;}state.admins=data||[];$('adminRoleList').innerHTML=state.admins.map(item=>`<article class="admin-list-row"><div class="admin-list-main"><h3>${escapeHtml(item.display_name||'Unnamed Admin')}</h3><p>${escapeHtml(item.user_id)}</p><div class="admin-list-meta"><span class="status-badge">${escapeHtml(item.role)}</span><span class="status-badge ${item.is_active?'published':'draft'}">${item.is_active?'Active':'Disabled'}</span></div></div><div class="admin-list-actions"><button class="secondary-btn" data-edit-admin="${item.user_id}">Edit</button>${item.user_id!==state.profile.user_id?`<button class="danger-btn" data-delete-admin="${item.user_id}">Remove</button>`:''}</div></article>`).join('');}
$('addAdminRoleBtn')?.addEventListener('click',()=>editAdmin());$('cancelAdminRoleBtn')?.addEventListener('click',()=>{resetAdmin();closeSection('adminRoleFormSection');});
$('adminRoleForm')?.addEventListener('submit',async(event)=>{event.preventDefault();const button=event.submitter;setBusy(button,true);const payload={user_id:val('adminRoleUserId'),display_name:val('adminRoleDisplayName')||null,role:val('adminRoleRole'),is_active:check('adminRoleActive')};const {error}=state.editing.admin?await supabase.from('admin_users').update({display_name:payload.display_name,role:payload.role,is_active:payload.is_active}).eq('user_id',state.editing.admin.user_id):await supabase.from('admin_users').insert(payload);message('adminRoleMessage',error?error.message:'Admin role saved.',error?'error':'success');setBusy(button,false);if(!error){resetAdmin();closeSection('adminRoleFormSection');await loadAdmins();}});
$('adminRoleList')?.addEventListener('click',async(event)=>{const edit=event.target.closest('[data-edit-admin]');if(edit)return editAdmin(state.admins.find(x=>x.user_id===edit.dataset.editAdmin));const del=event.target.closest('[data-delete-admin]');if(del&&confirm('Remove this account from VAN CMS?')){const {error}=await supabase.from('admin_users').delete().eq('user_id',del.dataset.deleteAdmin);if(error)alert(error.message);else await loadAdmins();}});

// ---------- INITIALISE ----------
state.profile = await getProfile();
if (state.profile) {
    applyRoleUi(state.profile.role);
    if (!roleManagerRoles.includes(state.profile.role)) $('rolesTabButton').hidden = true;
    await Promise.allSettled([loadSiteContent(),loadTheme(),loadNavigation(),loadPages(),loadLeadership(),loadSurvival(),loadPrograms()]);
    await Promise.allSettled([loadApplications(),loadVoice(),loadAdmins()]);
}
