import { supabase } from './supabase.js';
import { escapeHtml, fallbackImage, formatDate, safeExternalUrl } from './utils.js';
const list = document.getElementById('leadershipList');
const { data, error } = await supabase.from('leadership_profiles').select('*').eq('is_visible', true).order('display_order', { ascending: true });
if (error) {
    console.error(error); list.innerHTML = '<p class="error-state">Leadership profiles could not be loaded.</p>';
} else if (!data?.length) {
    const requiredRoles = ['Founder', 'Co-Founder', 'CEO 1', 'CEO 2', 'Co-CEO 1', 'Co-CEO 2'];
    list.innerHTML = requiredRoles.map((role) => `<article class="leadership-card leadership-placeholder"><div class="leadership-placeholder-image">VAN</div><div class="leadership-card-body"><span class="role-pill">${escapeHtml(role)}</span><h3>Profile Coming Soon</h3><p>This executive profile has not been published yet.</p></div></article>`).join('');
} else {
    list.innerHTML = data.map((profile) => {
        const social = safeExternalUrl(profile.instagram_url);
        return `<article class="leadership-card"><img src="${escapeHtml(profile.profile_image || fallbackImage())}" alt="${escapeHtml(profile.name)}" onerror="this.src='${fallbackImage()}'"><div class="leadership-card-body"><span class="role-pill">${escapeHtml(profile.role)}</span><h3>${escapeHtml(profile.name)}</h3><p>${escapeHtml(profile.division || '')}</p>${profile.bio ? `<p>${escapeHtml(profile.bio)}</p>` : ''}${profile.quote ? `<p class="leadership-quote">“${escapeHtml(profile.quote)}”</p>` : ''}<div class="program-meta">${profile.started_at ? `<span>Since ${escapeHtml(formatDate(profile.started_at))}</span>` : ''}<span>${escapeHtml(profile.status)}</span></div>${social ? `<a class="text-link" href="${escapeHtml(social)}" target="_blank" rel="noopener noreferrer">Official Profile →</a>` : ''}</div></article>`;
    }).join('');
}
