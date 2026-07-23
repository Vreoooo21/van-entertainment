import { supabase } from './supabase.js';

const title = document.getElementById('universeTitle');
const eyebrow = document.getElementById('universeEyebrow');
const summary = document.getElementById('universeSummary');
const body = document.getElementById('universeBody');
const image = document.getElementById('universeImage');

const { data, error } = await supabase
    .from('custom_pages')
    .select('*')
    .eq('slug', 'van-universe')
    .eq('is_published', true)
    .maybeSingle();

if (error) {
    console.error(error);
    body.innerHTML = '<p class="error-state">VAN Universe could not be loaded.</p>';
} else if (!data) {
    body.innerHTML = '<p class="empty-state">VAN Universe has not been published yet. Open Dashboard → Custom Pages and publish the page with slug <strong>van-universe</strong>.</p>';
} else {
    document.title = `${data.title} | VAN ENTERTAINMENT`;
    eyebrow.textContent = data.eyebrow || 'CONNECTED STORIES';
    title.textContent = data.title || 'VAN UNIVERSE';
    summary.textContent = data.summary || '';
    body.innerHTML = data.body_html || '<p>VAN Universe content is coming soon.</p>';
    if (data.cover_image) {
        image.src = data.cover_image;
        image.alt = data.title || 'VAN Universe';
        image.hidden = false;
    }
}
