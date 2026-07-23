import { supabase } from './supabase.js';
import { escapeHtml } from './utils.js';

const CORE_NAV_ITEMS = [
    { label: 'Home', href: 'index.html', location: 'header', display_order: 0, is_visible: true, is_external: false },
    { label: 'About', href: 'about.html', location: 'header', display_order: 10, is_visible: true, is_external: false },
    { label: 'VAN Universe', href: 'universe.html', location: 'header', display_order: 20, is_visible: true, is_external: false },
    { label: 'Leadership', href: 'leadership.html', location: 'header', display_order: 30, is_visible: true, is_external: false },
    { label: 'Artists', href: 'artists.html', location: 'header', display_order: 40, is_visible: true, is_external: false },
    { label: 'Survival', href: 'survival.html', location: 'header', display_order: 50, is_visible: true, is_external: false },
    { label: 'News', href: 'news.html', location: 'header', display_order: 60, is_visible: true, is_external: false },
    { label: 'Audition', href: 'audition.html', location: 'header', display_order: 70, is_visible: true, is_external: false },
    { label: 'VAN Voice', href: 'voice.html', location: 'header', display_order: 80, is_visible: true, is_external: false },
    { label: 'Contact', href: 'contact.html', location: 'header', display_order: 90, is_visible: true, is_external: false },
    { label: 'About', href: 'about.html', location: 'footer', display_order: 10, is_visible: true, is_external: false },
    { label: 'VAN Universe', href: 'universe.html', location: 'footer', display_order: 20, is_visible: true, is_external: false },
    { label: 'Leadership', href: 'leadership.html', location: 'footer', display_order: 30, is_visible: true, is_external: false },
    { label: 'Artists', href: 'artists.html', location: 'footer', display_order: 40, is_visible: true, is_external: false },
    { label: 'Survival', href: 'survival.html', location: 'footer', display_order: 50, is_visible: true, is_external: false },
    { label: 'News', href: 'news.html', location: 'footer', display_order: 60, is_visible: true, is_external: false },
    { label: 'Audition', href: 'audition.html', location: 'footer', display_order: 70, is_visible: true, is_external: false },
    { label: 'VAN Voice', href: 'voice.html', location: 'footer', display_order: 80, is_visible: true, is_external: false }
];

function mergeCoreNavigation(items = []) {
    const merged = [...items];
    CORE_NAV_ITEMS.forEach((fallback) => {
        const exists = merged.some((item) => item.location === fallback.location && item.href === fallback.href);
        if (!exists) merged.push(fallback);
    });
    return merged.sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
}

function applyContent(items = []) {
    const map = new Map(items.map((item) => [item.content_key, item.content_value ?? '']));
    document.querySelectorAll('[data-content-key]').forEach((element) => {
        const value = map.get(element.dataset.contentKey);
        if (value === undefined) return;
        const mode = element.dataset.contentMode || 'text';
        if (mode === 'html') element.innerHTML = value;
        else if (mode === 'href') element.setAttribute('href', value);
        else if (mode === 'src') element.setAttribute('src', value);
        else element.textContent = value;
    });
}

function applyTheme(settings) {
    if (!settings) return;
    const root = document.documentElement;
    root.style.setProperty('--bg', settings.background_color || '#0d0d0f');
    root.style.setProperty('--surface', settings.surface_color || '#18181b');
    root.style.setProperty('--text', settings.text_color || '#f4f4f5');
    root.style.setProperty('--muted', settings.muted_color || '#9c9ca3');
    root.style.setProperty('--silver', settings.accent_color || '#c7c7cc');
    root.style.setProperty('--van-primary', settings.primary_color || '#f0f0f2');
    document.body.style.fontFamily = `"${settings.body_font || 'Poppins'}", sans-serif`;
    document.querySelectorAll('h1,h2').forEach((heading) => {
        heading.style.fontFamily = `"${settings.heading_font || 'Cinzel'}", serif`;
    });

    if (settings.maintenance_mode && !location.pathname.endsWith('admin-login.html') && !location.pathname.endsWith('dashboard.html')) {
        const banner = document.createElement('div');
        banner.className = 'maintenance-banner';
        banner.innerHTML = `<strong>Maintenance Mode</strong><span>${escapeHtml(settings.maintenance_message || 'Website update in progress.')}</span>`;
        document.body.prepend(banner);
    }
}

function isActiveHref(href) {
    const current = location.pathname.split('/').pop() || 'index.html';
    if (href.startsWith('http')) return false;
    const target = href.split('?')[0].split('#')[0] || 'index.html';
    return current === target;
}

function applyNavigation(items = []) {
    const mergedItems = mergeCoreNavigation(items);
    const headerItems = mergedItems.filter((item) => item.location === 'header' && item.is_visible);
    const footerItems = mergedItems.filter((item) => item.location === 'footer' && item.is_visible);

    document.querySelectorAll('.nav-links').forEach((list) => {
        if (!headerItems.length) return;
        list.innerHTML = headerItems.map((item) => {
            const external = item.is_external ? ' target="_blank" rel="noopener noreferrer"' : '';
            return `<li><a href="${escapeHtml(item.href)}"${external}${isActiveHref(item.href) ? ' class="active"' : ''}>${escapeHtml(item.label)}</a></li>`;
        }).join('');
    });

    document.querySelectorAll('.footer-links').forEach((box) => {
        if (!footerItems.length) return;
        const heading = box.querySelector('h3')?.outerHTML || '<h3>Navigation</h3>';
        box.innerHTML = heading + footerItems.map((item) => {
            const external = item.is_external ? ' target="_blank" rel="noopener noreferrer"' : '';
            return `<a href="${escapeHtml(item.href)}"${external}>${escapeHtml(item.label)}</a>`;
        }).join('');
    });
}

async function initialisePublicCms() {
    const [contentResult, settingsResult, navigationResult] = await Promise.all([
        supabase.from('site_content').select('content_key,content_value').eq('is_public', true),
        supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('navigation_items').select('*').order('display_order', { ascending: true })
    ]);

    if (!contentResult.error) applyContent(contentResult.data || []);
    if (!settingsResult.error) applyTheme(settingsResult.data);
    if (!navigationResult.error) applyNavigation(navigationResult.data || []);
}

await initialisePublicCms();
